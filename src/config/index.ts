import { CorsOptions } from 'cors'
import dotenv from 'dotenv'

import { compileDomainRegex } from '../domain'

dotenv.config({ path: __dirname + '../../.env' })

const config = {
    domain: process.env.DOMAIN || '',
    routePrefix: process.env.ROUTE_PREFIX || '',
    port: process.env.PORT || 8080,
    cookies: {
        access: {
            duration:
                Number(process.env.JWT_ACCESS_TOKEN_DURATION) || 15 * 60 * 1000,
        },
        refresh: {
            duration:
                Number(process.env.JWT_REFRESH_TOKEN_DURATION) ||
                14 * 24 * 60 * 60 * 1000,
        },
        httpsOnly: process.env.JWT_COOKIE_ALLOW_HTTP === undefined,
    },
}

const domainRegex = compileDomainRegex(config.domain)

const corsConfiguration: CorsOptions = {
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
    origin: (origin, callback) => {
        try {
            if (!origin) {
                console.log(origin, false)
                callback(null, false)
                return
            }
            const match = origin.match(domainRegex)
            callback(null, Boolean(match))
        } catch (e) {
            console.log(e)
            callback(e)
        }
    },
}

export { corsConfiguration, config as default, domainRegex }
