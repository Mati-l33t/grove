/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const col = new Collection()
    col.name = "smtp_settings"
    col.type = "base"
    col.listRule   = "@request.auth.is_admin = true"
    col.viewRule   = "@request.auth.is_admin = true"
    col.createRule = "@request.auth.is_admin = true"
    col.updateRule = "@request.auth.is_admin = true"
    col.deleteRule = "@request.auth.is_admin = true"
    col.schema.addField(new SchemaField({ name: "enabled",      type: "bool" }))
    col.schema.addField(new SchemaField({ name: "host",         type: "text" }))
    col.schema.addField(new SchemaField({ name: "port",         type: "number" }))
    col.schema.addField(new SchemaField({ name: "secure",       type: "bool" }))
    col.schema.addField(new SchemaField({ name: "username",     type: "text" }))
    col.schema.addField(new SchemaField({ name: "password",     type: "text" }))
    col.schema.addField(new SchemaField({ name: "from_name",    type: "text" }))
    col.schema.addField(new SchemaField({ name: "from_address", type: "text" }))
    dao.saveCollection(col)
}, (db) => {
    const dao = new Dao(db)
    try {
        const col = dao.findCollectionByNameOrId("smtp_settings")
        dao.deleteCollection(col)
    } catch (_) {}
})
