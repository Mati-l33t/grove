/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const usersCol = dao.findCollectionByNameOrId("users")
    usersCol.schema.addField(new SchemaField({
        name: "time_format",
        type: "select",
        options: { maxSelect: 1, values: ["12h", "24h"] },
    }))
    dao.saveCollection(usersCol)
})
