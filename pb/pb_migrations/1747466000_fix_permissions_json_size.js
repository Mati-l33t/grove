/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const col = app.findCollectionByNameOrId("users")
    const f = col.fields.getByName("permissions")
    if (f) f.maxSize = 4096
    app.save(col)
}, (app) => {
    const col = app.findCollectionByNameOrId("users")
    const f = col.fields.getByName("permissions")
    if (f) f.maxSize = 0
    app.save(col)
})
