/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const householdsId = app.findCollectionByNameOrId("households").id

    const school_children = new Collection({
        type: "base", name: "school_children",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user || @request.auth.is_admin = true",
        deleteRule: "@request.auth.id = user || @request.auth.is_admin = true",
    })
    school_children.fields.add({ name: "name",        type: "text",     required: true })
    school_children.fields.add({ name: "school_name", type: "text" })
    school_children.fields.add({ name: "grade",       type: "text" })
    school_children.fields.add({ name: "color",       type: "text" })
    school_children.fields.add({ name: "user",        type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true,  maxSelect: 1 })
    school_children.fields.add({ name: "household",   type: "relation",                 collectionId: householdsId,      cascadeDelete: false, maxSelect: 1 })
    app.save(school_children)

    const childrenId = app.findCollectionByNameOrId("school_children").id

    const school_schedule = new Collection({
        type: "base", name: "school_schedule",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user || @request.auth.is_admin = true",
        deleteRule: "@request.auth.id = user || @request.auth.is_admin = true",
    })
    school_schedule.fields.add({ name: "child",      type: "relation", required: true, collectionId: childrenId,        cascadeDelete: true,  maxSelect: 1 })
    school_schedule.fields.add({ name: "day",        type: "select",   required: true, maxSelect: 1, values: ["monday","tuesday","wednesday","thursday","friday"] })
    school_schedule.fields.add({ name: "start_time", type: "text" })
    school_schedule.fields.add({ name: "end_time",   type: "text" })
    school_schedule.fields.add({ name: "user",       type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true,  maxSelect: 1 })
    school_schedule.fields.add({ name: "household",  type: "relation",                 collectionId: householdsId,      cascadeDelete: false, maxSelect: 1 })
    app.save(school_schedule)

    const school_lunches = new Collection({
        type: "base", name: "school_lunches",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user || @request.auth.is_admin = true",
        deleteRule: "@request.auth.id = user || @request.auth.is_admin = true",
    })
    school_lunches.fields.add({ name: "child",     type: "relation", required: true, collectionId: childrenId,        cascadeDelete: true,  maxSelect: 1 })
    school_lunches.fields.add({ name: "date",      type: "text",     required: true })
    school_lunches.fields.add({ name: "meal",      type: "text" })
    school_lunches.fields.add({ name: "user",      type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true,  maxSelect: 1 })
    school_lunches.fields.add({ name: "household", type: "relation",                 collectionId: householdsId,      cascadeDelete: false, maxSelect: 1 })
    app.save(school_lunches)

    const school_assignments = new Collection({
        type: "base", name: "school_assignments",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user || @request.auth.is_admin = true",
        deleteRule: "@request.auth.id = user || @request.auth.is_admin = true",
    })
    school_assignments.fields.add({ name: "child",     type: "relation", required: true, collectionId: childrenId,        cascadeDelete: true,  maxSelect: 1 })
    school_assignments.fields.add({ name: "subject",   type: "text" })
    school_assignments.fields.add({ name: "title",     type: "text",     required: true })
    school_assignments.fields.add({ name: "type",      type: "select",   maxSelect: 1, values: ["test","homework","project","other"] })
    school_assignments.fields.add({ name: "due_date",  type: "text" })
    school_assignments.fields.add({ name: "done",      type: "bool" })
    school_assignments.fields.add({ name: "notes",     type: "text" })
    school_assignments.fields.add({ name: "user",      type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true,  maxSelect: 1 })
    school_assignments.fields.add({ name: "household", type: "relation",                 collectionId: householdsId,      cascadeDelete: false, maxSelect: 1 })
    app.save(school_assignments)
}, (app) => {
    for (const name of ["school_assignments", "school_lunches", "school_schedule", "school_children"]) {
        try { app.delete(app.findCollectionByNameOrId(name)) } catch (_) {}
    }
})
