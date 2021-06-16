import { Request, Response } from 'express'

import { accessCookie, refreshCookie } from '../cookies'
import { JwtService, transferToken } from '../jwt'
import { createJwtConfig } from '../jwtConfig'
import { RefreshTokenManager } from '../refreshToken'
import { validateString } from '../util/validate'

export default async function transfer(req: Request, res: Response) {
    try {
        const encodedToken = validateString(req.body.token)
        if (!encodedToken) {
            throw new Error('No token')
        }

        const token = await transferToken(encodedToken)

        // TODO simplify config/service setup
        const jwtConfig = await createJwtConfig()
        const jwtService = JwtService.create(jwtConfig)
        const refreshTokenManager = RefreshTokenManager.create(jwtService)

        const accessToken = await jwtService.signAccessToken(token)
        const refreshToken = await refreshTokenManager.createSession(token)

        accessCookie.set(res, accessToken)
        refreshCookie.set(res, refreshToken)

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
