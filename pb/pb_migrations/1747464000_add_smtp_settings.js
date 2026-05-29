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
    col.fields.add({ name: "enabled",      type: "bool" })
    col.fields.add({ name: "host",         type: "text" })
    col.fields.add({ name: "port",         type: "number" })
    col.fields.add({ name: "secure",       type: "bool" })
    col.fields.add({ name: "username",     type: "text" })
    col.fields.add({ name: "password",     type: "text" })
    col.fields.add({ name: "from_name",    type: "text" })
    col.fields.add({ name: "from_address", type: "text" })
    app.save(col)
}, (app) => {
    try { app.delete(app.findCollectionByNameOrId("smtp_settings")) } catch (_) {}
})
