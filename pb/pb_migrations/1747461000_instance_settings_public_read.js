/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    
    const col = app.findCollectionByNameOrId("instance_settings")
    col.listRule = ""
    col.viewRule = ""
    app.save(col)
}, (db) => {
    
    const col = app.findCollectionByNameOrId("instance_settings")
    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    app.save(col)
})
