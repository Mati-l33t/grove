/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    

    // Events — tighten listRule/viewRule; fix updateRule (was open to any logged-in
    // user since migration 1747503000)
    {
        const col = app.findCollectionByNameOrId("events")
        const rule =
            '@request.auth.id = user' +
            ' || (household != "" && @request.auth.record.household != "" && household = @request.auth.record.household)' +
            ' || @request.auth.id ?= shared_with'
        col.listRule   = rule
        col.viewRule   = rule
        col.updateRule = rule + ' || @request.auth.record.is_admin = true'
        app.save(col)
    }

    // Lists — tighten listRule/viewRule
    {
        const col = app.findCollectionByNameOrId("lists")
        const rule =
            '@request.auth.id = user' +
            ' || (household != "" && @request.auth.record.household != "" && household = @request.auth.record.household)' +
            ' || @request.auth.id ?= shared_with' +
            ' || @request.auth.id = assigned_to'
        col.listRule = rule
        col.viewRule = rule
        app.save(col)
    }

    // List items — tighten all rules; updateRule/deleteRule were open to any
    // logged-in user since initial schema
    {
        const col = app.findCollectionByNameOrId("list_items")
        const rule =
            'list.user = @request.auth.id' +
            ' || (list.household != "" && @request.auth.record.household != "" && list.household = @request.auth.record.household)' +
            ' || @request.auth.id ?= list.shared_with' +
            ' || list.assigned_to = @request.auth.id'
        col.listRule   = rule
        col.viewRule   = rule
        col.updateRule = rule
        col.deleteRule = rule
        app.save(col)
    }

    // Recipes — tighten listRule/viewRule
    {
        const col = app.findCollectionByNameOrId("recipes")
        const rule =
            '@request.auth.id = user' +
            ' || (household != "" && @request.auth.record.household != "" && household = @request.auth.record.household)' +
            ' || @request.auth.id ?= shared_with'
        col.listRule = rule
        col.viewRule = rule
        app.save(col)
    }

    // Meal plans — tighten listRule/viewRule
    {
        const col = app.findCollectionByNameOrId("meal_plans")
        const rule =
            '@request.auth.id = user' +
            ' || (household != "" && @request.auth.record.household != "" && household = @request.auth.record.household)'
        col.listRule = rule
        col.viewRule = rule
        app.save(col)
    }

    // School collections — tighten listRule/viewRule; fix updateRule/deleteRule
    // (were open to any logged-in user since migration 1747602000)
    const schoolCols = ["school_children", "school_schedule", "school_lunches", "school_assignments"]
    for (const name of schoolCols) {
        try {
            const col = app.findCollectionByNameOrId(name)
            const rule =
                '@request.auth.id = user' +
                ' || (household != "" && @request.auth.record.household != "" && household = @request.auth.record.household)'
            col.listRule   = rule
            col.viewRule   = rule
            col.updateRule = rule + ' || @request.auth.record.is_admin = true'
            col.deleteRule = rule + ' || @request.auth.record.is_admin = true'
            app.save(col)
        } catch (_) {}
    }
}, (db) => {
    
    const open = "@request.auth.id != ''"

    {
        const col = app.findCollectionByNameOrId("events")
        col.listRule   = open
        col.viewRule   = open
        col.updateRule = open
        app.save(col)
    }
    {
        const col = app.findCollectionByNameOrId("lists")
        col.listRule = open
        col.viewRule = open
        app.save(col)
    }
    {
        const col = app.findCollectionByNameOrId("list_items")
        col.listRule   = open
        col.viewRule   = open
        col.updateRule = open
        col.deleteRule = open
        app.save(col)
    }
    {
        const col = app.findCollectionByNameOrId("recipes")
        col.listRule = open
        col.viewRule = open
        app.save(col)
    }
    {
        const col = app.findCollectionByNameOrId("meal_plans")
        col.listRule = open
        col.viewRule = open
        app.save(col)
    }
    const schoolCols = ["school_children", "school_schedule", "school_lunches", "school_assignments"]
    for (const name of schoolCols) {
        try {
            const col = app.findCollectionByNameOrId(name)
            col.listRule   = open
            col.viewRule   = open
            col.updateRule = open
            col.deleteRule = open
            app.save(col)
        } catch (_) {}
    }
})
