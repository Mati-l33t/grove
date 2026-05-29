/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    
    const col = app.findCollectionByNameOrId('users')
    const opts = col.authOptions()
    opts.allowUsernameAuth = true
    opts.requireEmail = false
    app.save(col)
}, (db) => {
    
    const col = app.findCollectionByNameOrId('users')
    const opts = col.authOptions()
    opts.allowUsernameAuth = false
    opts.requireEmail = true
    app.save(col)
})
