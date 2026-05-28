/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const usersCol = dao.findCollectionByNameOrId("users")
    usersCol.deleteRule = "@request.auth.id = id || @request.auth.is_admin = true"
    dao.saveCollection(usersCol)
}, (db) => {
    const dao = new Dao(db)
    const usersCol = dao.findCollectionByNameOrId("users")
    usersCol.deleteRule = null
    dao.saveCollection(usersCol)
})
