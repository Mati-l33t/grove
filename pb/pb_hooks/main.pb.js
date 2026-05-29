/// <reference path="../pb_data/types.d.ts" />

// Reject URLs that point at private/loopback addresses to prevent SSRF.
function isUrlSafe(rawUrl) {
    if (typeof rawUrl !== "string") return false
    if (!/^https?:\/\//i.test(rawUrl)) return false
    var m = rawUrl.match(/^https?:\/\/([^\/:\?#\[\]]+)/i)
    if (!m) return false
    var host = m[1].toLowerCase()
    if (host === "localhost") return false
    if (host.startsWith("::ffff:")) return false
    if (host === "::1") return false
    var p = host.split(".")
    if (p.length === 4) {
        var a = parseInt(p[0], 10), b = parseInt(p[1], 10)
        if (a === 10 || a === 127 || a === 0) return false
        if (a === 169 && b === 254) return false
        if (a === 172 && b >= 16 && b <= 31) return false
        if (a === 192 && b === 168) return false
    }
    return true
}

routerAdd("GET", "/api/grove/runtime", (c) => {
    const authRecord = c.auth
    if (!authRecord || !authRecord.getBool("is_admin")) {
        return c.json(403, { message: "Forbidden" })
    }
    const runtime = $os.getenv("GROVE_RUNTIME")
    return c.json(200, { runtime: runtime === "docker" ? "docker" : "lxc" })
}, $apis.requireAuth())

routerAdd("POST", "/api/grove/run-update", (c) => {
    const authRecord = c.auth
    if (!authRecord || !authRecord.getBool("is_admin")) {
        return c.json(403, { message: "Forbidden" })
    }

    if ($os.getenv("GROVE_RUNTIME") === "docker") {
        return c.json(409, { runtime: "docker" })
    }

    // pb_data is at <grove>/pb/pb_data, so the grove root is two levels up
    const groveDir = $filepath.join($app.rootDir(), "..", "..")
    const script = $filepath.join(groveDir, "update.sh")

    try {
        // nohup + & detaches the script so it keeps running after PocketBase
        // restarts itself partway through the update
        $os.exec("bash", "-c", "nohup " + script + " > /tmp/grove-update.log 2>&1 &")
    } catch (err) {
        return c.json(500, { message: "Failed to start update: " + String(err) })
    }

    return c.json(200, { status: "started" })
}, $apis.requireAuth())

routerAdd("POST", "/api/grove/test-email", (c) => {
    const authRecord = c.auth
    if (!authRecord || !authRecord.getBool("is_admin")) {
        return c.json(403, { message: "Forbidden" })
    }

    const smtpRecords = $app.findRecordsByFilter("smtp_settings", "id != ''", "", 1, 0)
    if (smtpRecords.length === 0 || !smtpRecords[0].getBool("enabled")) {
        return c.json(400, { message: "Mail is not configured or not enabled." })
    }

    try {
        $app.newMailClient().send(new MailerMessage({
            from: {
                name:    smtpRecords[0].getString("from_name") || "Grove",
                address: smtpRecords[0].getString("from_address"),
            },
            to: [{ address: authRecord.email() }],
            subject: "Grove — test email",
            html: "<p>Your Grove mail server is configured correctly.</p>",
        }))
        return c.json(200, { message: "Test email sent to " + authRecord.email() })
    } catch (err) {
        return c.json(400, { message: String(err) })
    }
}, $apis.requireAuth())

routerAdd("GET", "/api/grove/proxy-image", (c) => {
    var imgUrl = c.requestInfo().query["url"]
    if (!imgUrl) return c.json(400, { message: "url is required" })
    if (!isUrlSafe(imgUrl)) return c.json(400, { message: "url not allowed" })

    var res
    try {
        res = $http.send({
            url: imgUrl,
            method: "GET",
            timeout: 10,
            headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" },
        })
    } catch (e) {
        return c.json(400, { message: "Failed to fetch image" })
    }

    if (res.statusCode !== 200) return c.json(400, { message: "Image not available" })

    var ct = (res.headers["Content-Type"] || res.headers["content-type"] || ["image/jpeg"])[0]
    return c.blob(200, ct, res.raw)
}, $apis.requireAuth())

routerAdd("POST", "/api/grove/import-recipe", (c) => {
    const body = c.requestInfo().body
    const url = body.url
    if (!url || typeof url !== "string") {
        return c.json(400, { message: "url is required" })
    }
    if (!isUrlSafe(url)) return c.json(400, { message: "url not allowed" })

    var res
    try {
        res = $http.send({
            url: url,
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
            timeout: 15,
        })
    } catch (err) {
        return c.json(400, { message: "Could not fetch URL: " + String(err) })
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
        return c.json(400, { message: "URL returned HTTP " + res.statusCode })
    }

    var html = res.raw
    var ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    var m
    var recipe = null

    while ((m = ldRe.exec(html)) !== null && !recipe) {
        try {
            var parsed = JSON.parse(m[1])
            var candidates = Array.isArray(parsed) ? parsed : [parsed]
            for (var i = 0; i < candidates.length && !recipe; i++) {
                var node = candidates[i]
                var types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]]
                if (types.indexOf("Recipe") >= 0) {
                    recipe = node
                } else if (node["@graph"] && Array.isArray(node["@graph"])) {
                    for (var j = 0; j < node["@graph"].length && !recipe; j++) {
                        var g = node["@graph"][j]
                        var gt = Array.isArray(g["@type"]) ? g["@type"] : [g["@type"]]
                        if (gt.indexOf("Recipe") >= 0) recipe = g
                    }
                }
            }
        } catch (e) { /* skip invalid JSON blocks */ }
    }

    if (!recipe) {
        return c.json(404, { message: "No recipe data found on this page. The site may not support recipe import." })
    }

    function parseDuration(dur) {
        if (!dur || typeof dur !== "string") return 0
        var hm = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
        if (!hm) return 0
        return (parseInt(hm[1] || "0", 10) * 60) + parseInt(hm[2] || "0", 10)
    }

    var knownUnits = [
        "g", "kg", "ml", "l", "dl", "cl", "tsp", "tbsp", "cup", "cups",
        "oz", "lb", "lbs", "pinch", "piece", "pieces", "handful",
        "msk", "tsk", "krm", "st",
    ]
    function parseIngredient(text) {
        var t = (text || "").trim()
        var parts = t.split(/\s+/)
        if (parts.length === 0) return { amount: "", unit: "", name: t }
        if (!/^[\d.,\/½¼¾⅓⅔⅛⅜⅝⅞]+$/.test(parts[0])) return { amount: "", unit: "", name: t }
        var amount = parts[0]
        if (parts.length === 1) return { amount: amount, unit: "", name: "" }
        var unitCandidate = parts[1].toLowerCase().replace(/[.,]$/, "")
        if (knownUnits.indexOf(unitCandidate) >= 0) {
            return { amount: amount, unit: parts[1], name: parts.slice(2).join(" ") }
        }
        return { amount: amount, unit: "", name: parts.slice(1).join(" ") }
    }

    var rawIngredients = Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : []
    var ingredients = rawIngredients.map(function(ing) { return parseIngredient(String(ing)) })

    var instructions = ""
    var rawSteps = recipe.recipeInstructions
    if (typeof rawSteps === "string") {
        instructions = rawSteps
    } else if (Array.isArray(rawSteps)) {
        instructions = rawSteps.map(function(step, idx) {
            var text = typeof step === "string" ? step : (step.text || "")
            return (idx + 1) + ". " + text.trim()
        }).join("\n\n")
    }

    var servings = 0
    var yieldRaw = recipe.recipeYield
    if (yieldRaw) {
        var yieldStr = Array.isArray(yieldRaw) ? String(yieldRaw[0]) : String(yieldRaw)
        var yieldMatch = yieldStr.match(/\d+/)
        if (yieldMatch) servings = parseInt(yieldMatch[0], 10)
    }

    var imageUrl = null
    var img = recipe.image
    if (typeof img === "string") imageUrl = img
    else if (Array.isArray(img) && img.length > 0) imageUrl = typeof img[0] === "string" ? img[0] : (img[0].url || null)
    else if (img && typeof img === "object") imageUrl = img.url || null

    return c.json(200, {
        title:        recipe.name || "",
        description:  recipe.description || "",
        ingredients:  ingredients,
        instructions: instructions,
        prep_time:    parseDuration(recipe.prepTime),
        cook_time:    parseDuration(recipe.cookTime),
        servings:     servings,
        image_url:    imageUrl,
    })
}, $apis.requireAuth())

routerAdd("GET", "/api/grove/ai-models", (c) => {
    var aiRecords = $app.findRecordsByFilter("ai_settings", "id != ''", "", 1, 0)
    if (aiRecords.length === 0 || !aiRecords[0].getBool("enabled")) {
        return c.json(200, { models: [], enabled: false, default: "" })
    }
    var s = aiRecords[0]
    var apiUrl = s.getString("api_url").replace(/\/$/, "")
    var apiKey = s.getString("api_key")
    var defaultModel = s.getString("default_model")

    var headers = { "Content-Type": "application/json" }
    if (apiKey) headers["Authorization"] = "Bearer " + apiKey

    try {
        var res = $http.send({ url: apiUrl + "/models", method: "GET", headers: headers, timeout: 10 })
        if (res.statusCode === 200) {
            var data = JSON.parse(res.raw)
            var models = []
            if (data.data && Array.isArray(data.data)) {
                models = data.data.map(function(m) { return m.id }).filter(Boolean).sort()
            }
            if (models.length > 0) {
                return c.json(200, { models: models, enabled: true, default: defaultModel })
            }
        }
    } catch (_) {}

    return c.json(200, { models: defaultModel ? [defaultModel] : [], enabled: true, default: defaultModel })
}, $apis.requireAuth())

routerAdd("POST", "/api/grove/chat", (c) => {
    var authRecord = c.auth
    var body = c.requestInfo().body
    var messages = body.messages || []
    var reqModel = body.model || ""

    var aiRecords = $app.findRecordsByFilter("ai_settings", "id != ''", "", 1, 0)
    if (aiRecords.length === 0 || !aiRecords[0].getBool("enabled")) {
        return c.json(400, { message: "AI assistant is not configured." })
    }
    var s = aiRecords[0]
    var apiUrl = s.getString("api_url").replace(/\/$/, "")
    var apiKey = s.getString("api_key")
    var model = reqModel || s.getString("default_model")

    if (!apiUrl || !model) {
        return c.json(400, { message: "AI assistant is not fully configured." })
    }

    var householdId = ""
    try {
        var u = $app.findRecordById("users", authRecord.id)
        householdId = u.getString("household")
    } catch (_) {}

    var now = new Date()
    var todayStr = now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0")

    var systemPrompt = "You are Grove Assistant, a helpful family organizer. You help users manage their lists, calendar events, meal planning, recipes, and school data for their children. Today is " + todayStr + ". Use the available tools to take real actions when asked. Be concise and friendly."

    var tools = [
        {
            type: "function",
            function: {
                name: "get_members",
                description: "Get household members. Call this before assigning or sharing with specific people so you know their names and IDs.",
                parameters: { type: "object", properties: {}, required: [] }
            }
        },
        {
            type: "function",
            function: {
                name: "get_lists",
                description: "Get the user's active lists. Call this first to find list IDs before adding items.",
                parameters: { type: "object", properties: {}, required: [] }
            }
        },
        {
            type: "function",
            function: {
                name: "create_list",
                description: "Create a new list for the user",
                parameters: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "The list name" },
                        type: { type: "string", enum: ["todo", "shopping"], description: "todo for task lists, shopping for grocery/shopping lists" },
                        assigned_to: { type: "string", description: "Member name to assign the list to (optional). Call get_members first." },
                        visibility: { type: "string", enum: ["private", "household", "members"], description: "Who can see the list. private = only you, household = everyone, members = specific people." },
                        share_with: { type: "array", items: { type: "string" }, description: "Member names to share with when visibility is 'members'." }
                    },
                    required: ["name", "type"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "get_list_items",
                description: "Get the items in a specific list",
                parameters: {
                    type: "object",
                    properties: {
                        list_id: { type: "string", description: "The list ID from get_lists" }
                    },
                    required: ["list_id"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "add_list_item",
                description: "Add an item to an existing list",
                parameters: {
                    type: "object",
                    properties: {
                        list_id: { type: "string", description: "The list ID from get_lists" },
                        text: { type: "string", description: "The item text" }
                    },
                    required: ["list_id", "text"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "check_list_item",
                description: "Mark a list item as checked or unchecked",
                parameters: {
                    type: "object",
                    properties: {
                        item_id: { type: "string", description: "The item ID from get_list_items" },
                        checked: { type: "boolean", description: "true to check, false to uncheck" }
                    },
                    required: ["item_id", "checked"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "delete_list_item",
                description: "Delete an item from a list",
                parameters: {
                    type: "object",
                    properties: {
                        item_id: { type: "string", description: "The item ID from get_list_items" }
                    },
                    required: ["item_id"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "get_today_events",
                description: "Get the user's calendar events for today",
                parameters: { type: "object", properties: {}, required: [] }
            }
        },
        {
            type: "function",
            function: {
                name: "get_upcoming_events",
                description: "Get the user's calendar events for the next N days",
                parameters: {
                    type: "object",
                    properties: {
                        days: { type: "number", description: "Number of days ahead to look, e.g. 7 for the next week" }
                    },
                    required: ["days"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "create_event",
                description: "Create a calendar event",
                parameters: {
                    type: "object",
                    properties: {
                        title: { type: "string", description: "Event title" },
                        description: { type: "string", description: "Optional event description or notes" },
                        location: { type: "string", description: "Optional location" },
                        start: { type: "string", description: "Start datetime in ISO 8601, e.g. 2026-05-17T14:00:00" },
                        end: { type: "string", description: "End datetime in ISO 8601. If omitted defaults to start." },
                        all_day: { type: "boolean", description: "True for all-day events" },
                        reminder_minutes: { type: "number", description: "Minutes before the event to send a reminder. 0 = no reminder. E.g. 60 for 1 hour before." },
                        visibility: { type: "string", enum: ["private", "household", "members"], description: "Who can see the event." },
                        share_with: { type: "array", items: { type: "string" }, description: "Member names to share with when visibility is 'members'." }
                    },
                    required: ["title", "start"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "update_event",
                description: "Edit an existing calendar event. Only include fields you want to change. Call get_today_events or get_upcoming_events first to get the event ID.",
                parameters: {
                    type: "object",
                    properties: {
                        event_id: { type: "string", description: "The event ID" },
                        title: { type: "string" },
                        description: { type: "string" },
                        location: { type: "string" },
                        start: { type: "string", description: "ISO 8601 datetime" },
                        end: { type: "string", description: "ISO 8601 datetime" },
                        all_day: { type: "boolean" },
                        reminder_minutes: { type: "number" },
                        visibility: { type: "string", enum: ["private", "household", "members"] },
                        share_with: { type: "array", items: { type: "string" } }
                    },
                    required: ["event_id"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "delete_event",
                description: "Permanently delete a calendar event",
                parameters: {
                    type: "object",
                    properties: {
                        event_id: { type: "string", description: "The event ID from get_today_events or get_upcoming_events" }
                    },
                    required: ["event_id"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "update_list",
                description: "Edit an existing list. Only include fields you want to change. Call get_lists first to get the list ID.",
                parameters: {
                    type: "object",
                    properties: {
                        list_id: { type: "string", description: "The list ID" },
                        name: { type: "string" },
                        type: { type: "string", enum: ["todo", "shopping"] },
                        visibility: { type: "string", enum: ["private", "household", "members"] },
                        share_with: { type: "array", items: { type: "string" } },
                        assigned_to: { type: "string", description: "Member name to assign to, or empty string to remove assignment" }
                    },
                    required: ["list_id"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "archive_list",
                description: "Archive a list (hides it without deleting it)",
                parameters: {
                    type: "object",
                    properties: {
                        list_id: { type: "string", description: "The list ID from get_lists" }
                    },
                    required: ["list_id"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "delete_list",
                description: "Permanently delete a list and all its items",
                parameters: {
                    type: "object",
                    properties: {
                        list_id: { type: "string", description: "The list ID from get_lists" }
                    },
                    required: ["list_id"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "get_meal_plan",
                description: "Get the meal plan for a date range",
                parameters: {
                    type: "object",
                    properties: {
                        start_date: { type: "string", description: "Start date YYYY-MM-DD (default: today)" },
                        days: { type: "number", description: "Number of days to fetch (default 7)" }
                    },
                    required: []
                }
            }
        },
        {
            type: "function",
            function: {
                name: "set_meal_plan",
                description: "Assign a meal to a specific date and meal type slot",
                parameters: {
                    type: "object",
                    properties: {
                        date: { type: "string", description: "Date in YYYY-MM-DD format" },
                        meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
                        recipe_id: { type: "string", description: "Recipe ID from get_recipes or search_recipes. Use this OR custom_meal." },
                        custom_meal: { type: "string", description: "Free text meal name if no recipe is linked." }
                    },
                    required: ["date", "meal_type"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "clear_meal_slot",
                description: "Remove a meal from a specific date and meal type slot",
                parameters: {
                    type: "object",
                    properties: {
                        date: { type: "string", description: "Date in YYYY-MM-DD format" },
                        meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] }
                    },
                    required: ["date", "meal_type"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "add_recipe_ingredients_to_list",
                description: "Add all ingredients from a recipe to a shopping list. Call get_recipes and get_lists first to get the IDs.",
                parameters: {
                    type: "object",
                    properties: {
                        recipe_id: { type: "string", description: "Recipe ID from get_recipes" },
                        list_id: { type: "string", description: "Shopping list ID from get_lists" }
                    },
                    required: ["recipe_id", "list_id"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "search_recipes",
                description: "Search saved recipes by title, description or tags",
                parameters: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Search term" }
                    },
                    required: ["query"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "suggest_meal_plan",
                description: "Automatically fill meal plan slots with random recipes from the user's collection. Skips slots that already have a meal.",
                parameters: {
                    type: "object",
                    properties: {
                        start_date: { type: "string", description: "Start date YYYY-MM-DD (default: today)" },
                        days: { type: "number", description: "Number of days to fill (default 7)" },
                        meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"], description: "Which meal type to fill (default: dinner)" }
                    },
                    required: []
                }
            }
        },
        {
            type: "function",
            function: {
                name: "get_recipes",
                description: "Get the user's saved recipes",
                parameters: { type: "object", properties: {}, required: [] }
            }
        },
        {
            type: "function",
            function: {
                name: "create_recipe",
                description: "Save a recipe. Use this when the user pastes or dictates a recipe as text — parse it yourself into structured fields before calling this tool.",
                parameters: {
                    type: "object",
                    properties: {
                        title:        { type: "string" },
                        description:  { type: "string" },
                        instructions: { type: "string", description: "Full cooking instructions as plain text" },
                        ingredients:  {
                            type: "array",
                            description: "List of ingredients",
                            items: {
                                type: "object",
                                properties: {
                                    amount: { type: "string", description: "e.g. '2' or '1/2'" },
                                    unit:   { type: "string", description: "e.g. 'cups', 'g', 'tbsp'" },
                                    name:   { type: "string", description: "e.g. 'flour'" }
                                }
                            }
                        },
                        prep_time:  { type: "number", description: "Prep time in minutes" },
                        cook_time:  { type: "number", description: "Cook time in minutes" },
                        servings:   { type: "number" },
                        tags:       { type: "array", items: { type: "string" } },
                        visibility: { type: "string", enum: ["private", "household", "members"] },
                        share_with: { type: "array", items: { type: "string" } }
                    },
                    required: ["title", "ingredients", "instructions"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "add_recipe_from_url",
                description: "Import a recipe from a URL and save it. Fetches the page, extracts structured recipe data, and creates the recipe. Image is not imported.",
                parameters: {
                    type: "object",
                    properties: {
                        url: { type: "string", description: "The full URL of the recipe page" },
                        visibility: { type: "string", enum: ["private", "household", "members"], description: "Who can see the recipe" },
                        share_with: { type: "array", items: { type: "string" }, description: "Member names when visibility is 'members'" }
                    },
                    required: ["url"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "get_weather",
                description: "Get the current weather for any city",
                parameters: {
                    type: "object",
                    properties: {
                        city: { type: "string", description: "City name, e.g. Jakobstad" }
                    },
                    required: ["city"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "get_school_children",
                description: "Get the list of children in the school tracker. Call this first before any other school operations to get child IDs.",
                parameters: { type: "object", properties: {}, required: [] }
            }
        },
        {
            type: "function",
            function: {
                name: "add_school_child",
                description: "Add a new child to the school tracker",
                parameters: {
                    type: "object",
                    properties: {
                        name:        { type: "string", description: "Child's display name" },
                        school_name: { type: "string", description: "School name (optional)" },
                        grade:       { type: "string", description: "Grade or class, e.g. '3rd grade' (optional)" }
                    },
                    required: ["name"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "get_school_schedule",
                description: "Get the recurring weekly school schedule for a child (start/end times per weekday)",
                parameters: {
                    type: "object",
                    properties: {
                        child_id: { type: "string", description: "Child ID from get_school_children" }
                    },
                    required: ["child_id"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "set_school_schedule",
                description: "Set school start and end time for a specific weekday for a child. Pass empty strings for both times to clear that day.",
                parameters: {
                    type: "object",
                    properties: {
                        child_id:   { type: "string", description: "Child ID from get_school_children" },
                        day:        { type: "string", enum: ["monday", "tuesday", "wednesday", "thursday", "friday"] },
                        start_time: { type: "string", description: "Start time HH:MM, e.g. '08:00'. Empty string to clear." },
                        end_time:   { type: "string", description: "End time HH:MM, e.g. '14:30'. Empty string to clear." }
                    },
                    required: ["child_id", "day"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "get_school_lunches",
                description: "Get school lunches for a child for Mon–Fri of the specified week",
                parameters: {
                    type: "object",
                    properties: {
                        child_id:   { type: "string", description: "Child ID from get_school_children" },
                        week_start: { type: "string", description: "Any date in the target week YYYY-MM-DD. Defaults to current week." }
                    },
                    required: ["child_id"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "set_school_lunch",
                description: "Set or clear the school lunch for a child on a specific date. Pass empty string to clear.",
                parameters: {
                    type: "object",
                    properties: {
                        child_id: { type: "string", description: "Child ID from get_school_children" },
                        date:     { type: "string", description: "Date YYYY-MM-DD" },
                        meal:     { type: "string", description: "Meal description, or empty string to clear" }
                    },
                    required: ["child_id", "date", "meal"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "get_school_assignments",
                description: "Get school assignments for a child",
                parameters: {
                    type: "object",
                    properties: {
                        child_id:     { type: "string", description: "Child ID from get_school_children" },
                        include_done: { type: "boolean", description: "Include completed assignments (default false)" }
                    },
                    required: ["child_id"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "add_school_assignment",
                description: "Add a school assignment (test, homework, project, etc.) for a child",
                parameters: {
                    type: "object",
                    properties: {
                        child_id: { type: "string", description: "Child ID from get_school_children" },
                        title:    { type: "string", description: "Assignment title" },
                        subject:  { type: "string", description: "Subject e.g. Math, English (optional)" },
                        type:     { type: "string", enum: ["test", "homework", "project", "other"], description: "Assignment type" },
                        due_date: { type: "string", description: "Due date YYYY-MM-DD (optional)" },
                        notes:    { type: "string", description: "Extra notes (optional)" }
                    },
                    required: ["child_id", "title"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "update_school_assignment",
                description: "Update an existing school assignment. Only include fields you want to change. Call get_school_assignments first to get the ID.",
                parameters: {
                    type: "object",
                    properties: {
                        assignment_id: { type: "string", description: "Assignment ID from get_school_assignments" },
                        title:    { type: "string" },
                        subject:  { type: "string" },
                        type:     { type: "string", enum: ["test", "homework", "project", "other"] },
                        due_date: { type: "string", description: "YYYY-MM-DD or empty to clear" },
                        done:     { type: "boolean", description: "true to mark done, false to unmark" },
                        notes:    { type: "string" }
                    },
                    required: ["assignment_id"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "delete_school_assignment",
                description: "Permanently delete a school assignment",
                parameters: {
                    type: "object",
                    properties: {
                        assignment_id: { type: "string", description: "Assignment ID from get_school_assignments" }
                    },
                    required: ["assignment_id"]
                }
            }
        }
    ]

    function buildListFilter() {
        var base = '(user = "' + authRecord.id + '" || shared_with ~ "' + authRecord.id + '" || assigned_to = "' + authRecord.id + '") && archived = false'
        if (householdId) {
            return '((user = "' + authRecord.id + '" || shared_with ~ "' + authRecord.id + '" || assigned_to = "' + authRecord.id + '") || household = "' + householdId + '") && archived = false'
        }
        return base
    }

    function addDays(dateStr, n) {
        var p = dateStr.split("-")
        var d = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]))
        d.setDate(d.getDate() + n)
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
    }
    function pbDT(dateStr) { return dateStr + " 00:00:00.000Z" }

    function buildMealFilter(startStr, endStr) {
        var base = '(user = "' + authRecord.id + '"'
        if (householdId) base += ' || household = "' + householdId + '"'
        return base + ') && date >= "' + pbDT(startStr) + '" && date < "' + pbDT(endStr) + '"'
    }

    function resolveMemberNames(names) {
        if (!householdId || !names || names.length === 0) return []
        var ids = []
        for (var ni = 0; ni < names.length; ni++) {
            var safeName = String(names[ni]).replace(/['"\\%]/g, "")
            var found = $app.findRecordsByFilter(
                "users",
                'household = "' + householdId + '" && name ~ "' + safeName + '"',
                "", 1, 0
            )
            if (found.length > 0) ids.push(found[0].id)
        }
        return ids
    }

    function applyVisibility(rec, visibility, shareWith) {
        if (visibility === "household" && householdId) {
            rec.set("household", householdId)
            rec.set("shared_with", [])
        } else if (visibility === "members" && shareWith) {
            var ids = resolveMemberNames(Array.isArray(shareWith) ? shareWith : [shareWith])
            rec.set("shared_with", ids)
            rec.set("household", null)
        } else {
            rec.set("household", null)
            rec.set("shared_with", [])
        }
    }

    function buildEventFilter(startStr, endStr) {
        var base = '(user = "' + authRecord.id + '" || shared_with ~ "' + authRecord.id + '")'
        if (householdId) {
            base = '(user = "' + authRecord.id + '" || shared_with ~ "' + authRecord.id + '" || household = "' + householdId + '")'
        }
        return base + ' && start >= "' + startStr + '" && start <= "' + endStr + '"'
    }

    function userCanMutateList(listId) {
        try {
            var l = $app.findRecordById("lists", listId)
            if (l.getString("user") === authRecord.id) return true
            if (householdId && l.getString("household") === householdId) return true
            if (l.getString("assigned_to") === authRecord.id) return true
            var sw = l.get("shared_with")
            return Array.isArray(sw) && sw.indexOf(authRecord.id) >= 0
        } catch (_) { return false }
    }

    function userCanMutateEvent(eventId) {
        try {
            var ev = $app.findRecordById("events", eventId)
            if (ev.getString("user") === authRecord.id) return true
            if (householdId && ev.getString("household") === householdId) return true
            var sw = ev.get("shared_with")
            return Array.isArray(sw) && sw.indexOf(authRecord.id) >= 0
        } catch (_) { return false }
    }

    function userCanMutateSchoolRecord(rec) {
        if (authRecord.getBool("is_admin")) return true
        return rec.getString("user") === authRecord.id
    }

    function userOwnsSchoolChild(childId) {
        try {
            var child = $app.findRecordById("school_children", childId)
            if (authRecord.getBool("is_admin")) return true
            return child.getString("user") === authRecord.id
        } catch (_) { return false }
    }

    function executeTool(name, args) {
        try {
            if (name === "get_members") {
                if (!householdId) return JSON.stringify([])
                var members = $app.findRecordsByFilter(
                    "users", 'household = "' + householdId + '"', "name", 50, 0
                )
                return JSON.stringify(members.map(function(m) {
                    return { id: m.id, name: m.getString("name") }
                }))
            }

            if (name === "get_lists") {
                var lists = $app.findRecordsByFilter("lists", buildListFilter(), "name", 50, 0)
                return JSON.stringify(lists.map(function(l) {
                    return { id: l.id, name: l.getString("name"), type: l.getString("type") }
                }))
            }

            if (name === "create_list") {
                var col = $app.findCollectionByNameOrId("lists")
                var rec = new Record(col)
                rec.set("name", args.name || "New list")
                rec.set("type", args.type === "shopping" ? "shopping" : "todo")
                rec.set("color", "#22c55e")
                rec.set("user", authRecord.id)
                rec.set("archived", false)
                applyVisibility(rec, args.visibility, args.share_with)
                if (args.assigned_to) {
                    var assignee = resolveMemberNames([args.assigned_to])
                    if (assignee.length > 0) rec.set("assigned_to", assignee[0])
                }
                $app.save(rec)
                return JSON.stringify({ id: rec.id, name: rec.getString("name"), type: rec.getString("type") })
            }

            if (name === "get_list_items") {
                var items = $app.findRecordsByFilter(
                    "list_items", 'list = "' + args.list_id + '"', "order,created", 100, 0
                )
                return JSON.stringify(items.map(function(i) {
                    return { id: i.id, text: i.getString("text"), checked: i.getBool("checked") }
                }))
            }

            if (name === "add_list_item") {
                var col = $app.findCollectionByNameOrId("list_items")
                var rec = new Record(col)
                rec.set("list", args.list_id)
                rec.set("text", args.text)
                rec.set("checked", false)
                rec.set("order", 0)
                rec.set("added_by", authRecord.id)
                $app.save(rec)
                return JSON.stringify({ id: rec.id, text: rec.getString("text") })
            }

            if (name === "check_list_item") {
                var rec = $app.findRecordById("list_items", args.item_id)
                if (!userCanMutateList(rec.getString("list"))) return JSON.stringify({ error: "Access denied" })
                rec.set("checked", args.checked)
                $app.save(rec)
                return JSON.stringify({ id: rec.id, checked: rec.getBool("checked") })
            }

            if (name === "delete_list_item") {
                var rec = $app.findRecordById("list_items", args.item_id)
                if (!userCanMutateList(rec.getString("list"))) return JSON.stringify({ error: "Access denied" })
                $app.delete(rec)
                return JSON.stringify({ deleted: args.item_id })
            }

            if (name === "get_today_events") {
                var filter = buildEventFilter(todayStr + " 00:00:00", todayStr + " 23:59:59")
                var events = $app.findRecordsByFilter("events", filter, "start", 50, 0)
                return JSON.stringify(events.map(function(e) {
                    return { id: e.id, title: e.getString("title"), start: e.getString("start"), end: e.getString("end"), all_day: e.getBool("all_day") }
                }))
            }

            if (name === "get_upcoming_events") {
                var days = Math.min(parseInt(args.days) || 7, 90)
                var endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
                var endStr = endDate.getFullYear() + "-" +
                    String(endDate.getMonth() + 1).padStart(2, "0") + "-" +
                    String(endDate.getDate()).padStart(2, "0")
                var filter = buildEventFilter(todayStr + " 00:00:00", endStr + " 23:59:59")
                var events = $app.findRecordsByFilter("events", filter, "start", 100, 0)
                return JSON.stringify(events.map(function(e) {
                    return { id: e.id, title: e.getString("title"), start: e.getString("start"), end: e.getString("end"), all_day: e.getBool("all_day") }
                }))
            }

            if (name === "create_event") {
                var col = $app.findCollectionByNameOrId("events")
                var rec = new Record(col)
                rec.set("title", args.title)
                rec.set("description", args.description || "")
                rec.set("location", args.location || "")
                rec.set("start", args.start)
                rec.set("end", args.end || args.start)
                rec.set("all_day", args.all_day || false)
                rec.set("user", authRecord.id)
                rec.set("recurring", "none")
                rec.set("reminder_minutes", args.reminder_minutes || 0)
                applyVisibility(rec, args.visibility, args.share_with)
                $app.save(rec)
                return JSON.stringify({ id: rec.id, title: rec.getString("title") })
            }

            if (name === "update_event") {
                var rec = $app.findRecordById("events", args.event_id)
                if (!userCanMutateEvent(args.event_id)) return JSON.stringify({ error: "Access denied" })
                if (args.title !== undefined)       rec.set("title", args.title)
                if (args.description !== undefined) rec.set("description", args.description)
                if (args.location !== undefined)    rec.set("location", args.location)
                if (args.start !== undefined)       rec.set("start", args.start)
                if (args.end !== undefined)         rec.set("end", args.end)
                if (args.all_day !== undefined)     rec.set("all_day", args.all_day)
                if (args.reminder_minutes !== undefined) rec.set("reminder_minutes", args.reminder_minutes)
                if (args.visibility !== undefined)  applyVisibility(rec, args.visibility, args.share_with)
                $app.save(rec)
                return JSON.stringify({ id: rec.id, title: rec.getString("title") })
            }

            if (name === "delete_event") {
                if (!userCanMutateEvent(args.event_id)) return JSON.stringify({ error: "Access denied" })
                $app.delete($app.findRecordById("events", args.event_id))
                return JSON.stringify({ deleted: args.event_id })
            }

            if (name === "update_list") {
                if (!userCanMutateList(args.list_id)) return JSON.stringify({ error: "Access denied" })
                var rec = $app.findRecordById("lists", args.list_id)
                if (args.name !== undefined) rec.set("name", args.name)
                if (args.type !== undefined) rec.set("type", args.type)
                if (args.visibility !== undefined) applyVisibility(rec, args.visibility, args.share_with)
                if (args.assigned_to !== undefined) {
                    if (args.assigned_to === "") {
                        rec.set("assigned_to", null)
                    } else {
                        var assignee = resolveMemberNames([args.assigned_to])
                        if (assignee.length > 0) rec.set("assigned_to", assignee[0])
                    }
                }
                $app.save(rec)
                return JSON.stringify({ id: rec.id, name: rec.getString("name") })
            }

            if (name === "archive_list") {
                if (!userCanMutateList(args.list_id)) return JSON.stringify({ error: "Access denied" })
                var rec = $app.findRecordById("lists", args.list_id)
                rec.set("archived", true)
                $app.save(rec)
                return JSON.stringify({ id: rec.id, archived: true })
            }

            if (name === "delete_list") {
                if (!userCanMutateList(args.list_id)) return JSON.stringify({ error: "Access denied" })
                $app.delete($app.findRecordById("lists", args.list_id))
                return JSON.stringify({ deleted: args.list_id })
            }

            if (name === "get_meal_plan") {
                var start = args.start_date || todayStr
                var days = Math.min(parseInt(args.days) || 7, 31)
                var end = addDays(start, days)
                var plans = $app.findRecordsByFilter("meal_plans", buildMealFilter(start, end), "date,meal_type", 100, 0)
                return JSON.stringify(plans.map(function(p) {
                    var rid = p.getString("recipe")
                    var rtitle = ""
                    if (rid) { try { rtitle = $app.findRecordById("recipes", rid).getString("title") } catch (_) {} }
                    return { id: p.id, date: p.getString("date").split(" ")[0], meal_type: p.getString("meal_type"), recipe_id: rid, recipe_title: rtitle, custom_meal: p.getString("custom_meal") }
                }))
            }

            if (name === "set_meal_plan") {
                var existing = $app.findRecordsByFilter(
                    "meal_plans",
                    buildMealFilter(args.date, addDays(args.date, 1)) + ' && meal_type = "' + args.meal_type + '" && user = "' + authRecord.id + '"',
                    "", 1, 0
                )
                var rec
                if (existing.length > 0) {
                    rec = existing[0]
                } else {
                    var col = $app.findCollectionByNameOrId("meal_plans")
                    rec = new Record(col)
                    rec.set("date", pbDT(args.date))
                    rec.set("meal_type", args.meal_type)
                    rec.set("user", authRecord.id)
                    if (householdId) rec.set("household", householdId)
                }
                rec.set("recipe", args.recipe_id || null)
                rec.set("custom_meal", args.custom_meal || "")
                $app.save(rec)
                return JSON.stringify({ date: args.date, meal_type: args.meal_type, saved: true })
            }

            if (name === "clear_meal_slot") {
                var existing = $app.findRecordsByFilter(
                    "meal_plans",
                    buildMealFilter(args.date, addDays(args.date, 1)) + ' && meal_type = "' + args.meal_type + '" && user = "' + authRecord.id + '"',
                    "", 1, 0
                )
                if (existing.length > 0) $app.delete(existing[0])
                return JSON.stringify({ cleared: true, date: args.date, meal_type: args.meal_type })
            }

            if (name === "add_recipe_ingredients_to_list") {
                var recipe = $app.findRecordById("recipes", args.recipe_id)
                var ings = recipe.get("ingredients")
                if (!Array.isArray(ings)) {
                    try { ings = JSON.parse(String(ings)) } catch (_) { ings = [] }
                }
                var col = $app.findCollectionByNameOrId("list_items")
                var added = 0
                for (var ii = 0; ii < ings.length; ii++) {
                    var ing = ings[ii]
                    var text = ((ing.amount || "") + " " + (ing.unit || "") + " " + (ing.name || "")).replace(/\s+/g, " ").trim()
                    if (!text) continue
                    var rec = new Record(col)
                    rec.set("list", args.list_id)
                    rec.set("text", text)
                    rec.set("checked", false)
                    rec.set("order", 0)
                    rec.set("added_by", authRecord.id)
                    $app.save(rec)
                    added++
                }
                return JSON.stringify({ added: added, recipe_title: recipe.getString("title") })
            }

            if (name === "search_recipes") {
                var base = '(user = "' + authRecord.id + '" || shared_with ~ "' + authRecord.id + '")'
                if (householdId) base = '(' + base + ' || household = "' + householdId + '")'
                var q = (args.query || "").replace(/['"\\%]/g, "")
                var filter = base + ' && (title ~ "' + q + '" || description ~ "' + q + '")'
                var recipes = $app.findRecordsByFilter("recipes", filter, "title", 20, 0)
                return JSON.stringify(recipes.map(function(r) {
                    return { id: r.id, title: r.getString("title"), description: r.getString("description"), tags: r.get("tags"), servings: r.getInt("servings") }
                }))
            }

            if (name === "suggest_meal_plan") {
                var base2 = '(user = "' + authRecord.id + '" || shared_with ~ "' + authRecord.id + '")'
                if (householdId) base2 = '(' + base2 + ' || household = "' + householdId + '")'
                var allRecipes = $app.findRecordsByFilter("recipes", base2, "title", 100, 0)
                if (allRecipes.length === 0) return JSON.stringify({ error: "No recipes found to suggest from." })

                for (var si = allRecipes.length - 1; si > 0; si--) {
                    var ri = Math.floor(Math.random() * (si + 1))
                    var tmp = allRecipes[si]; allRecipes[si] = allRecipes[ri]; allRecipes[ri] = tmp
                }

                var start2 = args.start_date || todayStr
                var numDays = Math.min(parseInt(args.days) || 7, 14)
                var mType = args.meal_type || "dinner"
                var col2 = $app.findCollectionByNameOrId("meal_plans")
                var suggestions = []

                for (var di = 0; di < numDays; di++) {
                    var dayStr = addDays(start2, di)
                    var existing2 = $app.findRecordsByFilter(
                        "meal_plans",
                        buildMealFilter(dayStr, addDays(dayStr, 1)) + ' && meal_type = "' + mType + '" && user = "' + authRecord.id + '"',
                        "", 1, 0
                    )
                    if (existing2.length > 0) continue
                    var pick = allRecipes[di % allRecipes.length]
                    var rec2 = new Record(col2)
                    rec2.set("date", pbDT(dayStr))
                    rec2.set("meal_type", mType)
                    rec2.set("recipe", pick.id)
                    rec2.set("custom_meal", "")
                    rec2.set("user", authRecord.id)
                    if (householdId) rec2.set("household", householdId)
                    $app.save(rec2)
                    suggestions.push({ date: dayStr, recipe_title: pick.getString("title") })
                }
                return JSON.stringify({ meal_type: mType, suggestions: suggestions })
            }

            if (name === "get_recipes") {
                var base = '(user = "' + authRecord.id + '" || shared_with ~ "' + authRecord.id + '")'
                if (householdId) base = '(' + base + ' || household = "' + householdId + '")'
                var recipes = $app.findRecordsByFilter("recipes", base, "-created", 50, 0)
                return JSON.stringify(recipes.map(function(r) {
                    return { id: r.id, title: r.getString("title"), tags: r.get("tags") }
                }))
            }

            if (name === "create_recipe") {
                var col = $app.findCollectionByNameOrId("recipes")
                var rec = new Record(col)
                rec.set("title", args.title || "Untitled recipe")
                rec.set("description", args.description || "")
                rec.set("ingredients", args.ingredients || [])
                rec.set("instructions", args.instructions || "")
                rec.set("prep_time", args.prep_time || 0)
                rec.set("cook_time", args.cook_time || 0)
                rec.set("servings", args.servings || 0)
                rec.set("tags", args.tags || [])
                rec.set("user", authRecord.id)
                applyVisibility(rec, args.visibility, args.share_with)
                $app.save(rec)
                return JSON.stringify({ id: rec.id, title: rec.getString("title") })
            }

            if (name === "add_recipe_from_url") {
                if (!isUrlSafe(args.url || "")) return JSON.stringify({ error: "URL not allowed" })
                var fetchRes
                try {
                    fetchRes = $http.send({
                        url: args.url,
                        method: "GET",
                        headers: {
                            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                        },
                        timeout: 15
                    })
                } catch (e) {
                    return JSON.stringify({ error: "Could not fetch URL: " + String(e) })
                }
                if (fetchRes.statusCode < 200 || fetchRes.statusCode >= 300) {
                    return JSON.stringify({ error: "URL returned HTTP " + fetchRes.statusCode })
                }

                var html = fetchRes.raw
                var ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
                var ldMatch
                var recipe = null
                while ((ldMatch = ldRe.exec(html)) !== null && !recipe) {
                    try {
                        var parsed = JSON.parse(ldMatch[1])
                        var candidates = Array.isArray(parsed) ? parsed : [parsed]
                        for (var ci = 0; ci < candidates.length && !recipe; ci++) {
                            var node = candidates[ci]
                            var types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]]
                            if (types.indexOf("Recipe") >= 0) {
                                recipe = node
                            } else if (node["@graph"] && Array.isArray(node["@graph"])) {
                                for (var gi = 0; gi < node["@graph"].length && !recipe; gi++) {
                                    var gt = Array.isArray(node["@graph"][gi]["@type"]) ? node["@graph"][gi]["@type"] : [node["@graph"][gi]["@type"]]
                                    if (gt.indexOf("Recipe") >= 0) recipe = node["@graph"][gi]
                                }
                            }
                        }
                    } catch (_) {}
                }
                if (!recipe) {
                    return JSON.stringify({ error: "No recipe data found on this page." })
                }

                function parseDur(dur) {
                    if (!dur || typeof dur !== "string") return 0
                    var hm = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
                    if (!hm) return 0
                    return (parseInt(hm[1] || "0", 10) * 60) + parseInt(hm[2] || "0", 10)
                }
                var knownU = ["g","kg","ml","l","dl","cl","tsp","tbsp","cup","cups","oz","lb","lbs","pinch","piece","pieces","handful","msk","tsk","krm","st"]
                function parseIng(text) {
                    var t = (text || "").trim()
                    var parts = t.split(/\s+/)
                    if (parts.length === 0 || !/^[\d.,\/½¼¾⅓⅔⅛⅜⅝⅞]+$/.test(parts[0])) return { amount: "", unit: "", name: t }
                    var amt = parts[0]
                    if (parts.length === 1) return { amount: amt, unit: "", name: "" }
                    var uc = parts[1].toLowerCase().replace(/[.,]$/, "")
                    if (knownU.indexOf(uc) >= 0) return { amount: amt, unit: parts[1], name: parts.slice(2).join(" ") }
                    return { amount: amt, unit: "", name: parts.slice(1).join(" ") }
                }

                var ingredients = (Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [])
                    .map(function(i) { return parseIng(String(i)) })

                var instructions = ""
                var rawSteps = recipe.recipeInstructions
                if (typeof rawSteps === "string") {
                    instructions = rawSteps
                } else if (Array.isArray(rawSteps)) {
                    instructions = rawSteps.map(function(step, idx) {
                        var text = typeof step === "string" ? step : (step.text || "")
                        return (idx + 1) + ". " + text.trim()
                    }).join("\n\n")
                }

                var servings = 0
                var yieldRaw = recipe.recipeYield
                if (yieldRaw) {
                    var yieldStr = Array.isArray(yieldRaw) ? String(yieldRaw[0]) : String(yieldRaw)
                    var ym = yieldStr.match(/\d+/)
                    if (ym) servings = parseInt(ym[0], 10)
                }

                var tags = []
                if (recipe.recipeCategory) {
                    tags = Array.isArray(recipe.recipeCategory) ? recipe.recipeCategory : [recipe.recipeCategory]
                }

                var col = $app.findCollectionByNameOrId("recipes")
                var rec = new Record(col)
                rec.set("title", recipe.name || "Imported recipe")
                rec.set("description", recipe.description || "")
                rec.set("ingredients", ingredients)
                rec.set("instructions", instructions)
                rec.set("prep_time", parseDur(recipe.prepTime))
                rec.set("cook_time", parseDur(recipe.cookTime))
                rec.set("servings", servings)
                rec.set("tags", tags)
                rec.set("user", authRecord.id)
                applyVisibility(rec, args.visibility, args.share_with)
                $app.save(rec)
                return JSON.stringify({ id: rec.id, title: rec.getString("title"), ingredients_count: ingredients.length })
            }

            if (name === "get_weather") {
                var geoRes = $http.send({
                    url: "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(args.city) + "&count=1&language=en",
                    method: "GET",
                    timeout: 10
                })
                if (geoRes.statusCode !== 200) return JSON.stringify({ error: "Geocoding service unavailable" })
                var geoData = JSON.parse(geoRes.raw)
                if (!geoData.results || geoData.results.length === 0) {
                    return JSON.stringify({ error: "City not found: " + args.city })
                }
                var loc = geoData.results[0]

                var wxRes = $http.send({
                    url: "https://api.open-meteo.com/v1/forecast?latitude=" + loc.latitude + "&longitude=" + loc.longitude +
                        "&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&wind_speed_unit=ms",
                    method: "GET",
                    timeout: 10
                })
                if (wxRes.statusCode !== 200) return JSON.stringify({ error: "Weather service unavailable" })
                var wxData = JSON.parse(wxRes.raw)
                var cur = wxData.current
                var code = cur.weather_code
                var condition = "Unknown"
                if (code === 0) condition = "Clear sky"
                else if (code <= 3)  condition = "Partly cloudy"
                else if (code <= 48) condition = "Fog"
                else if (code <= 55) condition = "Drizzle"
                else if (code <= 65) condition = "Rain"
                else if (code <= 75) condition = "Snow"
                else if (code <= 82) condition = "Rain showers"
                else if (code <= 86) condition = "Snow showers"
                else if (code >= 95) condition = "Thunderstorm"
                return JSON.stringify({
                    city: loc.name,
                    country: loc.country,
                    temperature: cur.temperature_2m,
                    condition: condition,
                    wind_speed: cur.wind_speed_10m,
                    humidity: cur.relative_humidity_2m
                })
            }

            if (name === "get_school_children") {
                var scFilter = householdId
                    ? '(user = "' + authRecord.id + '" || household = "' + householdId + '")'
                    : 'user = "' + authRecord.id + '"'
                var children = $app.findRecordsByFilter("school_children", scFilter, "name", 50, 0)
                return JSON.stringify(children.map(function(c) {
                    return { id: c.id, name: c.getString("name"), school_name: c.getString("school_name"), grade: c.getString("grade") }
                }))
            }

            if (name === "add_school_child") {
                var col = $app.findCollectionByNameOrId("school_children")
                var rec = new Record(col)
                rec.set("name", args.name || "")
                rec.set("school_name", args.school_name || "")
                rec.set("grade", args.grade || "")
                rec.set("color", "#22c55e")
                rec.set("user", authRecord.id)
                if (householdId) rec.set("household", householdId)
                $app.save(rec)
                return JSON.stringify({ id: rec.id, name: rec.getString("name") })
            }

            if (name === "get_school_schedule") {
                var entries = $app.findRecordsByFilter("school_schedule", 'child = "' + args.child_id + '"', "day", 10, 0)
                var result = {}
                for (var ssi = 0; ssi < entries.length; ssi++) {
                    var se = entries[ssi]
                    result[se.getString("day")] = { start_time: se.getString("start_time"), end_time: se.getString("end_time") }
                }
                return JSON.stringify(result)
            }

            if (name === "set_school_schedule") {
                if (!userOwnsSchoolChild(args.child_id)) return JSON.stringify({ error: "Access denied" })
                var ssExisting = $app.findRecordsByFilter(
                    "school_schedule",
                    'child = "' + args.child_id + '" && day = "' + args.day + '"',
                    "", 1, 0
                )
                var startT = args.start_time || ""
                var endT = args.end_time || ""
                if (!startT && !endT) {
                    if (ssExisting.length > 0) $app.delete(ssExisting[0])
                    return JSON.stringify({ cleared: true, day: args.day })
                }
                var ssRec
                if (ssExisting.length > 0) {
                    ssRec = ssExisting[0]
                } else {
                    var ssCol = $app.findCollectionByNameOrId("school_schedule")
                    ssRec = new Record(ssCol)
                    ssRec.set("child", args.child_id)
                    ssRec.set("day", args.day)
                    ssRec.set("user", authRecord.id)
                    if (householdId) ssRec.set("household", householdId)
                }
                ssRec.set("start_time", startT)
                ssRec.set("end_time", endT)
                $app.save(ssRec)
                return JSON.stringify({ day: args.day, start_time: startT, end_time: endT })
            }

            if (name === "get_school_lunches") {
                var refDate = new Date((args.week_start || todayStr) + "T00:00:00Z")
                var dow = refDate.getUTCDay()
                var toMon = dow === 0 ? 6 : dow - 1
                refDate.setUTCDate(refDate.getUTCDate() - toMon)
                var lunchDates = []
                for (var ldi = 0; ldi < 5; ldi++) {
                    var ld = new Date(refDate)
                    ld.setUTCDate(refDate.getUTCDate() + ldi)
                    lunchDates.push(ld.getUTCFullYear() + "-" + String(ld.getUTCMonth() + 1).padStart(2, "0") + "-" + String(ld.getUTCDate()).padStart(2, "0"))
                }
                var lunchFilter = lunchDates.map(function(d) { return 'date = "' + d + '"' }).join(" || ")
                var lunches = $app.findRecordsByFilter(
                    "school_lunches", 'child = "' + args.child_id + '" && (' + lunchFilter + ')', "date", 10, 0
                )
                var lunchMap = {}
                for (var lmi = 0; lmi < lunches.length; lmi++) {
                    lunchMap[lunches[lmi].getString("date")] = lunches[lmi].getString("meal")
                }
                return JSON.stringify(lunchDates.map(function(d) { return { date: d, meal: lunchMap[d] || "" } }))
            }

            if (name === "set_school_lunch") {
                if (!userOwnsSchoolChild(args.child_id)) return JSON.stringify({ error: "Access denied" })
                var slExisting = $app.findRecordsByFilter(
                    "school_lunches",
                    'child = "' + args.child_id + '" && date = "' + args.date + '"',
                    "", 1, 0
                )
                if (!args.meal || !args.meal.trim()) {
                    if (slExisting.length > 0) $app.delete(slExisting[0])
                    return JSON.stringify({ cleared: true, date: args.date })
                }
                var slRec
                if (slExisting.length > 0) {
                    slRec = slExisting[0]
                } else {
                    var slCol = $app.findCollectionByNameOrId("school_lunches")
                    slRec = new Record(slCol)
                    slRec.set("child", args.child_id)
                    slRec.set("date", args.date)
                    slRec.set("user", authRecord.id)
                    if (householdId) slRec.set("household", householdId)
                }
                slRec.set("meal", args.meal.trim())
                $app.save(slRec)
                return JSON.stringify({ date: args.date, meal: args.meal.trim() })
            }

            if (name === "get_school_assignments") {
                var saFilter = 'child = "' + args.child_id + '"'
                if (!args.include_done) saFilter += " && done = false"
                var assignments = $app.findRecordsByFilter("school_assignments", saFilter, "due_date,title", 100, 0)
                return JSON.stringify(assignments.map(function(a) {
                    return {
                        id: a.id,
                        title: a.getString("title"),
                        subject: a.getString("subject"),
                        type: a.getString("type"),
                        due_date: a.getString("due_date"),
                        done: a.getBool("done"),
                        notes: a.getString("notes")
                    }
                }))
            }

            if (name === "add_school_assignment") {
                var aaCol = $app.findCollectionByNameOrId("school_assignments")
                var aaRec = new Record(aaCol)
                aaRec.set("child", args.child_id)
                aaRec.set("title", args.title || "")
                aaRec.set("subject", args.subject || "")
                aaRec.set("type", args.type || "homework")
                aaRec.set("due_date", args.due_date || "")
                aaRec.set("notes", args.notes || "")
                aaRec.set("done", false)
                aaRec.set("user", authRecord.id)
                if (householdId) aaRec.set("household", householdId)
                $app.save(aaRec)
                return JSON.stringify({ id: aaRec.id, title: aaRec.getString("title") })
            }

            if (name === "update_school_assignment") {
                var uaRec = $app.findRecordById("school_assignments", args.assignment_id)
                if (!userCanMutateSchoolRecord(uaRec)) return JSON.stringify({ error: "Access denied" })
                if (args.title !== undefined)    uaRec.set("title", args.title)
                if (args.subject !== undefined)  uaRec.set("subject", args.subject)
                if (args.type !== undefined)     uaRec.set("type", args.type)
                if (args.due_date !== undefined) uaRec.set("due_date", args.due_date)
                if (args.done !== undefined)     uaRec.set("done", args.done)
                if (args.notes !== undefined)    uaRec.set("notes", args.notes)
                $app.save(uaRec)
                return JSON.stringify({ id: uaRec.id, title: uaRec.getString("title"), done: uaRec.getBool("done") })
            }

            if (name === "delete_school_assignment") {
                var daRec = $app.findRecordById("school_assignments", args.assignment_id)
                if (!userCanMutateSchoolRecord(daRec)) return JSON.stringify({ error: "Access denied" })
                $app.delete(daRec)
                return JSON.stringify({ deleted: args.assignment_id })
            }

            return JSON.stringify({ error: "Unknown tool: " + name })
        } catch (e) {
            return JSON.stringify({ error: String(e) })
        }
    }

    var llmHeaders = { "Content-Type": "application/json" }
    if (apiKey) llmHeaders["Authorization"] = "Bearer " + apiKey

    var allMessages = [{ role: "system", content: systemPrompt }].concat(messages)
    var toolResults = []

    for (var iter = 0; iter < 6; iter++) {
        var llmRes
        try {
            llmRes = $http.send({
                url: apiUrl + "/chat/completions",
                method: "POST",
                headers: llmHeaders,
                body: JSON.stringify({
                    model: model,
                    messages: allMessages,
                    tools: tools,
                    tool_choice: "auto"
                }),
                timeout: 90
            })
        } catch (e) {
            return c.json(500, { message: "Could not reach AI service: " + String(e) })
        }

        if (llmRes.statusCode < 200 || llmRes.statusCode >= 300) {
            return c.json(502, { message: "AI service returned HTTP " + llmRes.statusCode })
        }

        var llmData
        try {
            llmData = JSON.parse(llmRes.raw)
        } catch (e) {
            return c.json(500, { message: "Invalid response from AI service" })
        }

        var choice = llmData.choices && llmData.choices[0]
        if (!choice) return c.json(500, { message: "Empty response from AI service" })

        var assistantMsg = choice.message
        allMessages.push(assistantMsg)

        if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
            return c.json(200, {
                message: assistantMsg.content || "",
                tool_results: toolResults
            })
        }

        for (var t = 0; t < assistantMsg.tool_calls.length; t++) {
            var tc = assistantMsg.tool_calls[t]
            var tcArgs = {}
            try { tcArgs = JSON.parse(tc.function.arguments) } catch (_) {}
            var tcResult = executeTool(tc.function.name, tcArgs)
            toolResults.push({ name: tc.function.name, args: tcArgs, result: tcResult })
            allMessages.push({ role: "tool", tool_call_id: tc.id, content: tcResult })
        }
    }

    return c.json(500, { message: "Too many tool iterations — please try a simpler request." })
}, $apis.requireAuth())

onRecordAfterCreateSuccess((e) => {
    const others = $app.findRecordsByFilter(
        "users",
        'id != "' + e.record.id + '"',
        "",
        1,
        0
    )
    if (others.length === 0) {
        e.record.set("is_admin", true)
        $app.save(e.record)
    }
    return e.next()
}, "users")
