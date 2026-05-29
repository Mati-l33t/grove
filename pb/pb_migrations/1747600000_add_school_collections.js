/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const householdsId = app.findCollectionByNameOrId("households").id

    app.save(new Collection({
        type: "base",
        name: "school_children",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user || @request.auth.is_admin = true",
        deleteRule: "@request.auth.id = user || @request.auth.is_admin = true",
        fields: [
            { name: "name",        type: "text",     required: true },
            { name: "school_name", type: "text" },
            { name: "grade",       type: "text" },
            { name: "color",       type: "text" },
            { name: "user",        type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true,  maxSelect: 1 },
            { name: "household",   type: "relation",                 collectionId: householdsId,      cascadeDelete: false, maxSelect: 1 },
        ],
    }))

    const childrenId = app.findCollectionByNameOrId("school_children").id

    app.save(new Collection({
        type: "base",
        name: "school_schedule",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user || @request.auth.is_admin = true",
        deleteRule: "@request.auth.id = user || @request.auth.is_admin = true",
        fields: [
            { name: "child",      type: "relation", required: true, collectionId: childrenId,            cascadeDelete: true,  maxSelect: 1 },
            { name: "day",        type: "select",   required: true, maxSelect: 1, values: ["monday","tuesday","wednesday","thursday","friday"] },
            { name: "start_time", type: "text" },
            { name: "end_time",   type: "text" },
            { name: "user",       type: "relation", required: true, collectionId: "_pb_users_auth_",     cascadeDelete: true,  maxSelect: 1 },
            { name: "household",  type: "relation",                 collectionId: householdsId,          cascadeDelete: false, maxSelect: 1 },
        ],
    }))

    app.save(new Collection({
        type: "base",
        name: "school_lunches",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user || @request.auth.is_admin = true",
        deleteRule: "@request.auth.id = user || @request.auth.is_admin = true",
        fields: [
            { name: "child",     type: "relation", required: true, collectionId: childrenId,            cascadeDelete: true,  maxSelect: 1 },
            { name: "date",      type: "text",     required: true },
            { name: "meal",      type: "text" },
            { name: "user",      type: "relation", required: true, collectionId: "_pb_users_auth_",     cascadeDelete: true,  maxSelect: 1 },
            { name: "household", type: "relation",                 collectionId: householdsId,          cascadeDelete: false, maxSelect: 1 },
        ],
    }))

    app.save(new Collection({
        type: "base",
        name: "school_assignments",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user || @request.auth.is_admin = true",
        deleteRule: "@request.auth.id = user || @request.auth.is_admin = true",
        fields: [
            { name: "child",     type: "relation", required: true, collectionId: childrenId,            cascadeDelete: true,  maxSelect: 1 },
            { name: "subject",   type: "text" },
            { name: "title",     type: "text",     required: true },
            { name: "type",      type: "select",   maxSelect: 1, values: ["test","homework","project","other"] },
            { name: "due_date",  type: "text" },
            { name: "done",      type: "bool" },
            { name: "notes",     type: "text" },
            { name: "user",      type: "relation", required: true, collectionId: "_pb_users_auth_",     cascadeDelete: true,  maxSelect: 1 },
            { name: "household", type: "relation",                 collectionId: householdsId,          cascadeDelete: false, maxSelect: 1 },
        ],
    }))
}, (app) => {
    for (const name of ["school_assignments", "school_lunches", "school_schedule", "school_children"]) {
        try { app.delete(app.findCollectionByNameOrId(name)) } catch (_) {}
    }
})
