/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const col = app.findCollectionByNameOrId("users")
    col.fields.add({ name: "welcome_sent", type: "bool" })
    app.save(col)
}, (app) => {
    try {
        const col = app.findCollectionByNameOrId("users")
        const f = col.fields.getByName("welcome_sent")
        if (f) col.fields.remove(f)
        app.save(col)
    } catch (_) {}
})
