/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId('users')
    const opts = col.authOptions()
    opts.allowUsernameAuth = true
    opts.requireEmail = false
    dao.saveCollection(col)
}, (db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId('users')
    const opts = col.authOptions()
    opts.allowUsernameAuth = false
    opts.requireEmail = true
    dao.saveCollection(col)
})
