'use strict'

// Server-side translations for reminder.js (push notifications and emails).
// The web UI has its own files in frontend/src/locales/.
//
// To add a language: add a block below with the same keys as `en`, and add
// its code to SUPPORTED. Missing keys fall back to English.

const messages = {
    en: {
        'duration.minutes_one': '{{count}} minute',
        'duration.minutes_other': '{{count}} minutes',
        'duration.hours_one': '{{count}} hour',
        'duration.hours_other': '{{count}} hours',
        'duration.days_one': '{{count}} day',
        'duration.days_other': '{{count}} days',

        'reminder.title': 'Reminder: {{title}}',
        'reminder.body': 'Starts in {{time}}',
        'reminder.emailText': 'Your event "{{title}}" starts in {{time}}.',
        'reminder.emailHtml': '<p>Your event <strong>{{title}}</strong> starts in {{time}}.</p>',

        'eventAssigned.title': 'New event: {{title}}',
        'eventAssigned.body': 'You were added to an event',
        'eventAssigned.emailText': 'You were added to the event "{{title}}".',
        'eventAssigned.emailHtml': '<p>You were added to the event <strong>{{title}}</strong>.</p>',

        'listAssigned.title': 'List assigned to you',
        'listAssigned.emailSubject': 'List assigned to you: {{name}}',
        'listAssigned.emailText': 'The list "{{name}}" has been assigned to you.',
        'listAssigned.emailHtml': '<p>The list <strong>{{name}}</strong> has been assigned to you.</p>',

        'listItemAdded.title': 'New item in {{list}}',
        'listItemAdded.emailText': '"{{text}}" was added to {{list}}.',
        'listItemAdded.emailHtml': '<p><strong>{{text}}</strong> was added to the list <em>{{list}}</em>.</p>',

        'recipeShared.title': 'New recipe: {{title}}',
        'recipeShared.body': 'Shared with your household',
        'recipeShared.emailText': 'A new recipe "{{title}}" was shared with your household.',
        'recipeShared.emailHtml': '<p>A new recipe <strong>{{title}}</strong> was shared with your household.</p>',

        'schoolLunch.title': 'Lunch added for {{child}}',
        'schoolLunch.emailText': 'A new lunch has been added for {{child}}: {{meal}}',
        'schoolLunch.emailHtml': '<p>A new lunch has been added for <strong>{{child}}</strong>: {{meal}}</p>',

        'schoolAssignment.title': 'New assignment for {{child}}',
        'schoolAssignment.body': '{{subject}}: {{title}}',
        'schoolAssignment.emailText': 'New assignment for {{child}} — {{subject}}: {{title}}',
        'schoolAssignment.emailHtml': '<p>New assignment for <strong>{{child}}</strong> — {{subject}}: <em>{{title}}</em></p>',

        'welcome.subject': 'Welcome to {{app}}',
        'welcome.fallbackName': 'there',
        'welcome.text': 'Hi {{name}},\n\nYour account on {{app}} is ready. You can now log in and start using the app.\n\n— The {{app}} team',
        'welcome.html': '<p>Hi {{name}},</p><p>Your account on <strong>{{app}}</strong> is ready. You can now log in and start using the app.</p><p>— The {{app}} team</p>',
    },

    fr: {
        'duration.minutes_one': '{{count}} minute',
        'duration.minutes_other': '{{count}} minutes',
        'duration.hours_one': '{{count}} heure',
        'duration.hours_other': '{{count}} heures',
        'duration.days_one': '{{count}} jour',
        'duration.days_other': '{{count}} jours',

        'reminder.title': 'Rappel : {{title}}',
        'reminder.body': 'Commence dans {{time}}',
        'reminder.emailText': 'Votre événement « {{title}} » commence dans {{time}}.',
        'reminder.emailHtml': '<p>Votre événement <strong>{{title}}</strong> commence dans {{time}}.</p>',

        'eventAssigned.title': 'Nouvel événement : {{title}}',
        'eventAssigned.body': 'Vous avez été ajouté à un événement',
        'eventAssigned.emailText': 'Vous avez été ajouté à l\'événement « {{title}} ».',
        'eventAssigned.emailHtml': '<p>Vous avez été ajouté à l\'événement <strong>{{title}}</strong>.</p>',

        'listAssigned.title': 'Liste qui vous est attribuée',
        'listAssigned.emailSubject': 'Liste qui vous est attribuée : {{name}}',
        'listAssigned.emailText': 'La liste « {{name}} » vous a été attribuée.',
        'listAssigned.emailHtml': '<p>La liste <strong>{{name}}</strong> vous a été attribuée.</p>',

        'listItemAdded.title': 'Nouvel élément dans {{list}}',
        'listItemAdded.emailText': '« {{text}} » a été ajouté à {{list}}.',
        'listItemAdded.emailHtml': '<p><strong>{{text}}</strong> a été ajouté à la liste <em>{{list}}</em>.</p>',

        'recipeShared.title': 'Nouvelle recette : {{title}}',
        'recipeShared.body': 'Partagée avec votre foyer',
        'recipeShared.emailText': 'Une nouvelle recette « {{title}} » a été partagée avec votre foyer.',
        'recipeShared.emailHtml': '<p>Une nouvelle recette <strong>{{title}}</strong> a été partagée avec votre foyer.</p>',

        'schoolLunch.title': 'Repas de cantine ajouté pour {{child}}',
        'schoolLunch.emailText': 'Un nouveau repas de cantine a été ajouté pour {{child}} : {{meal}}',
        'schoolLunch.emailHtml': '<p>Un nouveau repas de cantine a été ajouté pour <strong>{{child}}</strong> : {{meal}}</p>',

        'schoolAssignment.title': 'Nouveau devoir pour {{child}}',
        'schoolAssignment.body': '{{subject}} : {{title}}',
        'schoolAssignment.emailText': 'Nouveau devoir pour {{child}} — {{subject}} : {{title}}',
        'schoolAssignment.emailHtml': '<p>Nouveau devoir pour <strong>{{child}}</strong> — {{subject}} : <em>{{title}}</em></p>',

        'welcome.subject': 'Bienvenue sur {{app}}',
        'welcome.fallbackName': 'à vous',
        'welcome.text': 'Bonjour {{name}},\n\nVotre compte {{app}} est prêt. Vous pouvez maintenant vous connecter et commencer à utiliser l\'application.\n\n— L\'équipe {{app}}',
        'welcome.html': '<p>Bonjour {{name}},</p><p>Votre compte <strong>{{app}}</strong> est prêt. Vous pouvez maintenant vous connecter et commencer à utiliser l\'application.</p><p>— L\'équipe {{app}}</p>',
    },
}

const SUPPORTED = Object.keys(messages)

function resolveLang(code) {
    const lang = String(code || '').slice(0, 2).toLowerCase()
    return SUPPORTED.includes(lang) ? lang : 'en'
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

function lookup(lang, key, count) {
    for (const code of [lang, 'en']) {
        const dict = messages[code]
        if (count !== undefined) {
            const category = new Intl.PluralRules(code).select(count)
            const plural = dict[`${key}_${category}`] ?? dict[`${key}_other`]
            if (plural !== undefined) return plural
        }
        if (dict[key] !== undefined) return dict[key]
    }
    return key
}

/**
 * Translate `key` into `lang`, replacing {{name}} placeholders from `vars`.
 * Pass `vars.count` to select plural forms (`key_one`, `key_other`, ...).
 * Values are inserted as-is; use `html: true` to HTML-escape them for email bodies.
 */
function t(lang, key, vars = {}, { html = false } = {}) {
    const template = lookup(resolveLang(lang), key, vars.count)
    return template.replace(/\{\{(\w+)\}\}/g, (_, name) => {
        const value = vars[name]
        if (value === undefined) return ''
        return html ? escapeHtml(value) : String(value)
    })
}

/** "2 days", "1 hour 30 minutes", "45 minutes" in the given language. */
function formatDuration(lang, mins) {
    if (mins >= 1440 && mins % 1440 === 0) return t(lang, 'duration.days', { count: mins / 1440 })
    if (mins >= 60 && mins % 60 === 0) return t(lang, 'duration.hours', { count: mins / 60 })
    if (mins >= 60) {
        return `${t(lang, 'duration.hours', { count: Math.floor(mins / 60) })} ${t(lang, 'duration.minutes', { count: mins % 60 })}`
    }
    return t(lang, 'duration.minutes', { count: mins })
}

module.exports = { t, formatDuration, resolveLang, escapeHtml, SUPPORTED }
