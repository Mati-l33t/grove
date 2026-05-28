/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId("events")
    col.updateRule = "(user = @request.auth.id || (@request.auth.record.household != '' && @request.auth.record.household = household)) || @request.auth.record.is_admin = true"
    dao.saveCollection(col)
}, (db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId("events")
    col.updateRule = "@request.auth.id = user"
    dao.saveCollection(col)
})
