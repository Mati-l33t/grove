/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId("events")
    col.updateRule = "@request.auth.id != ''"
    dao.saveCollection(col)
}, (db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId("events")
    col.updateRule = "@request.auth.id = user || (user.household != '' && user.household = @request.auth.record.household) || (household != '' && household = @request.auth.record.household) || @request.auth.record.is_admin = true"
    dao.saveCollection(col)
})
