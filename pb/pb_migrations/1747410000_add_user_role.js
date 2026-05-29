/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const col = app.findCollectionByNameOrId("users")
    col.fields.add({ name: "role", type: "select", maxSelect: 1, values: ["adult", "child"] })
    col.updateRule = "@request.auth.id = id || @request.auth.is_admin = true"
    app.save(col)
}, (app) => {
    try {
        const col = app.findCollectionByNameOrId("users")
        const f = col.fields.getByName("role")
        if (f) col.fields.remove(f)
        col.updateRule = "id = @request.auth.id"
        app.save(col)
    } catch (_) {}
})
