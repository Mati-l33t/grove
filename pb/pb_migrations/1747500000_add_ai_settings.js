/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const col = new Collection()
    col.name = "ai_settings"
    col.type = "base"
    col.listRule   = "@request.auth.is_admin = true"
    col.viewRule   = "@request.auth.is_admin = true"
    col.createRule = "@request.auth.is_admin = true"
    col.updateRule = "@request.auth.is_admin = true"
    col.deleteRule = "@request.auth.is_admin = true"
    col.schema.addField(new SchemaField({ name: "enabled",       type: "bool" }))
    col.schema.addField(new SchemaField({ name: "api_url",       type: "text" }))
    col.schema.addField(new SchemaField({ name: "api_key",       type: "text" }))
    col.schema.addField(new SchemaField({ name: "default_model", type: "text" }))
    dao.saveCollection(col)
}, (db) => {
    const dao = new Dao(db)
    try {
        const col = dao.findCollectionByNameOrId("ai_settings")
        dao.deleteCollection(col)
    } catch (_) {}
})
