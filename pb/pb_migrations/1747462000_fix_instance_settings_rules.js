/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId("instance_settings")
    col.createRule = "@request.auth.is_admin = true"
    col.updateRule = "@request.auth.is_admin = true"
    col.deleteRule = "@request.auth.is_admin = true"
    dao.saveCollection(col)
}, (db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId("instance_settings")
    col.createRule = "@request.auth.record.is_admin = true"
    col.updateRule = "@request.auth.record.is_admin = true"
    col.deleteRule = "@request.auth.record.is_admin = true"
    dao.saveCollection(col)
})
