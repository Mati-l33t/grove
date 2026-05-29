/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    
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
    for (const name of ["school_children", "school_schedule", "school_lunches", "school_assignments"]) {
        try {
            const col = app.findCollectionByNameOrId(name)
            col.listRule   = open
            col.viewRule   = open
            col.updateRule = open
            col.deleteRule = open
            app.save(col)
        } catch (_) {}
    }
}, (db) => {})
