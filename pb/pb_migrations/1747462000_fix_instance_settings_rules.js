/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    
    const col = app.findCollectionByNameOrId("instance_settings")
    col.createRule = "@request.auth.is_admin = true"
    col.updateRule = "@request.auth.is_admin = true"
    col.deleteRule = "@request.auth.is_admin = true"
    app.save(col)
}, (db) => {
    
    const col = app.findCollectionByNameOrId("instance_settings")
    col.createRule = "@request.auth.record.is_admin = true"
    col.updateRule = "@request.auth.record.is_admin = true"
    col.deleteRule = "@request.auth.record.is_admin = true"
    app.save(col)
})
