/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
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
    for (const name of ["school_children", "school_schedule", "school_lunches", "school_assignments"]) {
        try {
            const col = dao.findCollectionByNameOrId(name)
            col.listRule   = open
            col.viewRule   = open
            col.updateRule = open
            col.deleteRule = open
            dao.saveCollection(col)
        } catch (_) {}
    }
}, (db) => {})
