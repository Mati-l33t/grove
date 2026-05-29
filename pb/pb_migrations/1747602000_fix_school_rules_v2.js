/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    
    const rule = '@request.auth.id != ""'

    for (const name of ['school_children', 'school_schedule', 'school_lunches', 'school_assignments']) {
        const col = app.findCollectionByNameOrId(name)
        col.updateRule = rule
        col.deleteRule = rule
        app.save(col)
    }
}, (db) => {
    
    const rule = '@request.auth.id = user || @request.auth.record.is_admin = true'

    for (const name of ['school_children', 'school_schedule', 'school_lunches', 'school_assignments']) {
        const col = app.findCollectionByNameOrId(name)
        col.updateRule = rule
        col.deleteRule = rule
        app.save(col)
    }
})
