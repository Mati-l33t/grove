/// <reference path="../pb_data/types.d.ts" />

// @request.auth.record.is_admin is inconsistent with the rest of the codebase
// and evaluates incorrectly in PocketBase 0.39. Replace with @request.auth.is_admin
// across all deleteRules and updateRules that used the old form.

migrate((app) => {
    const fixes = [
        { name: "events",     rules: ["deleteRule"] },
        { name: "lists",      rules: ["deleteRule", "updateRule"] },
        { name: "meal_plans", rules: ["deleteRule", "updateRule"] },
    ]

    for (const { name, rules } of fixes) {
        try {
            const col = app.findCollectionByNameOrId(name)
            for (const rule of rules) {
                if (col[rule] && col[rule].includes("record.is_admin")) {
                    col[rule] = col[rule].replace(/@request\.auth\.record\.is_admin/g, "@request.auth.is_admin")
                }
            }
            app.save(col)
        } catch (_) {}
    }
}, (app) => {
    const fixes = [
        { name: "events",     rules: ["deleteRule"] },
        { name: "lists",      rules: ["deleteRule", "updateRule"] },
        { name: "meal_plans", rules: ["deleteRule", "updateRule"] },
    ]

    for (const { name, rules } of fixes) {
        try {
            const col = app.findCollectionByNameOrId(name)
            for (const rule of rules) {
                if (col[rule] && col[rule].includes("@request.auth.is_admin")) {
                    col[rule] = col[rule].replace(/@request\.auth\.is_admin/g, "@request.auth.record.is_admin")
                }
            }
            app.save(col)
        } catch (_) {}
    }
})
