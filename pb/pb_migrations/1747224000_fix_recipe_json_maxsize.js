/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const col = app.findCollectionByNameOrId("recipes")
    for (const name of ["ingredients", "tags"]) {
        const field = col.fields.getByName(name)
        if (field) field.maxSize = 2000000
    }
    app.save(col)
})
