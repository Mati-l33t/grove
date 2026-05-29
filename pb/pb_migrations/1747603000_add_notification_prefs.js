/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const col = app.findCollectionByNameOrId("users")
    col.fields.addMarshaledJSON(JSON.stringify({ name: "notification_prefs", type: "json", maxSize: 4096 }))
    app.save(col)
}, (app) => {
    try {
        const col = app.findCollectionByNameOrId("users")
        const f = col.fields.getByName("notification_prefs")
        if (f) col.fields.remove(f)
        app.save(col)
    } catch (_) {}
})
