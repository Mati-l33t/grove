/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId('lists')
    col.schema.addField(new SchemaField({
        name: 'assigned_to',
        type: 'relation',
        options: {
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 1,
            displayFields: [],
        },
    }))
    dao.saveCollection(col)
}, (db) => {
    const dao = new Dao(db)
    try {
        const col = dao.findCollectionByNameOrId('lists')
        col.schema.removeField(col.schema.getFieldByName('assigned_to').id)
        dao.saveCollection(col)
    } catch (_) {}
})
