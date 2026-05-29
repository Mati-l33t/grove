/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    for (const colName of ["events", "lists", "recipes", "meal_plans"]) {
        const col = app.findCollectionByNameOrId(colName)
        col.fields.add({ name: "shared_with", type: "relation", collectionId: "_pb_users_auth_", cascadeDelete: false, maxSelect: null })
        app.save(col)
    }
}, (app) => {
    for (const colName of ["events", "lists", "recipes", "meal_plans"]) {
        try {
            const col = app.findCollectionByNameOrId(colName)
            const f = col.fields.getByName("shared_with")
            if (f) col.fields.remove(f)
            app.save(col)
        } catch (_) {}
    }
})
