/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)

    for (const colName of ["events", "lists", "recipes", "meal_plans"]) {
        const col = dao.findCollectionByNameOrId(colName)
        col.schema.addField(new SchemaField({
            name: "shared_with",
            type: "relation",
            options: {
                collectionId: "_pb_users_auth_",
                cascadeDelete: false,
                minSelect: null,
                maxSelect: null,
                displayFields: [],
            },
        }))
        dao.saveCollection(col)
    }
}, (db) => {
    const dao = new Dao(db)
    for (const colName of ["events", "lists", "recipes", "meal_plans"]) {
        try {
            const col = dao.findCollectionByNameOrId(colName)
            col.schema.removeField(col.schema.getFieldByName("shared_with").id)
            dao.saveCollection(col)
        } catch (_) {}
    }
})
