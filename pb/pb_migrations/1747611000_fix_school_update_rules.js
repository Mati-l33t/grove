/// <reference path="../pb_data/types.d.ts" />

// School records are owned by the parent who created them.
// Household members can list/view (to see schedules), but only the owner
// or an admin may update/delete. The household rule on write was too broad.

migrate((db) => {
    const dao = new Dao(db)

    const viewRule =
        '@request.auth.id = user' +
        ' || @request.auth.is_admin = true' +
        ' || (household != "" && @request.auth.household = household)'

    const writeRule =
        '@request.auth.id = user' +
        ' || @request.auth.is_admin = true'

    for (const name of ['school_children', 'school_schedule', 'school_lunches', 'school_assignments']) {
        try {
            const col = dao.findCollectionByNameOrId(name)
            col.listRule   = viewRule
            col.viewRule   = viewRule
            col.updateRule = writeRule
            col.deleteRule = writeRule
            dao.saveCollection(col)
        } catch (_) {}
    }
}, (db) => {
    const dao = new Dao(db)

    const ownedRule =
        '@request.auth.id = user' +
        ' || @request.auth.is_admin = true' +
        ' || (household != "" && @request.auth.household = household)'

    for (const name of ['school_children', 'school_schedule', 'school_lunches', 'school_assignments']) {
        try {
            const col = dao.findCollectionByNameOrId(name)
            col.listRule   = ownedRule
            col.viewRule   = ownedRule
            col.updateRule = ownedRule
            col.deleteRule = ownedRule
            dao.saveCollection(col)
        } catch (_) {}
    }
})
