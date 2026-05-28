/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const usersCol = dao.findCollectionByNameOrId("users")
    usersCol.schema.addField(new SchemaField({
        name: "week_start",
        type: "text",
    }))
    dao.saveCollection(usersCol)
}, (db) => {
    const dao = new Dao(db)
    try {
        const usersCol = dao.findCollectionByNameOrId("users")
        usersCol.schema.removeField(usersCol.schema.getFieldByName("week_start").id)
        dao.saveCollection(usersCol)
    } catch (_) {}
})
