/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.addMarshaledJSON(JSON.stringify({ name: "username", type: "text" }))
    const existing = Array.from(col.indexes || [])
    if (!existing.some((s) => String(s).indexOf("username") !== -1)) {
        existing.push("CREATE UNIQUE INDEX __pb_users_auth__username_idx ON users (username)")
        col.indexes = existing
    }
    col.passwordAuth.identityFields = ["email", "username"]
    app.save(col)
}, (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.passwordAuth.identityFields = ["email"]
    const f = col.fields.getByName("username")
    if (f) col.fields.removeById(f.id)
    app.save(col)
})
