/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const col = new Collection({
        type: "base",
        name: "smtp_settings",
        listRule:   "@request.auth.is_admin = true",
        viewRule:   "@request.auth.is_admin = true",
        createRule: "@request.auth.is_admin = true",
        updateRule: "@request.auth.is_admin = true",
        deleteRule: "@request.auth.is_admin = true",
        fields: [
            { name: "enabled",      type: "bool" },
            { name: "host",         type: "text" },
            { name: "port",         type: "number" },
            { name: "secure",       type: "bool" },
            { name: "username",     type: "text" },
            { name: "password",     type: "text" },
            { name: "from_name",    type: "text" },
            { name: "from_address", type: "text" },
        ],
    })
    app.save(col)
}, (app) => {
    try { app.delete(app.findCollectionByNameOrId("smtp_settings")) } catch (_) {}
})
