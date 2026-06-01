/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const holidays = new Collection({
        type: "base", name: "holidays",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.is_admin = true",
        updateRule: "@request.auth.is_admin = true",
        deleteRule: "@request.auth.is_admin = true",
    })
    holidays.fields.addMarshaledJSON(JSON.stringify({ name: "date",         type: "date",   required: true }))
    holidays.fields.addMarshaledJSON(JSON.stringify({ name: "name",         type: "text",   required: true }))
    holidays.fields.addMarshaledJSON(JSON.stringify({ name: "local_name",   type: "text" }))
    holidays.fields.addMarshaledJSON(JSON.stringify({ name: "country_code", type: "text",   required: true }))
    holidays.fields.addMarshaledJSON(JSON.stringify({ name: "year",         type: "number", required: true }))
    app.save(holidays)

    const settings = app.findCollectionByNameOrId("instance_settings")
    settings.fields.addMarshaledJSON(JSON.stringify({ name: "holidays_enabled",       type: "bool" }))
    settings.fields.addMarshaledJSON(JSON.stringify({ name: "holiday_countries",      type: "json", maxSize: 5000 }))
    settings.fields.addMarshaledJSON(JSON.stringify({ name: "holidays_last_imported", type: "date" }))
    app.save(settings)
}, (app) => {
    try { app.delete(app.findCollectionByNameOrId("holidays")) } catch (_) {}
    try {
        const settings = app.findCollectionByNameOrId("instance_settings")
        for (const name of ["holidays_enabled", "holiday_countries", "holidays_last_imported"]) {
            const f = settings.fields.getByName(name)
            if (f) settings.fields.remove(f)
        }
        app.save(settings)
    } catch (_) {}
})
