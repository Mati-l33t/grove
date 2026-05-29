/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const col = app.findCollectionByNameOrId("events")
    col.fields.addMarshaledJSON(JSON.stringify({ name: "location", type: "text" }))
    app.save(col)
}, (app) => {
    try {
        const col = app.findCollectionByNameOrId("events")
        const f = col.fields.getByName("location")
        if (f) col.fields.remove(f)
        app.save(col)
    } catch (_) {}
})
