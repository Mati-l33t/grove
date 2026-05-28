/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const rule = '@request.auth.id = user || (household != "" && @request.auth.record.household = household) || @request.auth.record.is_admin = true'

    for (const name of ['school_children', 'school_schedule', 'school_lunches', 'school_assignments']) {
        const col = dao.findCollectionByNameOrId(name)
        col.updateRule = rule
        col.deleteRule = rule
        dao.saveCollection(col)
    }
}, (db) => {
    const dao = new Dao(db)
    const rule = '@request.auth.id = user || @request.auth.record.is_admin = true'

    for (const name of ['school_children', 'school_schedule', 'school_lunches', 'school_assignments']) {
        const col = dao.findCollectionByNameOrId(name)
        col.updateRule = rule
        col.deleteRule = rule
        dao.saveCollection(col)
    }
})
