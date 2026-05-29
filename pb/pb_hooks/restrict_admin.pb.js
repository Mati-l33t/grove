/// <reference path="../pb_data/types.d.ts" />

routerUse((next) => {
    return (c) => {
        let routePath = "?"
        let urlPath = "?"
        try { routePath = String(c.path()) }                 catch(e) { routePath = "err" }
        try { urlPath = String(c.request().url.path || "") } catch(e) { urlPath = "err" }

        const isAdmin = routePath.indexOf("/_/") === 0 || urlPath.indexOf("/_/") === 0

        if (isAdmin) {
            let raddr = ""
            let xri   = ""
            let xff   = ""
            try { raddr = String(c.request().remoteAddr || "") }                     catch(e) { raddr = "" }
            try { xri   = String(c.request().header.get("X-Real-Ip") || "") }       catch(e) { xri = "" }
            try { xff   = String(c.request().header.get("X-Forwarded-For") || "") } catch(e) { xff = "" }

            let ip = ""
            if (xri) ip = xri.split(",")[0].trim()
            if (!ip && xff) ip = xff.split(",")[0].trim()
            if (!ip) {
                const ci = raddr.lastIndexOf(":")
                ip = ci !== -1 ? raddr.substring(0, ci) : raddr
            }

            // Inline private-IP check — no external function call
            let priv = (ip === "::1")
            if (!priv && ip.substring(0, 7).toLowerCase() === "::ffff:") ip = ip.substring(7)
            if (!priv) {
                const p = ip.split(".")
                if (p.length === 4) {
                    const a = Number(p[0])
                    const b = Number(p[1])
                    priv = (a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31))
                }
            }

            console.log("[grove-admin] ADMIN ip=" + ip + " private=" + priv)

            if (!priv) {
                return c.json(403, { code: 403, message: "Admin panel access is restricted to the local network." })
            }
        }

        return next(c)
    }
})
