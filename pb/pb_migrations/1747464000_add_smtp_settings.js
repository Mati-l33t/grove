/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const col = new Collection({
        type: "base", name: "smtp_settings",
        listRule:   "@request.auth.is_admin = true",
        viewRule:   "@request.auth.is_admin = true",
        createRule: "@request.auth.is_admin = true",
        updateRule: "@request.auth.is_admin = true",
        deleteRule: "@request.auth.is_admin = true",
    })
    col.fields.addMarshaledJSON(JSON.stringify({ name: "enabled",      type: "bool" }))
    col.fields.addMarshaledJSON(JSON.stringify({ name: "host",         type: "text" }))
    col.fields.addMarshaledJSON(JSON.stringify({ name: "port",         type: "number" }))
    col.fields.addMarshaledJSON(JSON.stringify({ name: "secure",       type: "bool" }))
    col.fields.addMarshaledJSON(JSON.stringify({ name: "username",     type: "text" }))
    col.fields.addMarshaledJSON(JSON.stringify({ name: "password",     type: "text" }))
    col.fields.addMarshaledJSON(JSON.stringify({ name: "from_name",    type: "text" }))
    col.fields.addMarshaledJSON(JSON.stringify({ name: "from_address", type: "text" }))
    app.save(col)
}, (app) => {
    try { app.delete(app.findCollectionByNameOrId("smtp_settings")) } catch (_) {}
})
