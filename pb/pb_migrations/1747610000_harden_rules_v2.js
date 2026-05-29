/// <reference path="../pb_data/types.d.ts" />

// Scope collection read rules to owner / household / shared_with.
// Follows the syntax pattern confirmed working in 1747606000:
//   @request.auth.household  (not .record.household)
//   @request.auth.id ?= shared_with  (direct field, not nested relation)
// list_items is intentionally left untouched — shared_with users (non-household)
// need to check items off, and ?= on a nested relation is unsupported.

migrate((db) => {
    const dao = new Dao(db)

    const sharedRule = (extra) =>
        '@request.auth.id = user' +
        ' || @request.auth.is_admin = true' +
        ' || (household != "" && @request.auth.household = household)' +
        ' || @request.auth.id ?= shared_with' +
        (extra ? (' || ' + extra) : '')

    const ownedRule = () =>
        '@request.auth.id = user' +
        ' || @request.auth.is_admin = true' +
        ' || (household != "" && @request.auth.household = household)'

    // Events — tighten list/view; fix updateRule (was open to any user since 1747503000)
    {
        const col = dao.findCollectionByNameOrId('events')
        col.listRule   = sharedRule()
        col.viewRule   = sharedRule()
        col.updateRule = sharedRule()
        dao.saveCollection(col)
    }

    // Lists — tighten list/view (include assigned_to)
    {
        const col = dao.findCollectionByNameOrId('lists')
        col.listRule = sharedRule('@request.auth.id = assigned_to')
        col.viewRule = sharedRule('@request.auth.id = assigned_to')
        dao.saveCollection(col)
    }

    // Recipes — tighten list/view
    {
        const col = dao.findCollectionByNameOrId('recipes')
        col.listRule = sharedRule()
        col.viewRule = sharedRule()
        dao.saveCollection(col)
    }

    // Meal plans — tighten list/view
    {
        const col = dao.findCollectionByNameOrId('meal_plans')
        col.listRule = ownedRule()
        col.viewRule = ownedRule()
        dao.saveCollection(col)
    }

    // School collections — tighten list/view; fix update/delete (open since 1747602000)
    for (const name of ['school_children', 'school_schedule', 'school_lunches', 'school_assignments']) {
        try {
            const col = dao.findCollectionByNameOrId(name)
            col.listRule   = ownedRule()
            col.viewRule   = ownedRule()
            col.updateRule = ownedRule()
            col.deleteRule = ownedRule()
            dao.saveCollection(col)
        } catch (_) {}
    }
}, (db) => {
    const dao = new Dao(db)
    const open = "@request.auth.id != ''"

    for (const name of ['events', 'lists', 'recipes', 'meal_plans']) {
        try {
            const col = dao.findCollectionByNameOrId(name)
            col.listRule = open
            col.viewRule = open
            if (name === 'events') col.updateRule = open
            dao.saveCollection(col)
        } catch (_) {}
    }

    for (const name of ['school_children', 'school_schedule', 'school_lunches', 'school_assignments']) {
        try {
            const col = dao.findCollectionByNameOrId(name)
            col.listRule   = open
            col.viewRule   = open
            col.updateRule = open
            col.deleteRule = open
            dao.saveCollection(col)
        } catch (_) {}
    }
})
