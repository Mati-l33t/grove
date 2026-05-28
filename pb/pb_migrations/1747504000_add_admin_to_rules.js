/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)
    const rule = (base) => `${base} || @request.auth.record.is_admin = true`

    const events = dao.findCollectionByNameOrId("events")
    events.deleteRule = rule("@request.auth.id = user")
    dao.saveCollection(events)

    const lists = dao.findCollectionByNameOrId("lists")
    lists.updateRule = rule("@request.auth.id = user")
    lists.deleteRule = rule("@request.auth.id = user")
    dao.saveCollection(lists)

    const mealPlans = dao.findCollectionByNameOrId("meal_plans")
    mealPlans.updateRule = rule("@request.auth.id = user")
    mealPlans.deleteRule = rule("@request.auth.id = user")
    dao.saveCollection(mealPlans)

    const recipes = dao.findCollectionByNameOrId("recipes")
    recipes.updateRule = rule("@request.auth.id = user")
    recipes.deleteRule = rule("@request.auth.id = user")
    dao.saveCollection(recipes)
}, (db) => {
    const dao = new Dao(db)

    const events = dao.findCollectionByNameOrId("events")
    events.deleteRule = "@request.auth.id = user"
    dao.saveCollection(events)

    const lists = dao.findCollectionByNameOrId("lists")
    lists.updateRule = "@request.auth.id = user"
    lists.deleteRule = "@request.auth.id = user"
    dao.saveCollection(lists)

    const mealPlans = dao.findCollectionByNameOrId("meal_plans")
    mealPlans.updateRule = "@request.auth.id = user"
    mealPlans.deleteRule = "@request.auth.id = user"
    dao.saveCollection(mealPlans)

    const recipes = dao.findCollectionByNameOrId("recipes")
    recipes.updateRule = "@request.auth.id = user"
    recipes.deleteRule = "@request.auth.id = user"
    dao.saveCollection(recipes)
})
