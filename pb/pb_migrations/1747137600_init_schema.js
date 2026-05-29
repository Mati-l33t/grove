/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // households
    app.save(new Collection({
        type: "base",
        name: "households",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = owner",
        deleteRule: "@request.auth.id = owner",
        fields: [
            { name: "name",        type: "text",     required: true },
            { name: "invite_code", type: "text",     required: true },
            { name: "owner",       type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: false, maxSelect: 1 },
        ],
    }))

    const householdsId = app.findCollectionByNameOrId("households").id

    // events
    app.save(new Collection({
        type: "base",
        name: "events",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user",
        deleteRule: "@request.auth.id = user",
        fields: [
            { name: "title",            type: "text",     required: true },
            { name: "description",      type: "text" },
            { name: "start",            type: "date",     required: true },
            { name: "end",              type: "date" },
            { name: "all_day",          type: "bool" },
            { name: "color",            type: "text" },
            { name: "recurring",        type: "select",   maxSelect: 1, values: ["none","daily","weekly","monthly","yearly"] },
            { name: "recurring_end",    type: "date" },
            { name: "reminder_minutes", type: "number" },
            { name: "user",             type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true,  maxSelect: 1 },
            { name: "household",        type: "relation",                 collectionId: householdsId,      cascadeDelete: false, maxSelect: 1 },
        ],
    }))

    // lists
    app.save(new Collection({
        type: "base",
        name: "lists",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user",
        deleteRule: "@request.auth.id = user",
        fields: [
            { name: "name",      type: "text",     required: true },
            { name: "type",      type: "select",   maxSelect: 1, values: ["todo","shopping"] },
            { name: "icon",      type: "text" },
            { name: "color",     type: "text" },
            { name: "user",      type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true,  maxSelect: 1 },
            { name: "household", type: "relation",                 collectionId: householdsId,      cascadeDelete: false, maxSelect: 1 },
            { name: "archived",  type: "bool" },
        ],
    }))

    const listsId = app.findCollectionByNameOrId("lists").id

    // list_items
    app.save(new Collection({
        type: "base",
        name: "list_items",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
            { name: "list",     type: "relation", required: true, collectionId: listsId,            cascadeDelete: true,  maxSelect: 1 },
            { name: "text",     type: "text",     required: true },
            { name: "checked",  type: "bool" },
            { name: "order",    type: "number" },
            { name: "added_by", type: "relation",                 collectionId: "_pb_users_auth_",  cascadeDelete: false, maxSelect: 1 },
        ],
    }))

    // recipes
    app.save(new Collection({
        type: "base",
        name: "recipes",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user",
        deleteRule: "@request.auth.id = user",
        fields: [
            { name: "title",        type: "text",     required: true },
            { name: "description",  type: "text" },
            { name: "ingredients",  type: "json" },
            { name: "instructions", type: "text" },
            { name: "prep_time",    type: "number" },
            { name: "cook_time",    type: "number" },
            { name: "servings",     type: "number" },
            { name: "image",        type: "file",     maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg","image/png","image/gif","image/webp"] },
            { name: "tags",         type: "json" },
            { name: "user",         type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true,  maxSelect: 1 },
            { name: "household",    type: "relation",                 collectionId: householdsId,      cascadeDelete: false, maxSelect: 1 },
        ],
    }))

    const recipesId = app.findCollectionByNameOrId("recipes").id

    // meal_plans
    app.save(new Collection({
        type: "base",
        name: "meal_plans",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user",
        deleteRule: "@request.auth.id = user",
        fields: [
            { name: "date",        type: "date",     required: true },
            { name: "meal_type",   type: "select",   maxSelect: 1, values: ["breakfast","lunch","dinner","snack"] },
            { name: "recipe",      type: "relation",               collectionId: recipesId,         cascadeDelete: false, maxSelect: 1 },
            { name: "custom_meal", type: "text" },
            { name: "user",        type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true,  maxSelect: 1 },
            { name: "household",   type: "relation",                 collectionId: householdsId,      cascadeDelete: false, maxSelect: 1 },
        ],
    }))

    // instance_settings
    app.save(new Collection({
        type: "base",
        name: "instance_settings",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.is_admin = true",
        updateRule: "@request.auth.is_admin = true",
        deleteRule: "@request.auth.is_admin = true",
        fields: [
            { name: "app_name",          type: "text" },
            { name: "registration_open", type: "bool" },
            { name: "default_theme",     type: "select", maxSelect: 1, values: ["dark","light"] },
        ],
    }))

    // Extend users: add color, household relation, is_admin
    const usersCol = app.findCollectionByNameOrId("users")
    usersCol.fields.add({ name: "color",     type: "text" })
    usersCol.fields.add({ name: "household", type: "relation", collectionId: householdsId, cascadeDelete: false, maxSelect: 1 })
    usersCol.fields.add({ name: "is_admin",  type: "bool" })
    usersCol.listRule = "@request.auth.id != ''"
    usersCol.viewRule = "@request.auth.id != ''"
    app.save(usersCol)
})
