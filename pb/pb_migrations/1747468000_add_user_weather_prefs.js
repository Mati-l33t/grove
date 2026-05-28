/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const usersCol = dao.findCollectionByNameOrId("users")
    usersCol.schema.addField(new SchemaField({
        name: "show_weather",
        type: "bool",
    }))
    usersCol.schema.addField(new SchemaField({
        name: "weather_unit",
        type: "select",
        options: { maxSelect: 1, values: ["celsius", "fahrenheit"] },
    }))
    dao.saveCollection(usersCol)
}, (db) => {
    const dao = new Dao(db)
    try {
        const usersCol = dao.findCollectionByNameOrId("users")
        const sw = usersCol.schema.getFieldByName("show_weather")
        const wu = usersCol.schema.getFieldByName("weather_unit")
        if (sw) usersCol.schema.removeField(sw.id)
        if (wu) usersCol.schema.removeField(wu.id)
        dao.saveCollection(usersCol)
    } catch (_) {}
})
