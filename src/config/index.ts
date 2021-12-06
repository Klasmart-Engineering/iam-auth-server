import { defaultDBConfig } from './db'

const DEFAULT_ACCESS_COOKIE_DURATION = 15 * 60 * 1000 // 15 min
const DEFAULT_REFRESH_COOKIE_DURATION = 14 * 24 * 60 * 60 * 1000 // 2 weeks

const config = {
    db: defaultDBConfig,
    server: {
        domain: process.env.DOMAIN || '',
        routePrefix: process.env.ROUTE_PREFIX || '',
        port: process.env.PORT || 8080,
    },
    cookies: {
        access: {
            duration:
                Number(process.env.JWT_ACCESS_TOKEN_DURATION) ||
                DEFAULT_ACCESS_COOKIE_DURATION,
        },
        refresh: {
            duration:
                Number(process.env.JWT_REFRESH_TOKEN_DURATION) ||
                DEFAULT_REFRESH_COOKIE_DURATION,
        },
        httpsOnly: process.env.JWT_COOKIE_ALLOW_HTTP === undefined,
    },
    jwt: {
        issuer: process.env.JWT_ISSUER,
    },
    azureB2C: {
        isEnabled: process.env.AZURE_B2C_ENABLED === 'true',
    },
}

export default config
