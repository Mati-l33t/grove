/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)

    // Events — tighten listRule/viewRule; fix updateRule (was open to any logged-in
    // user since migration 1747503000)
    {
        const col = dao.findCollectionByNameOrId("events")
        const rule =
            '@request.auth.id = user' +
            ' || (household != "" && @request.auth.record.household != "" && household = @request.auth.record.household)' +
            ' || @request.auth.id ?= shared_with'
        col.listRule   = rule
        col.viewRule   = rule
        col.updateRule = rule + ' || @request.auth.record.is_admin = true'
        dao.saveCollection(col)
    }

    // Lists — tighten listRule/viewRule
    {
        const col = dao.findCollectionByNameOrId("lists")
        const rule =
            '@request.auth.id = user' +
            ' || (household != "" && @request.auth.record.household != "" && household = @request.auth.record.household)' +
            ' || @request.auth.id ?= shared_with' +
            ' || @request.auth.id = assigned_to'
        col.listRule = rule
        col.viewRule = rule
        dao.saveCollection(col)
    }

    // List items — tighten all rules; updateRule/deleteRule were open to any
    // logged-in user since initial schema
    {
        const col = dao.findCollectionByNameOrId("list_items")
        const rule =
            'list.user = @request.auth.id' +
            ' || (list.household != "" && @request.auth.record.household != "" && list.household = @request.auth.record.household)' +
            ' || @request.auth.id ?= list.shared_with' +
            ' || list.assigned_to = @request.auth.id'
        col.listRule   = rule
        col.viewRule   = rule
        col.updateRule = rule
        col.deleteRule = rule
        dao.saveCollection(col)
    }

    // Recipes — tighten listRule/viewRule
    {
        const col = dao.findCollectionByNameOrId("recipes")
        const rule =
            '@request.auth.id = user' +
            ' || (household != "" && @request.auth.record.household != "" && household = @request.auth.record.household)' +
            ' || @request.auth.id ?= shared_with'
        col.listRule = rule
        col.viewRule = rule
        dao.saveCollection(col)
    }

    // Meal plans — tighten listRule/viewRule
    {
        const col = dao.findCollectionByNameOrId("meal_plans")
        const rule =
            '@request.auth.id = user' +
            ' || (household != "" && @request.auth.record.household != "" && household = @request.auth.record.household)'
        col.listRule = rule
        col.viewRule = rule
        dao.saveCollection(col)
    }

    // School collections — tighten listRule/viewRule; fix updateRule/deleteRule
    // (were open to any logged-in user since migration 1747602000)
    const schoolCols = ["school_children", "school_schedule", "school_lunches", "school_assignments"]
    for (const name of schoolCols) {
        try {
            const col = dao.findCollectionByNameOrId(name)
            const rule =
                '@request.auth.id = user' +
                ' || (household != "" && @request.auth.record.household != "" && household = @request.auth.record.household)'
            col.listRule   = rule
            col.viewRule   = rule
            col.updateRule = rule + ' || @request.auth.record.is_admin = true'
            col.deleteRule = rule + ' || @request.auth.record.is_admin = true'
            dao.saveCollection(col)
        } catch (_) {}
    }
}, (db) => {
    const dao = new Dao(db)
    const open = "@request.auth.id != ''"

    {
        const col = dao.findCollectionByNameOrId("events")
        col.listRule   = open
        col.viewRule   = open
        col.updateRule = open
        dao.saveCollection(col)
    }
    {
        const col = dao.findCollectionByNameOrId("lists")
        col.listRule = open
        col.viewRule = open
        dao.saveCollection(col)
    }
    {
        const col = dao.findCollectionByNameOrId("list_items")
        col.listRule   = open
        col.viewRule   = open
        col.updateRule = open
        col.deleteRule = open
        dao.saveCollection(col)
    }
    {
        const col = dao.findCollectionByNameOrId("recipes")
        col.listRule = open
        col.viewRule = open
        dao.saveCollection(col)
    }
    {
        const col = dao.findCollectionByNameOrId("meal_plans")
        col.listRule = open
        col.viewRule = open
        dao.saveCollection(col)
    }
    const schoolCols = ["school_children", "school_schedule", "school_lunches", "school_assignments"]
    for (const name of schoolCols) {
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
