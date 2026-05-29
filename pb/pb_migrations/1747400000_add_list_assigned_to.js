/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const col = app.findCollectionByNameOrId("lists")
    col.fields.add({ name: "assigned_to", type: "relation", collectionId: "_pb_users_auth_", cascadeDelete: false, maxSelect: 1 })
    app.save(col)
}, (app) => {
    try {
        const col = app.findCollectionByNameOrId("lists")
        const f = col.fields.getByName("assigned_to")
        if (f) col.fields.remove(f)
        app.save(col)
    } catch (_) {}
})
