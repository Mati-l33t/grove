/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const col = app.findCollectionByNameOrId("users")
    col.fields.addMarshaledJSON(JSON.stringify({ name: "week_start", type: "text" }))
    app.save(col)
}, (app) => {
    try {
        const col = app.findCollectionByNameOrId("users")
        const f = col.fields.getByName("week_start")
        if (f) col.fields.remove(f)
        app.save(col)
    } catch (_) {}
})
