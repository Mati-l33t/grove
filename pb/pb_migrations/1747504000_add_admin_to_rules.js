/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    
    const rule = (base) => `${base} || @request.auth.record.is_admin = true`

    const events = app.findCollectionByNameOrId("events")
    events.deleteRule = rule("@request.auth.id = user")
    app.save(events)

    const lists = app.findCollectionByNameOrId("lists")
    lists.updateRule = rule("@request.auth.id = user")
    lists.deleteRule = rule("@request.auth.id = user")
    app.save(lists)

    const mealPlans = app.findCollectionByNameOrId("meal_plans")
    mealPlans.updateRule = rule("@request.auth.id = user")
    mealPlans.deleteRule = rule("@request.auth.id = user")
    app.save(mealPlans)

    const recipes = app.findCollectionByNameOrId("recipes")
    recipes.updateRule = rule("@request.auth.id = user")
    recipes.deleteRule = rule("@request.auth.id = user")
    app.save(recipes)
}, (db) => {
    

    const events = app.findCollectionByNameOrId("events")
    events.deleteRule = "@request.auth.id = user"
    app.save(events)

    const lists = app.findCollectionByNameOrId("lists")
    lists.updateRule = "@request.auth.id = user"
    lists.deleteRule = "@request.auth.id = user"
    app.save(lists)

    const mealPlans = app.findCollectionByNameOrId("meal_plans")
    mealPlans.updateRule = "@request.auth.id = user"
    mealPlans.deleteRule = "@request.auth.id = user"
    app.save(mealPlans)

    const recipes = app.findCollectionByNameOrId("recipes")
    recipes.updateRule = "@request.auth.id = user"
    recipes.deleteRule = "@request.auth.id = user"
    app.save(recipes)
})
