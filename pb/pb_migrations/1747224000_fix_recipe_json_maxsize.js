/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId("recipes")

    for (const name of ["ingredients", "tags"]) {
        const field = col.schema.getFieldByName(name)
        if (field) {
            field.options = { maxSize: 2000000 }
        }
    }

    dao.saveCollection(col)
})
