/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    
    const col = app.findCollectionByNameOrId('recipes')

    const rule =
        '@request.auth.id = user || ' +
        '@request.auth.is_admin = true || ' +
        '(household != "" && @request.auth.household = household) || ' +
        '@request.auth.id ?= shared_with'

    col.updateRule = rule
    col.deleteRule = rule
    app.save(col)
}, (db) => {
    
    const col = app.findCollectionByNameOrId('recipes')
    col.updateRule = '@request.auth.id = user'
    col.deleteRule = '@request.auth.id = user'
    app.save(col)
})
