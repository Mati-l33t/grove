/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const householdsId = dao.findCollectionByNameOrId('households').id
    const usersId = '_pb_users_auth_'

    // school_children
    {
        const col = new Collection()
        col.name = 'school_children'
        col.type = 'base'
        col.listRule = '@request.auth.id != ""'
        col.viewRule = '@request.auth.id != ""'
        col.createRule = '@request.auth.id != ""'
        col.updateRule = '@request.auth.id = user || @request.auth.record.is_admin = true'
        col.deleteRule = '@request.auth.id = user || @request.auth.record.is_admin = true'
        col.schema.addField(new SchemaField({ name: 'name', type: 'text', required: true }))
        col.schema.addField(new SchemaField({ name: 'school_name', type: 'text' }))
        col.schema.addField(new SchemaField({ name: 'grade', type: 'text' }))
        col.schema.addField(new SchemaField({ name: 'color', type: 'text' }))
        col.schema.addField(new SchemaField({
            name: 'user', type: 'relation', required: true,
            options: { collectionId: usersId, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        col.schema.addField(new SchemaField({
            name: 'household', type: 'relation',
            options: { collectionId: householdsId, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        dao.saveCollection(col)
    }

    const childrenId = dao.findCollectionByNameOrId('school_children').id

    // school_schedule — recurring weekly hours per day
    {
        const col = new Collection()
        col.name = 'school_schedule'
        col.type = 'base'
        col.listRule = '@request.auth.id != ""'
        col.viewRule = '@request.auth.id != ""'
        col.createRule = '@request.auth.id != ""'
        col.updateRule = '@request.auth.id = user || @request.auth.record.is_admin = true'
        col.deleteRule = '@request.auth.id = user || @request.auth.record.is_admin = true'
        col.schema.addField(new SchemaField({
            name: 'child', type: 'relation', required: true,
            options: { collectionId: childrenId, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        col.schema.addField(new SchemaField({
            name: 'day', type: 'select', required: true,
            options: { maxSelect: 1, values: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
        }))
        col.schema.addField(new SchemaField({ name: 'start_time', type: 'text' }))
        col.schema.addField(new SchemaField({ name: 'end_time', type: 'text' }))
        col.schema.addField(new SchemaField({
            name: 'user', type: 'relation', required: true,
            options: { collectionId: usersId, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        col.schema.addField(new SchemaField({
            name: 'household', type: 'relation',
            options: { collectionId: householdsId, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        dao.saveCollection(col)
    }

    // school_lunches — meal per specific date
    {
        const col = new Collection()
        col.name = 'school_lunches'
        col.type = 'base'
        col.listRule = '@request.auth.id != ""'
        col.viewRule = '@request.auth.id != ""'
        col.createRule = '@request.auth.id != ""'
        col.updateRule = '@request.auth.id = user || @request.auth.record.is_admin = true'
        col.deleteRule = '@request.auth.id = user || @request.auth.record.is_admin = true'
        col.schema.addField(new SchemaField({
            name: 'child', type: 'relation', required: true,
            options: { collectionId: childrenId, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        col.schema.addField(new SchemaField({ name: 'date', type: 'text', required: true }))
        col.schema.addField(new SchemaField({ name: 'meal', type: 'text' }))
        col.schema.addField(new SchemaField({
            name: 'user', type: 'relation', required: true,
            options: { collectionId: usersId, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        col.schema.addField(new SchemaField({
            name: 'household', type: 'relation',
            options: { collectionId: householdsId, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        dao.saveCollection(col)
    }

    // school_assignments — tests, homework, projects
    {
        const col = new Collection()
        col.name = 'school_assignments'
        col.type = 'base'
        col.listRule = '@request.auth.id != ""'
        col.viewRule = '@request.auth.id != ""'
        col.createRule = '@request.auth.id != ""'
        col.updateRule = '@request.auth.id = user || @request.auth.record.is_admin = true'
        col.deleteRule = '@request.auth.id = user || @request.auth.record.is_admin = true'
        col.schema.addField(new SchemaField({
            name: 'child', type: 'relation', required: true,
            options: { collectionId: childrenId, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        col.schema.addField(new SchemaField({ name: 'subject', type: 'text' }))
        col.schema.addField(new SchemaField({ name: 'title', type: 'text', required: true }))
        col.schema.addField(new SchemaField({
            name: 'type', type: 'select',
            options: { maxSelect: 1, values: ['test', 'homework', 'project', 'other'] },
        }))
        col.schema.addField(new SchemaField({ name: 'due_date', type: 'text' }))
        col.schema.addField(new SchemaField({ name: 'done', type: 'bool' }))
        col.schema.addField(new SchemaField({ name: 'notes', type: 'text' }))
        col.schema.addField(new SchemaField({
            name: 'user', type: 'relation', required: true,
            options: { collectionId: usersId, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        col.schema.addField(new SchemaField({
            name: 'household', type: 'relation',
            options: { collectionId: householdsId, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        dao.saveCollection(col)
    }
}, (db) => {
    const dao = new Dao(db)
    for (const name of ['school_assignments', 'school_lunches', 'school_schedule', 'school_children']) {
        try { dao.deleteCollection(dao.findCollectionByNameOrId(name)) } catch (_) {}
    }
})
