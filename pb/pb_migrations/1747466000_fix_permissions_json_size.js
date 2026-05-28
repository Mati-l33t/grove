/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const usersCol = dao.findCollectionByNameOrId("users")
    const field = usersCol.schema.getFieldByName("permissions")
    field.options.maxSize = 4096
    dao.saveCollection(usersCol)
}, (db) => {
    const dao = new Dao(db)
    const usersCol = dao.findCollectionByNameOrId("users")
    const field = usersCol.schema.getFieldByName("permissions")
    field.options.maxSize = 0
    dao.saveCollection(usersCol)
})
