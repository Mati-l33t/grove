/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    
    const usersCol = app.findCollectionByNameOrId("users")
    usersCol.deleteRule = "@request.auth.id = id || @request.auth.is_admin = true"
    app.save(usersCol)
}, (db) => {
    
    const usersCol = app.findCollectionByNameOrId("users")
    usersCol.deleteRule = null
    app.save(usersCol)
})
