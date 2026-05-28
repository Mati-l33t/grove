/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const usersCol = dao.findCollectionByNameOrId("users")
    usersCol.schema.addField(new SchemaField({
        name: "role",
        type: "select",
        options: { maxSelect: 1, values: ["adult", "child"] },
    }))
    // Allow admins to manage other users (needed for role assignment)
    usersCol.updateRule = "@request.auth.id = id || @request.auth.record.is_admin = true"
    dao.saveCollection(usersCol)
}, (db) => {
    const dao = new Dao(db)
    try {
        const usersCol = dao.findCollectionByNameOrId("users")
        usersCol.schema.removeField(usersCol.schema.getFieldByName("role").id)
        usersCol.updateRule = "id = @request.auth.id"
        dao.saveCollection(usersCol)
    } catch (_) {}
})
