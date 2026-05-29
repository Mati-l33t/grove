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
    households.fields.add({ name: "name",        type: "text",     required: true })
    households.fields.add({ name: "invite_code", type: "text",     required: true })
    households.fields.add({ name: "owner",       type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: false, maxSelect: 1 })
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
    events.fields.add({ name: "title",            type: "text",     required: true })
    events.fields.add({ name: "description",      type: "text" })
    events.fields.add({ name: "start",            type: "date",     required: true })
    events.fields.add({ name: "end",              type: "date" })
    events.fields.add({ name: "all_day",          type: "bool" })
    events.fields.add({ name: "color",            type: "text" })
    events.fields.add({ name: "recurring",        type: "select",   maxSelect: 1, values: ["none","daily","weekly","monthly","yearly"] })
    events.fields.add({ name: "recurring_end",    type: "date" })
    events.fields.add({ name: "reminder_minutes", type: "number" })
    events.fields.add({ name: "user",             type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true,  maxSelect: 1 })
    events.fields.add({ name: "household",        type: "relation",                 collectionId: householdsId,      cascadeDelete: false, maxSelect: 1 })
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
    lists.fields.add({ name: "name",      type: "text",     required: true })
    lists.fields.add({ name: "type",      type: "select",   maxSelect: 1, values: ["todo","shopping"] })
    lists.fields.add({ name: "icon",      type: "text" })
    lists.fields.add({ name: "color",     type: "text" })
    lists.fields.add({ name: "user",      type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true,  maxSelect: 1 })
    lists.fields.add({ name: "household", type: "relation",                 collectionId: householdsId,      cascadeDelete: false, maxSelect: 1 })
    lists.fields.add({ name: "archived",  type: "bool" })
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
    list_items.fields.add({ name: "list",     type: "relation", required: true, collectionId: listsId,           cascadeDelete: true,  maxSelect: 1 })
    list_items.fields.add({ name: "text",     type: "text",     required: true })
    list_items.fields.add({ name: "checked",  type: "bool" })
    list_items.fields.add({ name: "order",    type: "number" })
    list_items.fields.add({ name: "added_by", type: "relation",                 collectionId: "_pb_users_auth_", cascadeDelete: false, maxSelect: 1 })
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
    recipes.fields.add({ name: "title",        type: "text",     required: true })
    recipes.fields.add({ name: "description",  type: "text" })
    recipes.fields.add({ name: "ingredients",  type: "json" })
    recipes.fields.add({ name: "instructions", type: "text" })
    recipes.fields.add({ name: "prep_time",    type: "number" })
    recipes.fields.add({ name: "cook_time",    type: "number" })
    recipes.fields.add({ name: "servings",     type: "number" })
    recipes.fields.add({ name: "image",        type: "file",     maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg","image/png","image/gif","image/webp"] })
    recipes.fields.add({ name: "tags",         type: "json" })
    recipes.fields.add({ name: "user",         type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true,  maxSelect: 1 })
    recipes.fields.add({ name: "household",    type: "relation",                 collectionId: householdsId,      cascadeDelete: false, maxSelect: 1 })
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
    meal_plans.fields.add({ name: "date",        type: "date",     required: true })
    meal_plans.fields.add({ name: "meal_type",   type: "select",   maxSelect: 1, values: ["breakfast","lunch","dinner","snack"] })
    meal_plans.fields.add({ name: "recipe",      type: "relation",               collectionId: recipesId,         cascadeDelete: false, maxSelect: 1 })
    meal_plans.fields.add({ name: "custom_meal", type: "text" })
    meal_plans.fields.add({ name: "user",        type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true,  maxSelect: 1 })
    meal_plans.fields.add({ name: "household",   type: "relation",                 collectionId: householdsId,      cascadeDelete: false, maxSelect: 1 })
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
    instance_settings.fields.add({ name: "app_name",          type: "text" })
    instance_settings.fields.add({ name: "registration_open", type: "bool" })
    instance_settings.fields.add({ name: "default_theme",     type: "select", maxSelect: 1, values: ["dark","light"] })
    app.save(instance_settings)

    // Extend users: add color, household relation, is_admin
    const usersCol = app.findCollectionByNameOrId("users")
    usersCol.fields.add({ name: "color",     type: "text" })
    usersCol.fields.add({ name: "household", type: "relation", collectionId: householdsId, cascadeDelete: false, maxSelect: 1 })
    usersCol.fields.add({ name: "is_admin",  type: "bool" })
    usersCol.listRule = "@request.auth.id != ''"
    usersCol.viewRule = "@request.auth.id != ''"
    app.save(usersCol)
})
