import { v4 } from 'uuid'

import { JwtService } from './jwt'
import { IdToken } from './types/token'

export class RefreshTokenManager {
    public static create(jwtService: JwtService) {
        return new RefreshTokenManager(jwtService)
    }

    private jwtService: JwtService
    public constructor(jwtService: JwtService) {
        this.jwtService = jwtService
    }

    public async createSession(session_name: string, token: IdToken) {
        const session_id = v4()
        const encodedToken = await this.jwtService.signRefreshToken({
            session_id,
            token,
        })
        return encodedToken
    }

    public async refreshSession(
        session_name: string,
        previousEncodedRefreshToken: string
    ) {
        const previousRefreshToken = (await this.jwtService.verifyRefreshToken(
            previousEncodedRefreshToken
        )) as RefreshToken
        if (typeof previousRefreshToken !== 'object') {
            throw new Error('Refresh token was of an unexpected type')
        }
        const { session_id, token } = previousRefreshToken
        if (typeof session_id !== 'string') {
            throw new Error('session_id was of an unexpected type')
        }

        const [encodedAccessToken, encodedRefreshToken] = await Promise.all([
            this.jwtService.signAccessToken(token),
            this.createSession(session_name, token),
        ])

        return { encodedRefreshToken, encodedAccessToken }
    }
}

export interface Session {
    session_id: string
    session_name: string
    jwt: string
    creation: number
}

export interface RefreshToken {
    session_id: string
    token: IdToken
}
