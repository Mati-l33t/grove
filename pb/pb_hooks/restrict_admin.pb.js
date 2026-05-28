/// <reference path="../pb_data/types.d.ts" />

function isPrivateIP(ip) {
    if (!ip) return false

    // Strip IPv6-mapped IPv4 prefix (e.g. ::ffff:192.168.1.1)
    ip = ip.replace(/^::ffff:/i, "")

    if (ip === "::1") return true                          // IPv6 loopback
    if (/^fe[89ab][0-9a-f]/i.test(ip)) return true        // IPv6 link-local fe80::/10
    if (/^f[cd][0-9a-f]{2}/i.test(ip)) return true        // IPv6 unique-local fc00::/7

    const octets = ip.split(".")
    if (octets.length !== 4) return false

    const a = parseInt(octets[0], 10)
    const b = parseInt(octets[1], 10)

    if (a === 127) return true                        // 127.0.0.0/8  loopback
    if (a === 10)  return true                        // 10.0.0.0/8   private
    if (a === 192 && b === 168) return true           // 192.168.0.0/16 private
    if (a === 172 && b >= 16 && b <= 31) return true  // 172.16.0.0/12  private

    return false
}

routerUse((next) => {
    return (c) => {
        const path = c.request().url.path

        if (path === "/_/" || path.startsWith("/_/")) {
            const ip = c.realIP()

            if (!isPrivateIP(ip)) {
                return c.string(403, "Admin panel access is restricted to the local network.")
            }
        }

        return next(c)
    }
})
