/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId("events")
    col.schema.addField(new SchemaField({
        name: "location",
        type: "text",
    }))
    dao.saveCollection(col)
}, (db) => {
    const dao = new Dao(db)
    try {
        const col = dao.findCollectionByNameOrId("events")
        col.schema.removeField(col.schema.getFieldByName("location").id)
        dao.saveCollection(col)
    } catch (_) {}
})
