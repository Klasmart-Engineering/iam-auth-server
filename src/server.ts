import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import cors, { CorsOptions } from 'cors'
import escapeStringRegexp from 'escape-string-regexp'
import express, { Request, Response } from 'express'
import type http from 'http'
import { decode } from 'jsonwebtoken'
import swaggerUi from 'swagger-ui-express'
import yamljs from 'yamljs'

import config from './config'
import { connectToDB, switchProfile } from './db'
import { decodeAndStandardizeThirdPartyJWT, JwtService } from './jwt'
import { createJwtConfig } from './jwtConfig'
import { RefreshTokenManager } from './refreshToken'
import { validateString } from './util/validate'

if (!config.server.domain) {
    throw new Error(`Please specify the DOMAIN enviroment variable`)
}

const domainRegex = new RegExp(
    `^https://(.*\\.)?${escapeStringRegexp(
        config.server.domain
    )}(:[0-9]{1,5})?$`
)

const corsOptions: CorsOptions = {
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
    maxAge: 60 * 60 * 24, // 1 day
    origin: domainRegex,
}

export class AuthServer {
    public static async create(): Promise<express.Express> {
        const jwtConfig = await createJwtConfig()
        const jwtService = JwtService.create(jwtConfig)
        const tokenManager = RefreshTokenManager.create(jwtService)
        const server = new AuthServer(tokenManager, jwtService)

        const jsonParser = bodyParser.json()

        const app = express()
        app.use(cookieParser())
        app.use(jsonParser)
        app.get('/.well-known/express/server-health', (req, res) => {
            res.status(200)
            res.end()
        })
        app.post(`${config.server.routePrefix}/transfer`, (req, res) =>
            server.transfer(req, res)
        )
        app.all(
            `${config.server.routePrefix}/switch`,
            cors<Request>(corsOptions),
            (req, res) => server.switchProfile(req, res)
        )
        app.all(
            `${config.server.routePrefix}/refresh`,
            cors<Request>(corsOptions),
            (req, res) => server.refresh(req, res)
        )
        app.all(
            `${config.server.routePrefix}/signout`,
            cors<Request>(corsOptions),
            (req, res) => server.signOut(req, res)
        )
        if (config.docs.isEnabled) {
            const apiDocument = yamljs.load('./api.yml')
            app.use(
                `${config.server.routePrefix}/docs`,
                swaggerUi.serve,
                swaggerUi.setup(apiDocument, {
                    customSiteTitle: 'auth-server',
                })
            )
        }
        return app
    }

    private refreshTokenManager: RefreshTokenManager
    private jwtService: JwtService
    private constructor(
        tokenManager: RefreshTokenManager,
        jwtService: JwtService
    ) {
        this.refreshTokenManager = tokenManager
        this.jwtService = jwtService
    }

    private async transfer(req: Request, res: Response) {
        try {
            // TODO: refactor decodeAndStandardizeThirdPartyJWT to split out extraction/decode/standardize logic to separate functions [IAM-506]
            const payload = await decodeAndStandardizeThirdPartyJWT(req)
            const accessToken = await this.jwtService.signAccessToken(payload)
            const refreshToken = await this.refreshTokenManager.createSession(
                payload
            )
            this.setTokenCookies(res, refreshToken, accessToken)

            res.status(200)
            res.end()
            return
        } catch (e) {
            console.error(e)
            res.statusMessage = 'Invalid Token'
            res.status(400)
            res.end()
        }
    }

    private async switchProfile(req: Request, res: Response) {
        try {
            const previousEncodedAccessToken = validateString(
                req.cookies.access
            )
            if (!previousEncodedAccessToken) {
                throw new Error('No token')
            }

            const user_id = validateString(req.body.user_id)
            if (!user_id) {
                res.statusMessage = 'Invalid ID'
                res.status(401).end()
                return
            }
            const previousAccessToken = await this.jwtService.verifyAccessToken(
                previousEncodedAccessToken
            )

            const newToken = await switchProfile(previousAccessToken, user_id)
            const accessToken = await this.jwtService.signAccessToken(newToken)
            const refreshToken = await this.refreshTokenManager.createSession(
                newToken
            )
            this.setTokenCookies(res, refreshToken, accessToken)

            res.status(200)
            res.end()
            return
        } catch (e) {
            console.error(e)
            res.statusMessage = 'Invalid Token'
            res.status(401)
            res.end()
        }
    }

    private async refresh(req: Request, res: Response) {
        try {
            const previousEncodedAccessToken = validateString(
                req.cookies.access
            )
            if (previousEncodedAccessToken) {
                const accessToken = await this.jwtService
                    .verifyAccessToken(previousEncodedAccessToken)
                    .catch((e) => undefined)
                if (accessToken) {
                    res.status(200).json(accessToken).end()
                    return
                }
            }

            const previousEncodedRefreshToken = validateString(
                req.cookies.refresh
            )
            if (!previousEncodedRefreshToken) {
                throw new Error('No token')
            }

            const { encodedAccessToken, encodedRefreshToken } =
                await this.refreshTokenManager.refreshSession(
                    previousEncodedRefreshToken
                )
            this.setTokenCookies(res, encodedRefreshToken, encodedAccessToken)
            if (typeof req.query.redirect === 'string') {
                const url = new URL(req.query.redirect)
                console.log('redirectUrl', url)
                if (url.hostname.match(domainRegex)) {
                    res.redirect(req.query.redirect, 307)
                    return
                }
            }
            const accessToken = decode(encodedAccessToken)

            res.status(200).json(accessToken).end()
        } catch (e) {
            console.error(e)
            res.statusMessage = 'Invalid Token'
            res.status(401)
            res.end()
        }
    }

    private signOut(req: Request, res: Response) {
        try {
            res.clearCookie('access', { domain: config.server.domain })
                .clearCookie('refresh', { path: '/refresh' })
                .status(200)
                .end()
        } catch (e) {
            console.error(e)
            res.status(500).end()
        }
    }

    private setTokenCookies(
        res: Response,
        refreshToken: string,
        accessToken: string
    ) {
        res.cookie('access', accessToken, {
            domain: config.server.domain,
            httpOnly: false,
            maxAge: config.cookies.access.duration * 1000,
            secure: false,
        })
        res.cookie('refresh', refreshToken, {
            path: '/refresh',
            httpOnly: true,
            maxAge: config.cookies.refresh.duration * 1000,
            secure: config.cookies.httpsOnly,
        })
    }
}

export async function startServer() {
    await connectToDB()
    const app = await AuthServer.create()
    return new Promise<http.Server>((resolve, reject) => {
        const port = config.server.port
        const server = app.listen(port, () => {
            console.log(`🌎 Server ready at http://localhost:${port}/`)
            resolve(server)
        })
    })
}
