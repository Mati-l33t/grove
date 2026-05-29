/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const col = app.findCollectionByNameOrId("instance_settings")
    col.fields.add({
        name: "logo", type: "file",
        mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
        thumbs: ["192x192", "64x64"],
        maxSelect: 1,
        maxSize: 5242880,
    })
    app.save(col)
}, (app) => {
    try {
        const col = app.findCollectionByNameOrId("instance_settings")
        const f = col.fields.getByName("logo")
        if (f) col.fields.remove(f)
        app.save(col)
    } catch (_) {}
})
