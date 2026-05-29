/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    
    const col = app.findCollectionByNameOrId("events")
    col.updateRule = "@request.auth.id != ''"
    app.save(col)
}, (db) => {
    
    const col = app.findCollectionByNameOrId("events")
    col.updateRule = "@request.auth.id = user || (user.household != '' && user.household = @request.auth.record.household) || (household != '' && household = @request.auth.record.household) || @request.auth.record.is_admin = true"
    app.save(col)
})
