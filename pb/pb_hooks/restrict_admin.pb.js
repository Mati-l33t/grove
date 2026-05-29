/// <reference path="../pb_data/types.d.ts" />

routerUse((e) => {
    let urlPath = "?"
    try { urlPath = String(e.request.url.path || "") } catch(_) { urlPath = "err" }

    const isAdmin = urlPath.indexOf("/_/") === 0

    if (isAdmin) {
        let ip = ""
        try {
            const xri = String(e.request.header.get("X-Real-Ip") || "")
            const xff = String(e.request.header.get("X-Forwarded-For") || "")
            if (xri) ip = xri.split(",")[0].trim()
            if (!ip && xff) ip = xff.split(",")[0].trim()
            if (!ip) ip = e.remoteIP()
        } catch(_) {}

        // Inline private-IP check — no external function call
        let checkIp = ip
        let priv = (checkIp === "::1")
        if (!priv && checkIp.substring(0, 7).toLowerCase() === "::ffff:") checkIp = checkIp.substring(7)
        if (!priv) {
            const p = checkIp.split(".")
            if (p.length === 4) {
                const a = Number(p[0])
                const b = Number(p[1])
                priv = (a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31))
            }
        }

        console.log("[grove-admin] ADMIN ip=" + ip + " private=" + priv)

        if (!priv) {
            return e.json(403, { code: 403, message: "Admin panel access is restricted to the local network." })
        }
    }

    return e.next()
})
