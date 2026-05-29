/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // households
    const households = new Collection({
        type: "base", name: "households",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = owner",
        deleteRule: "@request.auth.id = owner",
    })
    households.fields.addMarshaledJSON(JSON.stringify({ name: "name",        type: "text",     required: true }))
    households.fields.addMarshaledJSON(JSON.stringify({ name: "invite_code", type: "text",     required: true }))
    households.fields.addMarshaledJSON(JSON.stringify({ name: "owner",       type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: false, maxSelect: 1 }))
    app.save(households)

    const householdsId = app.findCollectionByNameOrId("households").id

    // events
    const events = new Collection({
        type: "base", name: "events",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user",
        deleteRule: "@request.auth.id = user",
    })
    events.fields.addMarshaledJSON(JSON.stringify({ name: "title",            type: "text",     required: true }))
    events.fields.addMarshaledJSON(JSON.stringify({ name: "description",      type: "text" }))
    events.fields.addMarshaledJSON(JSON.stringify({ name: "start",            type: "date",     required: true }))
    events.fields.addMarshaledJSON(JSON.stringify({ name: "end",              type: "date" }))
    events.fields.addMarshaledJSON(JSON.stringify({ name: "all_day",          type: "bool" }))
    events.fields.addMarshaledJSON(JSON.stringify({ name: "color",            type: "text" }))
    events.fields.addMarshaledJSON(JSON.stringify({ name: "recurring",        type: "select",   maxSelect: 1, values: ["none","daily","weekly","monthly","yearly"] }))
    events.fields.addMarshaledJSON(JSON.stringify({ name: "recurring_end",    type: "date" }))
    events.fields.addMarshaledJSON(JSON.stringify({ name: "reminder_minutes", type: "number" }))
    events.fields.addMarshaledJSON(JSON.stringify({ name: "user",             type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true,  maxSelect: 1 }))
    events.fields.addMarshaledJSON(JSON.stringify({ name: "household",        type: "relation",                 collectionId: householdsId,      cascadeDelete: false, maxSelect: 1 }))
    app.save(events)

    // lists
    const lists = new Collection({
        type: "base", name: "lists",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user",
        deleteRule: "@request.auth.id = user",
    })
    lists.fields.addMarshaledJSON(JSON.stringify({ name: "name",      type: "text",     required: true }))
    lists.fields.addMarshaledJSON(JSON.stringify({ name: "type",      type: "select",   maxSelect: 1, values: ["todo","shopping"] }))
    lists.fields.addMarshaledJSON(JSON.stringify({ name: "icon",      type: "text" }))
    lists.fields.addMarshaledJSON(JSON.stringify({ name: "color",     type: "text" }))
    lists.fields.addMarshaledJSON(JSON.stringify({ name: "user",      type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true,  maxSelect: 1 }))
    lists.fields.addMarshaledJSON(JSON.stringify({ name: "household", type: "relation",                 collectionId: householdsId,      cascadeDelete: false, maxSelect: 1 }))
    lists.fields.addMarshaledJSON(JSON.stringify({ name: "archived",  type: "bool" }))
    app.save(lists)

    const listsId = app.findCollectionByNameOrId("lists").id

    // list_items
    const list_items = new Collection({
        type: "base", name: "list_items",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
    })
    list_items.fields.addMarshaledJSON(JSON.stringify({ name: "list",     type: "relation", required: true, collectionId: listsId,           cascadeDelete: true,  maxSelect: 1 }))
    list_items.fields.addMarshaledJSON(JSON.stringify({ name: "text",     type: "text",     required: true }))
    list_items.fields.addMarshaledJSON(JSON.stringify({ name: "checked",  type: "bool" }))
    list_items.fields.addMarshaledJSON(JSON.stringify({ name: "order",    type: "number" }))
    list_items.fields.addMarshaledJSON(JSON.stringify({ name: "added_by", type: "relation",                 collectionId: "_pb_users_auth_", cascadeDelete: false, maxSelect: 1 }))
    app.save(list_items)

    // recipes
    const recipes = new Collection({
        type: "base", name: "recipes",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user",
        deleteRule: "@request.auth.id = user",
    })
    recipes.fields.addMarshaledJSON(JSON.stringify({ name: "title",        type: "text",     required: true }))
    recipes.fields.addMarshaledJSON(JSON.stringify({ name: "description",  type: "text" }))
    recipes.fields.addMarshaledJSON(JSON.stringify({ name: "ingredients",  type: "json" }))
    recipes.fields.addMarshaledJSON(JSON.stringify({ name: "instructions", type: "text" }))
    recipes.fields.addMarshaledJSON(JSON.stringify({ name: "prep_time",    type: "number" }))
    recipes.fields.addMarshaledJSON(JSON.stringify({ name: "cook_time",    type: "number" }))
    recipes.fields.addMarshaledJSON(JSON.stringify({ name: "servings",     type: "number" }))
    recipes.fields.addMarshaledJSON(JSON.stringify({ name: "image",        type: "file",     maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg","image/png","image/gif","image/webp"] }))
    recipes.fields.addMarshaledJSON(JSON.stringify({ name: "tags",         type: "json" }))
    recipes.fields.addMarshaledJSON(JSON.stringify({ name: "user",         type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true,  maxSelect: 1 }))
    recipes.fields.addMarshaledJSON(JSON.stringify({ name: "household",    type: "relation",                 collectionId: householdsId,      cascadeDelete: false, maxSelect: 1 }))
    app.save(recipes)

    const recipesId = app.findCollectionByNameOrId("recipes").id

    // meal_plans
    const meal_plans = new Collection({
        type: "base", name: "meal_plans",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user",
        deleteRule: "@request.auth.id = user",
    })
    meal_plans.fields.addMarshaledJSON(JSON.stringify({ name: "date",        type: "date",     required: true }))
    meal_plans.fields.addMarshaledJSON(JSON.stringify({ name: "meal_type",   type: "select",   maxSelect: 1, values: ["breakfast","lunch","dinner","snack"] }))
    meal_plans.fields.addMarshaledJSON(JSON.stringify({ name: "recipe",      type: "relation",               collectionId: recipesId,         cascadeDelete: false, maxSelect: 1 }))
    meal_plans.fields.addMarshaledJSON(JSON.stringify({ name: "custom_meal", type: "text" }))
    meal_plans.fields.addMarshaledJSON(JSON.stringify({ name: "user",        type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true,  maxSelect: 1 }))
    meal_plans.fields.addMarshaledJSON(JSON.stringify({ name: "household",   type: "relation",                 collectionId: householdsId,      cascadeDelete: false, maxSelect: 1 }))
    app.save(meal_plans)

    // instance_settings
    const instance_settings = new Collection({
        type: "base", name: "instance_settings",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.is_admin = true",
        updateRule: "@request.auth.is_admin = true",
        deleteRule: "@request.auth.is_admin = true",
    })
    instance_settings.fields.addMarshaledJSON(JSON.stringify({ name: "app_name",          type: "text" }))
    instance_settings.fields.addMarshaledJSON(JSON.stringify({ name: "registration_open", type: "bool" }))
    instance_settings.fields.addMarshaledJSON(JSON.stringify({ name: "default_theme",     type: "select", maxSelect: 1, values: ["dark","light"] }))
    app.save(instance_settings)

    // Extend users: add color, household relation, is_admin
    const usersCol = app.findCollectionByNameOrId("users")
    usersCol.fields.addMarshaledJSON(JSON.stringify({ name: "color",     type: "text" }))
    usersCol.fields.addMarshaledJSON(JSON.stringify({ name: "household", type: "relation", collectionId: householdsId, cascadeDelete: false, maxSelect: 1 }))
    usersCol.fields.addMarshaledJSON(JSON.stringify({ name: "is_admin",  type: "bool" }))
    usersCol.listRule = "@request.auth.id != ''"
    usersCol.viewRule = "@request.auth.id != ''"
    app.save(usersCol)
})
