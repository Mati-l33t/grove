/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId('instance_settings')
    col.schema.addField(new SchemaField({
        name: 'logo',
        type: 'file',
        options: {
            mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
            thumbs: ['192x192', '64x64'],
            maxSelect: 1,
            maxSize: 5242880,
            protected: false,
        },
    }))
    dao.saveCollection(col)
}, (db) => {
    const dao = new Dao(db)
    try {
        const col = dao.findCollectionByNameOrId('instance_settings')
        col.schema.removeField(col.schema.getFieldByName('logo').id)
        dao.saveCollection(col)
    } catch (_) {}
})
