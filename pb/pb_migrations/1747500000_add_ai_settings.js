/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const col = new Collection({
        type: "base", name: "ai_settings",
        listRule:   "@request.auth.is_admin = true",
        viewRule:   "@request.auth.is_admin = true",
        createRule: "@request.auth.is_admin = true",
        updateRule: "@request.auth.is_admin = true",
        deleteRule: "@request.auth.is_admin = true",
    })
    col.fields.addMarshaledJSON(JSON.stringify({ name: "enabled",       type: "bool" }))
    col.fields.addMarshaledJSON(JSON.stringify({ name: "api_url",       type: "text" }))
    col.fields.addMarshaledJSON(JSON.stringify({ name: "api_key",       type: "text" }))
    col.fields.addMarshaledJSON(JSON.stringify({ name: "default_model", type: "text" }))
    app.save(col)
}, (app) => {
    try { app.delete(app.findCollectionByNameOrId("ai_settings")) } catch (_) {}
})
