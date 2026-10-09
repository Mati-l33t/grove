/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const col = app.findCollectionByNameOrId("users")
    col.fields.addMarshaledJSON(JSON.stringify({ name: "language", type: "text", max: 10 }))
    app.save(col)
})
