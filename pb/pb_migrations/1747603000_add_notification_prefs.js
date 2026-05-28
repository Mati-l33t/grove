/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const usersCol = dao.findCollectionByNameOrId("users")
    usersCol.schema.addField(new SchemaField({
        name: "notification_prefs",
        type: "json",
        options: { maxSize: 4096 },
    }))
    dao.saveCollection(usersCol)
}, (db) => {
    const dao = new Dao(db)
    try {
        const usersCol = dao.findCollectionByNameOrId("users")
        usersCol.schema.removeField(usersCol.schema.getFieldByName("notification_prefs").id)
        dao.saveCollection(usersCol)
    } catch (_) {}
})
