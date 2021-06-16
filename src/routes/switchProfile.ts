import { Request, Response } from 'express'

import { accessCookie, refreshCookie } from '../cookies'
import { User } from '../entities/user'
import { JwtService } from '../jwt'
import { createJwtConfig } from '../jwtConfig'
import { RefreshTokenManager } from '../refreshToken'
import { validateString } from '../util/validate'

export default async function switchProfile(req: Request, res: Response) {
    try {
        const previousEncodedAccessToken = validateString(req.cookies.access)
        if (!previousEncodedAccessToken) {
            throw new Error('No token')
        }

        // TODO simplify config/service setup
        const jwtConfig = await createJwtConfig()
        const jwtService = JwtService.create(jwtConfig)
        const refreshTokenManager = new RefreshTokenManager(jwtService)

        const user_id = validateString(req.body.user_id)
        if (!user_id) {
            res.statusMessage = 'Invalid ID'
            res.status(401).end()
            return
        }
        const previousAccessToken = await jwtService.verifyAccessToken(
            previousEncodedAccessToken
        )

        const email = previousAccessToken.email
        const phone = previousAccessToken.phone
        if (!email && !phone) {
            throw new Error(
                'Access token does not contain valid email or phone'
            )
        }

        if (!(await User.exists({ id: user_id, email, phone }))) {
            throw new Error(`User(id: ${user_id}) doesn't exist`)
        }

        const newPayload = {
            id: user_id,
            email: email,
            phone: phone,
        }
        const accessToken = await jwtService.signAccessToken(newPayload)
        const refreshToken = await refreshTokenManager.createSession(newPayload)

        accessCookie.set(res, accessToken)
        refreshCookie.set(res, refreshToken)

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
