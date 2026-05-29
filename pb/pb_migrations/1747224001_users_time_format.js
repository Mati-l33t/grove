/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const col = app.findCollectionByNameOrId("users")
    col.fields.add({ name: "time_format", type: "select", maxSelect: 1, values: ["12h", "24h"] })
    app.save(col)
})
