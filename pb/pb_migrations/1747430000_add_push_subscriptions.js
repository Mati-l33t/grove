/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const col = new Collection({
        type: "base",
        name: "push_subscriptions",
        listRule:   "@request.auth.id = user",
        viewRule:   "@request.auth.id = user",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user",
        deleteRule: "@request.auth.id = user",
        fields: [
            { name: "user",     type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true,  maxSelect: 1 },
            { name: "endpoint", type: "text",     required: true },
            { name: "p256dh",   type: "text",     required: true },
            { name: "auth",     type: "text",     required: true },
        ],
    })
    app.save(col)
}, (app) => {
    try { app.delete(app.findCollectionByNameOrId("push_subscriptions")) } catch (_) {}
})
