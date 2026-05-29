/// <reference path="../pb_data/types.d.ts" />

// PocketBase 0.22+ requires created/updated autodate fields to be explicitly
// defined in the collection schema for sorting and filtering to work.
// The init migration omitted these fields from all base collections.

migrate((app) => {
    const created = {
        hidden: false, id: "autodate2990389176", name: "created",
        onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate",
    }
    const updated = {
        hidden: false, id: "autodate3332085495", name: "updated",
        onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate",
    }

    const names = [
        "households", "events", "lists", "list_items", "recipes", "meal_plans",
        "instance_settings", "push_subscriptions", "ai_settings", "smtp_settings",
        "grove_notification_sent", "school_children", "school_schedule",
        "school_lunches", "school_assignments",
    ]

    for (const name of names) {
        try {
            const col = app.findCollectionByNameOrId(name)
            if (!col.fields.getByName("created")) {
                col.fields.addMarshaledJSON(JSON.stringify(created))
            }
            if (!col.fields.getByName("updated")) {
                col.fields.addMarshaledJSON(JSON.stringify(updated))
            }
            app.save(col)
        } catch (_) {}
    }
}, (app) => {
    // No rollback — removing autodate fields from live data would lose timestamps
})
