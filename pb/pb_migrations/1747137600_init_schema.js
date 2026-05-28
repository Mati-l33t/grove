/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db)

    // households
    {
        const col = new Collection()
        col.name = "households"
        col.type = "base"
        col.listRule = "@request.auth.id != ''"
        col.viewRule = "@request.auth.id != ''"
        col.createRule = "@request.auth.id != ''"
        col.updateRule = "@request.auth.id = owner"
        col.deleteRule = "@request.auth.id = owner"
        col.schema.addField(new SchemaField({
            name: "name", type: "text", required: true,
            options: { min: null, max: null, pattern: "" },
        }))
        col.schema.addField(new SchemaField({
            name: "invite_code", type: "text", required: true,
            options: { min: null, max: null, pattern: "" },
        }))
        col.schema.addField(new SchemaField({
            name: "owner", type: "relation", required: true,
            options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        dao.saveCollection(col)
    }

    const householdsId = dao.findCollectionByNameOrId("households").id

    // events
    {
        const col = new Collection()
        col.name = "events"
        col.type = "base"
        col.listRule = "@request.auth.id != ''"
        col.viewRule = "@request.auth.id != ''"
        col.createRule = "@request.auth.id != ''"
        col.updateRule = "@request.auth.id = user"
        col.deleteRule = "@request.auth.id = user"
        col.schema.addField(new SchemaField({ name: "title", type: "text", required: true }))
        col.schema.addField(new SchemaField({ name: "description", type: "text" }))
        col.schema.addField(new SchemaField({ name: "start", type: "date", required: true }))
        col.schema.addField(new SchemaField({ name: "end", type: "date" }))
        col.schema.addField(new SchemaField({ name: "all_day", type: "bool" }))
        col.schema.addField(new SchemaField({ name: "color", type: "text" }))
        col.schema.addField(new SchemaField({
            name: "recurring", type: "select",
            options: { maxSelect: 1, values: ["none", "daily", "weekly", "monthly", "yearly"] },
        }))
        col.schema.addField(new SchemaField({ name: "recurring_end", type: "date" }))
        col.schema.addField(new SchemaField({ name: "reminder_minutes", type: "number" }))
        col.schema.addField(new SchemaField({
            name: "user", type: "relation", required: true,
            options: { collectionId: "_pb_users_auth_", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        col.schema.addField(new SchemaField({
            name: "household", type: "relation",
            options: { collectionId: householdsId, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        dao.saveCollection(col)
    }

    // lists
    {
        const col = new Collection()
        col.name = "lists"
        col.type = "base"
        col.listRule = "@request.auth.id != ''"
        col.viewRule = "@request.auth.id != ''"
        col.createRule = "@request.auth.id != ''"
        col.updateRule = "@request.auth.id = user"
        col.deleteRule = "@request.auth.id = user"
        col.schema.addField(new SchemaField({ name: "name", type: "text", required: true }))
        col.schema.addField(new SchemaField({
            name: "type", type: "select",
            options: { maxSelect: 1, values: ["todo", "shopping"] },
        }))
        col.schema.addField(new SchemaField({ name: "icon", type: "text" }))
        col.schema.addField(new SchemaField({ name: "color", type: "text" }))
        col.schema.addField(new SchemaField({
            name: "user", type: "relation", required: true,
            options: { collectionId: "_pb_users_auth_", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        col.schema.addField(new SchemaField({
            name: "household", type: "relation",
            options: { collectionId: householdsId, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        col.schema.addField(new SchemaField({ name: "archived", type: "bool" }))
        dao.saveCollection(col)
    }

    const listsId = dao.findCollectionByNameOrId("lists").id

    // list_items
    {
        const col = new Collection()
        col.name = "list_items"
        col.type = "base"
        col.listRule = "@request.auth.id != ''"
        col.viewRule = "@request.auth.id != ''"
        col.createRule = "@request.auth.id != ''"
        col.updateRule = "@request.auth.id != ''"
        col.deleteRule = "@request.auth.id != ''"
        col.schema.addField(new SchemaField({
            name: "list", type: "relation", required: true,
            options: { collectionId: listsId, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        col.schema.addField(new SchemaField({ name: "text", type: "text", required: true }))
        col.schema.addField(new SchemaField({ name: "checked", type: "bool" }))
        col.schema.addField(new SchemaField({ name: "order", type: "number" }))
        col.schema.addField(new SchemaField({
            name: "added_by", type: "relation",
            options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        dao.saveCollection(col)
    }

    // recipes
    {
        const col = new Collection()
        col.name = "recipes"
        col.type = "base"
        col.listRule = "@request.auth.id != ''"
        col.viewRule = "@request.auth.id != ''"
        col.createRule = "@request.auth.id != ''"
        col.updateRule = "@request.auth.id = user"
        col.deleteRule = "@request.auth.id = user"
        col.schema.addField(new SchemaField({ name: "title", type: "text", required: true }))
        col.schema.addField(new SchemaField({ name: "description", type: "text" }))
        col.schema.addField(new SchemaField({ name: "ingredients", type: "json" }))
        col.schema.addField(new SchemaField({ name: "instructions", type: "text" }))
        col.schema.addField(new SchemaField({ name: "prep_time", type: "number" }))
        col.schema.addField(new SchemaField({ name: "cook_time", type: "number" }))
        col.schema.addField(new SchemaField({ name: "servings", type: "number" }))
        col.schema.addField(new SchemaField({
            name: "image", type: "file",
            options: { mimeTypes: ["image/jpeg","image/png","image/gif","image/webp"], thumbs: [], maxSelect: 1, maxSize: 5242880, protected: false },
        }))
        col.schema.addField(new SchemaField({ name: "tags", type: "json" }))
        col.schema.addField(new SchemaField({
            name: "user", type: "relation", required: true,
            options: { collectionId: "_pb_users_auth_", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        col.schema.addField(new SchemaField({
            name: "household", type: "relation",
            options: { collectionId: householdsId, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        dao.saveCollection(col)
    }

    const recipesId = dao.findCollectionByNameOrId("recipes").id

    // meal_plans
    {
        const col = new Collection()
        col.name = "meal_plans"
        col.type = "base"
        col.listRule = "@request.auth.id != ''"
        col.viewRule = "@request.auth.id != ''"
        col.createRule = "@request.auth.id != ''"
        col.updateRule = "@request.auth.id = user"
        col.deleteRule = "@request.auth.id = user"
        col.schema.addField(new SchemaField({ name: "date", type: "date", required: true }))
        col.schema.addField(new SchemaField({
            name: "meal_type", type: "select",
            options: { maxSelect: 1, values: ["breakfast", "lunch", "dinner", "snack"] },
        }))
        col.schema.addField(new SchemaField({
            name: "recipe", type: "relation",
            options: { collectionId: recipesId, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        col.schema.addField(new SchemaField({ name: "custom_meal", type: "text" }))
        col.schema.addField(new SchemaField({
            name: "user", type: "relation", required: true,
            options: { collectionId: "_pb_users_auth_", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        col.schema.addField(new SchemaField({
            name: "household", type: "relation",
            options: { collectionId: householdsId, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        dao.saveCollection(col)
    }

    // instance_settings
    {
        const col = new Collection()
        col.name = "instance_settings"
        col.type = "base"
        col.listRule = "@request.auth.id != ''"
        col.viewRule = "@request.auth.id != ''"
        col.createRule = "@request.auth.record.is_admin = true"
        col.updateRule = "@request.auth.record.is_admin = true"
        col.deleteRule = "@request.auth.record.is_admin = true"
        col.schema.addField(new SchemaField({ name: "app_name", type: "text" }))
        col.schema.addField(new SchemaField({ name: "registration_open", type: "bool" }))
        col.schema.addField(new SchemaField({
            name: "default_theme", type: "select",
            options: { maxSelect: 1, values: ["dark", "light"] },
        }))
        dao.saveCollection(col)
    }

    // Extend users: add color, household relation, is_admin
    {
        const usersCol = dao.findCollectionByNameOrId("users")
        usersCol.schema.addField(new SchemaField({
            name: "color", type: "text",
            options: { min: null, max: null, pattern: "" },
        }))
        usersCol.schema.addField(new SchemaField({
            name: "household", type: "relation",
            options: { collectionId: householdsId, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] },
        }))
        usersCol.schema.addField(new SchemaField({ name: "is_admin", type: "bool" }))
        usersCol.listRule = "@request.auth.id != ''"
        usersCol.viewRule = "@request.auth.id != ''"
        dao.saveCollection(usersCol)
    }
})
