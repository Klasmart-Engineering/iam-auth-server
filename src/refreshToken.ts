import { v4 } from "uuid";
import { Client, DseClientOptions, mapping } from 'cassandra-driver';
import { IdToken, refreshTokenDuration, signAccessToken, signRefreshToken, verifyRefreshToken } from "./jwt";



export class RefreshTokenManager {
    public static async create() {
        return new RefreshTokenManager()
    }

    public constructor() {}

    public async createSession(session_name: string, token: IdToken) {
        const session_id = v4()
        const encodedToken = await signRefreshToken({session_id, token}) 
        return encodedToken
    }

    public async refreshSession(session_name: string, previousEncodedRefreshToken: string) {
        const previousRefreshToken = await verifyRefreshToken(previousEncodedRefreshToken) as RefreshToken
        if(typeof previousRefreshToken !== "object") { throw new Error("Refresh token was of an unexpected type") }
        const { session_id, token } = previousRefreshToken
        if(typeof session_id !== "string") { throw new Error("session_id was of an unexpected type")}

        const [
            encodedAccessToken,
            encodedRefreshToken
        ] = await Promise.all([
            signAccessToken(token),
            this.createSession(session_name, token),
        ]) 

        return { encodedRefreshToken, encodedAccessToken }
    }
}

export interface Session {
    session_id: string,
    session_name: string,
    jwt: string,
    creation: number,
}

export interface RefreshToken {
    session_id: string,
    token: IdToken
}