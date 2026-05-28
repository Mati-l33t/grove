/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const col = new Collection()
    col.name = 'push_subscriptions'
    col.type = 'base'
    col.listRule = '@request.auth.id = user'
    col.viewRule = '@request.auth.id = user'
    col.createRule = '@request.auth.id != ""'
    col.updateRule = '@request.auth.id = user'
    col.deleteRule = '@request.auth.id = user'
    col.schema.addField(new SchemaField({
        name: 'user', type: 'relation', required: true,
        options: { collectionId: '_pb_users_auth_', cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] },
    }))
    col.schema.addField(new SchemaField({ name: 'endpoint', type: 'text', required: true }))
    col.schema.addField(new SchemaField({ name: 'p256dh', type: 'text', required: true }))
    col.schema.addField(new SchemaField({ name: 'auth', type: 'text', required: true }))
    dao.saveCollection(col)
}, (db) => {
    const dao = new Dao(db)
    try {
        dao.deleteCollection(dao.findCollectionByNameOrId('push_subscriptions'))
    } catch (_) {}
})
