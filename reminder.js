#!/usr/bin/env node
'use strict'

const webpush = require('web-push')
const nodemailer = require('nodemailer')
const { DatabaseSync } = require('node:sqlite')
const fs = require('fs')
const path = require('path')
const { t, formatDuration, resolveLang } = require('./server-i18n')

const KEYS_FILE = process.env.GROVE_VAPID_FILE || path.join(__dirname, 'vapid-keys.json')
const DB_FILE   = process.env.GROVE_DB_FILE    || path.join(__dirname, 'pb/pb_data/data.db')
const PB_PUBLIC = process.env.GROVE_PB_PUBLIC  || path.join(__dirname, 'pb/pb_public')
const CHECK_INTERVAL = 60 * 1000
const WINDOW_MS = 70 * 1000

// --setup: generate VAPID keys if needed, write public key to pb_public, print public key
if (process.argv.includes('--setup')) {
    if (!fs.existsSync(KEYS_FILE)) {
        const keys = webpush.generateVAPIDKeys()
        fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2))
    }
    const keys = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'))
    fs.mkdirSync(PB_PUBLIC, { recursive: true })
    fs.writeFileSync(path.join(PB_PUBLIC, 'vapid-public.txt'), keys.publicKey)
    process.exit(0)
}

if (!fs.existsSync(KEYS_FILE)) {
    console.error('VAPID keys not found — run: node reminder.js --setup')
    process.exit(1)
}

const { publicKey, privateKey } = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'))
webpush.setVapidDetails('mailto:grove@localhost', publicKey, privateKey)

// ---------------------------------------------------------------------------
// Dedup table — prevents sending the same notification twice across restarts
// ---------------------------------------------------------------------------

function ensureSentTable() {
    try {
        const rw = new DatabaseSync(DB_FILE)
        rw.prepare(`
            CREATE TABLE IF NOT EXISTS grove_notification_sent (
                hash TEXT PRIMARY KEY,
                sent_at INTEGER NOT NULL
            )
        `).run()
        // Purge entries older than 30 days
        rw.prepare(`DELETE FROM grove_notification_sent WHERE sent_at < ?`).run(
            Date.now() - 30 * 24 * 60 * 60 * 1000
        )
        rw.close()
    } catch {}
}

function isSent(db, hash) {
    try {
        return !!db.prepare(`SELECT 1 FROM grove_notification_sent WHERE hash = ?`).get(hash)
    } catch { return false }
}

function markSent(hash) {
    try {
        const rw = new DatabaseSync(DB_FILE)
        rw.prepare(`INSERT OR IGNORE INTO grove_notification_sent (hash, sent_at) VALUES (?, ?)`).run(hash, Date.now())
        rw.close()
    } catch {}
}

// ---------------------------------------------------------------------------
// User notification preferences
// ---------------------------------------------------------------------------

function getUserPrefs(db, userId) {
    try {
        const row = db.prepare(`SELECT notification_prefs FROM users WHERE id = ?`).get(userId)
        if (!row?.notification_prefs) return {}
        return JSON.parse(row.notification_prefs)
    } catch { return {} }
}

// Push defaults to enabled unless explicitly set to false
function isPushPrefOn(prefs, key) {
    return prefs[key] !== false
}

// Email defaults to disabled unless explicitly set to true
function isEmailPrefOn(prefs, key) {
    return prefs[key] === true
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Language for messages sent to a user. Empty/unknown (or a database that has not
// been migrated yet) falls back to English.
function getUserLang(db, userId) {
    try {
        const row = db.prepare(`SELECT language FROM users WHERE id = ?`).get(userId)
        return resolveLang(row?.language)
    } catch {
        return 'en'
    }
}

// ---------------------------------------------------------------------------
// SMTP / email helpers
// ---------------------------------------------------------------------------

function getSmtpTransporter(db) {
    try {
        const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='smtp_settings'`).all()
        if (tables.length === 0) return null
        const smtp = db.prepare(`SELECT * FROM smtp_settings WHERE enabled = 1 LIMIT 1`).get()
        if (!smtp || !smtp.host) return null
        return nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port || 587,
            secure: !!smtp.secure,
            auth: { user: smtp.username, pass: smtp.password },
        })
    } catch {
        return null
    }
}

function getFromAddress(db) {
    try {
        const smtp = db.prepare(`SELECT from_name, from_address, username FROM smtp_settings WHERE enabled = 1 LIMIT 1`).get()
        if (smtp) return `"${smtp.from_name || 'Grove'}" <${smtp.from_address || smtp.username}>`
    } catch {}
    return '"Grove" <grove@localhost>'
}

async function sendEmailReminder(mailer, db, userId, ev) {
    try {
        const row = db.prepare(`SELECT email FROM users WHERE id = ?`).get(userId)
        if (!row?.email) return
        const from = getFromAddress(db)
        const lang = getUserLang(db, userId)
        const vars = { title: ev.title, time: formatDuration(lang, ev.reminder_minutes) }
        await mailer.sendMail({
            from,
            to: row.email,
            subject: t(lang, 'reminder.title', vars),
            text: t(lang, 'reminder.emailText', vars),
            html: t(lang, 'reminder.emailHtml', vars, { html: true }),
        })
        console.log(`[${new Date().toISOString()}] Email sent for "${ev.title}" to user ${userId}`)
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Email failed for user ${userId}:`, err.message)
    }
}

async function sendNotificationEmail(mailer, db, userId, subject, text, html) {
    try {
        const row = db.prepare(`SELECT email FROM users WHERE id = ?`).get(userId)
        if (!row?.email) return
        const from = getFromAddress(db)
        await mailer.sendMail({ from, to: row.email, subject, text, html })
        console.log(`[${new Date().toISOString()}] Email "${subject}" sent to user ${userId}`)
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Email failed for user ${userId}:`, err.message)
    }
}

// ---------------------------------------------------------------------------
// Push helper
// ---------------------------------------------------------------------------

async function sendPushToUser(db, userId, payload) {
    try {
        const subs = db.prepare(
            `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user = ?`
        ).all(userId)
        for (const sub of subs) {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    payload
                )
                console.log(`[${new Date().toISOString()}] Push sent to user ${userId}`)
            } catch (err) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    try {
                        const rw = new DatabaseSync(DB_FILE)
                        rw.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).run(sub.endpoint)
                        rw.close()
                    } catch {}
                }
            }
        }
    } catch {}
}

// ---------------------------------------------------------------------------
// Generic: notify a set of user IDs for a given event type
// ---------------------------------------------------------------------------

async function notifyUsers({
    db, userIds, dedupPrefix, pushKey, emailKey,
    build, mailer, hasPushTable,
}) {
    for (const userId of userIds) {
        const hash = `${dedupPrefix}:${userId}`
        if (isSent(db, hash)) continue

        const prefs = getUserPrefs(db, userId)
        const wantPush  = isPushPrefOn(prefs, pushKey) && hasPushTable
        const wantEmail = isEmailPrefOn(prefs, emailKey) && !!mailer

        if (wantPush || wantEmail) {
            // build(lang) returns { push: { title, body, url }, email: { subject, text, html } }
            const msg = build(getUserLang(db, userId))
            if (wantPush)  await sendPushToUser(db, userId, JSON.stringify(msg.push))
            if (wantEmail) await sendNotificationEmail(mailer, db, userId, msg.email.subject, msg.email.text, msg.email.html)
        }

        markSent(hash)
    }
}

// ---------------------------------------------------------------------------
// Event-driven notification checks (new records created in the last window)
// ---------------------------------------------------------------------------

async function checkAssignedEvents(db, mailer, hasPushTable) {
    const windowSecs = Math.ceil(WINDOW_MS / 1000)
    let rows
    try {
        rows = db.prepare(`
            SELECT id, title, description, "user", shared_with
            FROM events
            WHERE datetime(created) > datetime('now', '-' || ? || ' seconds')
              AND json_valid(shared_with)
              AND json_array_length(shared_with) > 0
        `).all(windowSecs)
    } catch { return }

    for (const ev of rows) {
        let sharedWith
        try { sharedWith = JSON.parse(ev.shared_with) } catch { continue }
        const targets = sharedWith.filter((id) => id && id !== ev.user)
        await notifyUsers({
            db, userIds: targets,
            dedupPrefix: `event_assigned:${ev.id}`,
            pushKey: 'push_event_assigned',
            emailKey: 'email_event_assigned',
            build: (lang) => {
                const vars = { title: ev.title }
                const title = t(lang, 'eventAssigned.title', vars)
                return {
                    push: { title, body: ev.description || t(lang, 'eventAssigned.body'), url: '/calendar' },
                    email: {
                        subject: title,
                        text: t(lang, 'eventAssigned.emailText', vars),
                        html: t(lang, 'eventAssigned.emailHtml', vars, { html: true }),
                    },
                }
            },
            mailer, hasPushTable,
        })
    }
}

async function checkAssignedLists(db, mailer, hasPushTable) {
    const windowSecs = Math.ceil(WINDOW_MS / 1000)
    let rows
    try {
        rows = db.prepare(`
            SELECT id, name, "user", assigned_to
            FROM lists
            WHERE datetime(created) > datetime('now', '-' || ? || ' seconds')
              AND assigned_to IS NOT NULL AND assigned_to != ''
              AND assigned_to != "user"
        `).all(windowSecs)
    } catch { return }

    for (const list of rows) {
        await notifyUsers({
            db, userIds: [list.assigned_to],
            dedupPrefix: `list_assigned:${list.id}`,
            pushKey: 'push_list_assigned',
            emailKey: 'email_list_assigned',
            build: (lang) => {
                const vars = { name: list.name }
                return {
                    push: { title: t(lang, 'listAssigned.title'), body: list.name, url: '/lists' },
                    email: {
                        subject: t(lang, 'listAssigned.emailSubject', vars),
                        text: t(lang, 'listAssigned.emailText', vars),
                        html: t(lang, 'listAssigned.emailHtml', vars, { html: true }),
                    },
                }
            },
            mailer, hasPushTable,
        })
    }
}

async function checkNewListItems(db, mailer, hasPushTable) {
    const windowSecs = Math.ceil(WINDOW_MS / 1000)
    let rows
    try {
        rows = db.prepare(`
            SELECT li.id, li.text, li.added_by, li.list,
                   l.name AS list_name, l.assigned_to, l.household
            FROM list_items li
            JOIN lists l ON l.id = li.list
            WHERE datetime(li.created) > datetime('now', '-' || ? || ' seconds')
              AND (
                (l.assigned_to IS NOT NULL AND l.assigned_to != '' AND l.assigned_to != li.added_by)
              )
        `).all(windowSecs)
    } catch { return }

    for (const item of rows) {
        await notifyUsers({
            db, userIds: [item.assigned_to],
            dedupPrefix: `list_item_added:${item.id}`,
            pushKey: 'push_list_item_added',
            emailKey: 'email_list_item_added',
            build: (lang) => {
                const vars = { list: item.list_name, text: item.text }
                const title = t(lang, 'listItemAdded.title', vars)
                return {
                    push: { title, body: item.text, url: '/lists' },
                    email: {
                        subject: title,
                        text: t(lang, 'listItemAdded.emailText', vars),
                        html: t(lang, 'listItemAdded.emailHtml', vars, { html: true }),
                    },
                }
            },
            mailer, hasPushTable,
        })
    }
}

async function checkSharedRecipes(db, mailer, hasPushTable) {
    const windowSecs = Math.ceil(WINDOW_MS / 1000)
    let rows
    try {
        rows = db.prepare(`
            SELECT id, title, "user", household
            FROM recipes
            WHERE datetime(created) > datetime('now', '-' || ? || ' seconds')
              AND household IS NOT NULL AND household != ''
        `).all(windowSecs)
    } catch { return }

    for (const recipe of rows) {
        let members
        try {
            members = db.prepare(`SELECT id FROM users WHERE household = ?`).all(recipe.household)
        } catch { continue }
        const targets = members.map((m) => m.id).filter((id) => id !== recipe.user)
        await notifyUsers({
            db, userIds: targets,
            dedupPrefix: `recipe_shared:${recipe.id}`,
            pushKey: 'push_recipe_shared',
            emailKey: 'email_recipe_shared',
            build: (lang) => {
                const vars = { title: recipe.title }
                const title = t(lang, 'recipeShared.title', vars)
                return {
                    push: { title, body: t(lang, 'recipeShared.body'), url: '/recipes' },
                    email: {
                        subject: title,
                        text: t(lang, 'recipeShared.emailText', vars),
                        html: t(lang, 'recipeShared.emailHtml', vars, { html: true }),
                    },
                }
            },
            mailer, hasPushTable,
        })
    }
}

async function checkSchoolLunches(db, mailer, hasPushTable) {
    const windowSecs = Math.ceil(WINDOW_MS / 1000)
    let rows
    try {
        rows = db.prepare(`
            SELECT sl.id, sl.meal, sl.date, sl."user", sl.household,
                   sc.name AS child_name
            FROM school_lunches sl
            JOIN school_children sc ON sc.id = sl.child
            WHERE datetime(sl.created) > datetime('now', '-' || ? || ' seconds')
        `).all(windowSecs)
    } catch { return }

    for (const lunch of rows) {
        let targets
        if (lunch.household) {
            try {
                const members = db.prepare(`SELECT id FROM users WHERE household = ?`).all(lunch.household)
                targets = members.map((m) => m.id).filter((id) => id !== lunch.user)
            } catch { continue }
        } else {
            targets = []
        }
        await notifyUsers({
            db, userIds: targets,
            dedupPrefix: `school_lunch:${lunch.id}`,
            pushKey: 'push_school_lunch',
            emailKey: 'email_school_lunch',
            build: (lang) => {
                const vars = { child: lunch.child_name, meal: lunch.meal }
                const title = t(lang, 'schoolLunch.title', vars)
                return {
                    push: { title, body: lunch.meal, url: '/school' },
                    email: {
                        subject: title,
                        text: t(lang, 'schoolLunch.emailText', vars),
                        html: t(lang, 'schoolLunch.emailHtml', vars, { html: true }),
                    },
                }
            },
            mailer, hasPushTable,
        })
    }
}

async function checkSchoolAssignments(db, mailer, hasPushTable) {
    const windowSecs = Math.ceil(WINDOW_MS / 1000)
    let rows
    try {
        rows = db.prepare(`
            SELECT sa.id, sa.subject, sa.title, sa."user", sa.household,
                   sc.name AS child_name
            FROM school_assignments sa
            JOIN school_children sc ON sc.id = sa.child
            WHERE datetime(sa.created) > datetime('now', '-' || ? || ' seconds')
        `).all(windowSecs)
    } catch { return }

    for (const assignment of rows) {
        let targets
        if (assignment.household) {
            try {
                const members = db.prepare(`SELECT id FROM users WHERE household = ?`).all(assignment.household)
                targets = members.map((m) => m.id).filter((id) => id !== assignment.user)
            } catch { continue }
        } else {
            targets = []
        }
        await notifyUsers({
            db, userIds: targets,
            dedupPrefix: `school_assignment:${assignment.id}`,
            pushKey: 'push_school_assignment',
            emailKey: 'email_school_assignment',
            build: (lang) => {
                const vars = { child: assignment.child_name, subject: assignment.subject, title: assignment.title }
                const title = t(lang, 'schoolAssignment.title', vars)
                return {
                    push: { title, body: t(lang, 'schoolAssignment.body', vars), url: '/school' },
                    email: {
                        subject: title,
                        text: t(lang, 'schoolAssignment.emailText', vars),
                        html: t(lang, 'schoolAssignment.emailHtml', vars, { html: true }),
                    },
                }
            },
            mailer, hasPushTable,
        })
    }
}

// ---------------------------------------------------------------------------
// Time-based reminder check (existing behaviour)
// ---------------------------------------------------------------------------

async function checkReminders() {
    if (!fs.existsSync(DB_FILE)) return

    let db
    try {
        db = new DatabaseSync(DB_FILE, { readOnly: true })
    } catch {
        return
    }

    try {
        const now = Date.now()

        const events = db.prepare(`
            SELECT id, title, start, created, reminder_minutes, user, household
            FROM events
            WHERE reminder_minutes > 0
              AND datetime(start) > datetime('now', '-2 minutes')
              AND datetime(start) < datetime('now', '+25 hours')
        `).all()

        const due = events.filter((ev) => {
            const reminderAt = new Date(ev.start).getTime() - ev.reminder_minutes * 60 * 1000
            const createdAt = new Date(ev.created).getTime()
            if (reminderAt <= createdAt) return false
            return reminderAt <= now && reminderAt > now - WINDOW_MS
        })

        if (events.length > 0) {
            console.log(`[${new Date().toISOString()}] Checked ${events.length} upcoming event(s), ${due.length} due`)
        }

        if (due.length === 0) return

        const pushTables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='push_subscriptions'`).all()
        const mailer = getSmtpTransporter(db)

        for (const ev of due) {
            const userIds = new Set([ev.user])
            if (ev.household) {
                const members = db.prepare(`SELECT id FROM users WHERE household = ?`).all(ev.household)
                members.forEach((m) => userIds.add(m.id))
            }

            for (const userId of userIds) {
                if (pushTables.length > 0) {
                    const lang = getUserLang(db, userId)
                    const vars = { title: ev.title, time: formatDuration(lang, ev.reminder_minutes) }
                    await sendPushToUser(db, userId, JSON.stringify({
                        title: t(lang, 'reminder.title', vars),
                        body: t(lang, 'reminder.body', vars),
                        url: '/calendar',
                    }))
                }
                if (mailer) {
                    await sendEmailReminder(mailer, db, userId, ev)
                }
            }
        }
    } finally {
        db.close()
    }
}

// ---------------------------------------------------------------------------
// Event-driven notifications (new records)
// ---------------------------------------------------------------------------

async function checkNewNotifications() {
    if (!fs.existsSync(DB_FILE)) return

    let db
    try {
        db = new DatabaseSync(DB_FILE, { readOnly: true })
    } catch {
        return
    }

    try {
        const hasPushTable = db.prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name='push_subscriptions'`
        ).all().length > 0

        const mailer = getSmtpTransporter(db)

        await checkAssignedEvents(db, mailer, hasPushTable)
        await checkAssignedLists(db, mailer, hasPushTable)
        await checkNewListItems(db, mailer, hasPushTable)
        await checkSharedRecipes(db, mailer, hasPushTable)
        await checkSchoolLunches(db, mailer, hasPushTable)
        await checkSchoolAssignments(db, mailer, hasPushTable)
    } finally {
        db.close()
    }
}

// ---------------------------------------------------------------------------
// Welcome emails
// ---------------------------------------------------------------------------

async function sendWelcomeEmails() {
    if (!fs.existsSync(DB_FILE)) return

    let db
    try {
        db = new DatabaseSync(DB_FILE, { readOnly: true })
    } catch {
        return
    }

    try {
        const mailer = getSmtpTransporter(db)
        if (!mailer) return

        const from = getFromAddress(db)

        const newUsers = db.prepare(
            `SELECT id, email, name FROM users WHERE (welcome_sent IS NULL OR welcome_sent = 0) AND email != '' AND email IS NOT NULL`
        ).all()

        if (newUsers.length === 0) return

        const appName = (() => {
            try {
                const s = db.prepare(`SELECT app_name FROM instance_settings LIMIT 1`).get()
                return s?.app_name || 'Grove'
            } catch { return 'Grove' }
        })()

        for (const user of newUsers) {
            try {
                const lang = getUserLang(db, user.id)
                const vars = { name: user.name || t(lang, 'welcome.fallbackName'), app: appName }
                await mailer.sendMail({
                    from,
                    to: user.email,
                    subject: t(lang, 'welcome.subject', vars),
                    text: t(lang, 'welcome.text', vars),
                    html: t(lang, 'welcome.html', vars, { html: true }),
                })
                console.log(`[${new Date().toISOString()}] Welcome email sent to ${user.email}`)

                const rw = new DatabaseSync(DB_FILE)
                rw.prepare(`UPDATE users SET welcome_sent = 1 WHERE id = ?`).run(user.id)
                rw.close()
            } catch (err) {
                console.error(`[${new Date().toISOString()}] Welcome email failed for ${user.email}:`, err.message)
            }
        }
    } finally {
        db.close()
    }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

async function tick() {
    await checkReminders()
    await checkNewNotifications()
    await sendWelcomeEmails()
}

console.log('Grove reminder service started')
ensureSentTable()
tick().catch(console.error)
setInterval(() => tick().catch(console.error), CHECK_INTERVAL)
