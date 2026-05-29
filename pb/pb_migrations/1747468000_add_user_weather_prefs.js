/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const col = app.findCollectionByNameOrId("users")
    col.fields.addMarshaledJSON(JSON.stringify({ name: "show_weather", type: "bool" }))
    col.fields.addMarshaledJSON(JSON.stringify({ name: "weather_unit", type: "select", maxSelect: 1, values: ["celsius", "fahrenheit"] }))
    app.save(col)
}, (app) => {
    try {
        const col = app.findCollectionByNameOrId("users")
        const sw = col.fields.getByName("show_weather")
        const wu = col.fields.getByName("weather_unit")
        if (sw) col.fields.remove(sw)
        if (wu) col.fields.remove(wu)
        app.save(col)
    } catch (_) {}
})
