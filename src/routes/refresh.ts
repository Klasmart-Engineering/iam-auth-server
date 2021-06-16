import { Request, Response } from 'express'
import { decode } from 'jsonwebtoken'

import { domainRegex } from '../config'
import { accessCookie, refreshCookie } from '../cookies'
import { JwtService } from '../jwt'
import { createJwtConfig } from '../jwtConfig'
import { RefreshTokenManager } from '../refreshToken'
import { validateString } from '../util/validate'

export default async function refresh(req: Request, res: Response) {
    try {
        const previousEncodedAccessToken = validateString(req.cookies.access)

        // TODO simplify config/service setup
        const jwtConfig = await createJwtConfig()
        const jwtService = JwtService.create(jwtConfig)
        const refreshTokenManager = new RefreshTokenManager(jwtService)

        if (previousEncodedAccessToken) {
            const accessToken = await jwtService
                .verifyAccessToken(previousEncodedAccessToken)
                .catch((e) => undefined)
            if (accessToken) {
                res.status(200).json(accessToken).end()
                return
            }
        }

        const previousEncodedRefreshToken = validateString(req.cookies.refresh)
        if (!previousEncodedRefreshToken) {
            throw new Error('No token')
        }

        const { encodedAccessToken, encodedRefreshToken } =
            await refreshTokenManager.refreshSession(
                previousEncodedRefreshToken
            )

        accessCookie.set(res, encodedAccessToken)
        refreshCookie.set(res, encodedRefreshToken)

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
