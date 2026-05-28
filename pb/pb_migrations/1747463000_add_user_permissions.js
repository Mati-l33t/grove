/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const usersCol = dao.findCollectionByNameOrId("users")
    usersCol.schema.addField(new SchemaField({
        name: "permissions",
        type: "json",
    }))
    dao.saveCollection(usersCol)
}, (db) => {
    const dao = new Dao(db)
    try {
        const usersCol = dao.findCollectionByNameOrId("users")
        usersCol.schema.removeField(usersCol.schema.getFieldByName("permissions").id)
        dao.saveCollection(usersCol)
    } catch (_) {}
})
