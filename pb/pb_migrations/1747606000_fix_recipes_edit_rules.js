/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId('recipes')

    const rule =
        '@request.auth.id = user || ' +
        '@request.auth.is_admin = true || ' +
        '(household != "" && @request.auth.household = household) || ' +
        '@request.auth.id ?= shared_with'

    col.updateRule = rule
    col.deleteRule = rule
    dao.saveCollection(col)
}, (db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId('recipes')
    col.updateRule = '@request.auth.id = user'
    col.deleteRule = '@request.auth.id = user'
    dao.saveCollection(col)
})
