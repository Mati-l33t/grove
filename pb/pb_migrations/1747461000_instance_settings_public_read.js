/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId("instance_settings")
    col.listRule = ""
    col.viewRule = ""
    dao.saveCollection(col)
}, (db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId("instance_settings")
    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    dao.saveCollection(col)
})
