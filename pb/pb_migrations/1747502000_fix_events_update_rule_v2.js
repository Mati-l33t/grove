/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    
    const col = app.findCollectionByNameOrId("events")
    // Allow: event owner, any member of the same household as the owner,
    // any member of the household the event is shared with, or admins.
    col.updateRule = "@request.auth.id = user || (user.household != '' && user.household = @request.auth.record.household) || (household != '' && household = @request.auth.record.household) || @request.auth.record.is_admin = true"
    app.save(col)
}, (db) => {
    
    const col = app.findCollectionByNameOrId("events")
    col.updateRule = "(user = @request.auth.id || (@request.auth.record.household != '' && @request.auth.record.household = household)) || @request.auth.record.is_admin = true"
    app.save(col)
})
