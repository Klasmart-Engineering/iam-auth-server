import { sign, Secret, SignOptions } from "jsonwebtoken"
import { readFileSync } from "fs"
import { v5 } from "uuid"

import jwksClient from "jwks-rsa"
import { decode, JwtHeader, verify, VerifyErrors } from "jsonwebtoken"
import { createHash } from "crypto"
import { retrieveJWTKeys } from "./jwtKeyRetriever"

export const accessTokenDuration = Number(process.env.JWT_ACCESS_TOKEN_DURATION) || 15*60*1000
export const refreshTokenDuration = Number(process.env.JWT_REFRESH_TOKEN_DURATION) || 14*24*60*60*1000
export const httpsOnlyCookie = process.env.JWT_COOKIE_ALLOW_HTTP === undefined

const issuer = process.env.JWT_ISSUER
const domain = process.env.DOMAIN
let config: { secretOrPrivateKey: Secret, accessTokenOptions: SignOptions, secretOrPublicKey: Secret, refreshTokenOptions: SignOptions }


export function verifyAccessToken(encodedToken: string) {
    return new Promise<any>((resolve, reject) => {
        verify(
            encodedToken,
            config.secretOrPublicKey,
            config.accessTokenOptions,
            (err, decoded) => {
                if (err) { reject(err); return }
                if (decoded) { resolve(decoded); return }
                reject("Unexpected error, token validation did not succeed but did not return an error")
            }
        )
    })
}
export function verifyRefreshToken(encodedToken: string) {
    return new Promise<any>((resolve, reject) => {
        verify(
            encodedToken,
            config.secretOrPublicKey,
            config.refreshTokenOptions,
            (err, decoded) => {
                if (err) { reject(err); return }
                if (decoded) { resolve(decoded); return }
                reject("Unexpected error, token validation did not succeed but did not return an error")
            }
        )
    })
}
export function signAccessToken(token: IdToken) {
    return signJWT(token, config.secretOrPrivateKey, config.accessTokenOptions)
}

export function signRefreshToken(refreshToken: object) {
    return signJWT(refreshToken, config.secretOrPrivateKey, config.refreshTokenOptions)
}

export async function signJWT(token: Object, secret: Secret, options: SignOptions) {
    return new Promise<string>((resolve, reject) => {
        sign(token, secret, options, (err, encoded) => {
            if (encoded) {
                resolve(encoded)
            } else {
                reject(err)
            }
        })
    })
}

export async function jwtInit() {
    let algorithm: string
    let secretOrPrivateKey: Secret
    let secretOrPublicKey: Secret

    const awsSecretName = process.env.AWS_SECRET_NAME
    if (awsSecretName) {
        const keys = await retrieveJWTKeys(awsSecretName)
        algorithm = keys?.algorithm
        secretOrPrivateKey = keys?.privateKey
        secretOrPublicKey = keys?.publicKey
    }
    else {
        const algorithm = process.env.JWT_ALGORITHM

        switch (algorithm) {
            case "HS256":
            case "HS384":
            case "HS512":
                if (process.env.JWT_PRIVATE_KEY || process.env.JWT_PRIVATE_KEY_FILENAME) {
                    throw new Error(`JWT configuration error - can not use '${algorithm}' algorithm with private key, please set JWT_SECRET enviroment variable`)
                }
                if (process.env.JWT_SECRET) {
                    secretOrPrivateKey = process.env.JWT_SECRET
                    secretOrPublicKey = process.env.JWT_SECRET
                }
            case "RS256":
            case "RS384":
            case "RS512":
            case "ES256":
            case "ES384":
            case "ES512":
            case "PS256":
            case "PS384":
            case "PS512":
                if (process.env.JWT_SECRET) {
                    throw new Error(`JWT configuration error - can not use '${algorithm}' algorithm with jwt secret key, please set JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_FILENAME enviroment variable`)
                }
                if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PRIVATE_KEY_FILENAME) {
                    throw new Error(`JWT configuration error - please use either JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_FILENAME not both`)
                }
                if (process.env.JWT_PUBLIC_KEY_FILENAME && process.env.JWT_PUBLIC_KEY) {
                    throw new Error(`JWT configuration error - please use either JWT_PUBLIC_KEY_FILENAME or JWT_PUBLIC_KEY not both`)
                }
                const privateKey = process.env.JWT_PRIVATE_KEY_FILENAME ? readFileSync(process.env.JWT_PRIVATE_KEY_FILENAME) : process.env.JWT_PRIVATE_KEY
                if (!privateKey) {
                    throw new Error(`JWT configuration error - please use either JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_FILENAME to specify private key`)
                }
                const publicKey = process.env.JWT_PUBLIC_KEY_FILENAME ? readFileSync(process.env.JWT_PUBLIC_KEY_FILENAME) : process.env.JWT_PUBLIC_KEY
                if (!publicKey) {
                    throw new Error(`JWT configuration error - please use either JWT_PUBLIC_KEY_FILENAME or JWT_PUBLIC_KEY to specify public key`)
                }
                secretOrPrivateKey = process.env.JWT_PRIVATE_KEY_PASSPHRASE
                    ? { key: privateKey, passphrase: process.env.JWT_PRIVATE_KEY_PASSPHRASE }
                    : privateKey
                secretOrPublicKey = publicKey
            default:
                throw new Error("JWT Token not configured")
        }
    }

    const accessTokenOptions = {
        algorithm,
        expiresIn: accessTokenDuration,
        issuer,
        noTimestamp: true,
    } as SignOptions

    const refreshTokenOptions = {
        algorithm,
        issuer,
        expiresIn: refreshTokenDuration,
        subject: "refresh"
    } as SignOptions

    config = {
        secretOrPrivateKey,
        accessTokenOptions,
        secretOrPublicKey,
        refreshTokenOptions,
    }
}

export interface IdToken {
    id: string,
    email?: string,
    name?: string,
}

export async function transferToken(encodedToken: string): Promise<IdToken> {
    const { header, payload } = decode(encodedToken, { complete: true }) as { header: JwtHeader, payload: any }
    const issuer = payload.iss
    const keyId = typeof header.kid === "string" ? header.kid : undefined

    if (typeof issuer !== "string") { throw new Error("Unknown issuer"); }

    const config = issuers.get(issuer)
    if (!config) { throw new Error(`Unknown Issuer(${issuer})`) }

    const key = await config.getPublicKeyOrSecret(keyId)
    if (!key) { throw new Error(`Unable to get verification secret or public key for Issuer(${payload.iss}) and KeyId(${header.kid})`) }

    return new Promise<IdToken>((resolve, reject) => {
        verify(
            encodedToken,
            key,
            {}, //TODO ALGORITHMS
            (err: VerifyErrors | null, decoded: object | undefined) => {
                if (err) { reject(err); return }
                if (decoded) {
                    try {
                        const token = config.createToken(decoded)
                        resolve(token)
                        return;
                    } catch (e) {
                        reject(e);
                        return
                    }
                }
                reject("Unexpected error, token validation did not succeed but did not return an error")
            },
        )
    })
}

export interface IssuerConfig {
    getPublicKeyOrSecret(keyId?: string): Promise<Secret>
    createToken(token: object): IdToken
}

class GoogleIssuerConfig implements IssuerConfig {
    private client = jwksClient({
        strictSsl: true,
        jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
    })
    constructor() {}

    public async getPublicKeyOrSecret(keyId?: string) {
        if (!keyId) { throw new Error(`Unable to get public key for Issuer(accounts.google.com) due to missing keyId(${keyId})`) }
        const response = await this.client.getSigningKeyAsync(keyId)
        return response.getPublicKey()
    }
    public createToken(token: any) {
        function givenName() {
            if (typeof token.given_name === "string") {
                return token.given_name.trim()
            }
            return undefined
        }
        function familyName() {
            if (typeof token.family_name === "string") {
                return token.family_name.trim()
            }
            return undefined
        }
        function name() {
            const given_name = givenName()
            const family_name = familyName()
            if (given_name&&family_name) { return `${given_name} ${family_name}` }
            if (given_name) { return given_name }
            if (family_name) { return family_name }
            return undefined
        }

        const email = token.email
        if (!email || typeof email !== "string") { throw new Error("No Email") }
        const id = accountUUID(email)

        return {
            id,
            email,
            given_name: givenName(),
            family_name: familyName(),
            name: name(),
        }
    }
}

class BadanamuIssuerConfig implements IssuerConfig {
    private publicKeyOrSecret: Secret

    constructor(publicKeyOrSecret: Secret) {
        this.publicKeyOrSecret = publicKeyOrSecret
    }
    public async getPublicKeyOrSecret(keyId?: string) {
        return this.publicKeyOrSecret
    }
    public createToken(token: any) {
        function name() {
            if (typeof token.name === "string") { return token.name }
            return undefined
        }

        const email = token.em
        if (!email || typeof email !== "string") { throw new Error("No Email") }
        const id = accountUUID(email)

        return {
            id,
            email,
            name: name(),
        }
    }
}

class StandardIssuerConfig implements IssuerConfig {
    private publicKeyOrSecret: Secret

    constructor(publicKeyOrSecret: Secret) {
        this.publicKeyOrSecret = publicKeyOrSecret
    }
    public async getPublicKeyOrSecret(keyId?: string) {
        return this.publicKeyOrSecret
    }
    public createToken(token: any) {
        function name() {
            if (typeof token.name === "string") { return token.name }
            return undefined
        }

        const email = token.email
        if (!email || typeof email !== "string") { throw new Error("No Email") }
        const id = accountUUID(email)

        return {
            id,
            email,
            name: name(),
        }
    }
}



const issuers = new Map<string, IssuerConfig>([
    ["accounts.google.com", new GoogleIssuerConfig()],
    ["Badanamu AMS",
        new BadanamuIssuerConfig(
            `-----BEGIN PUBLIC KEY-----
MIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgHGWLk3zzoWJ6nJhHEE7LtM9LCa1
8OSdVQPwvrFxBUTRHz0Hl+qdNMNHJIJkj9NEjL+kaRo0XxsGdrR6NGxL2/WiX3Zf
H+xCTJ4Wl3pIc3Lrjc8SJ7OcS5PmLc0uXpb0bDGen9KcI3oVe770y6mT8PWIgqjP
wTT7osO/AOfbIsktAgMBAAE=
-----END PUBLIC KEY-----`,
        )],
    ["KidsLoopChinaUser-live",
        new StandardIssuerConfig(
            `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDAGN9KAcc61KBz8EQAH54bFwGK
6PEQNVXXlsObwFd3Zos83bRm+3grzP0pKWniZ6TL/y7ZgFh4OlUMh9qJjIt6Lpz9
l4uDxkgDDrKHn8IrflBxjJKq0OyXqwIYChnFoi/HGjcRtJhi8oTFToSvKMqIeUuL
mWmLA8nXdDnMl7zwoQIDAQAB
-----END PUBLIC KEY-----`,
        )]
    /*
    ["KidsLoopChinaUser-live"]
    "-----BEGIN PUBLIC KEY-----",
    "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDAGN9KAcc61KBz8EQAH54bFwGK",
    "6PEQNVXXlsObwFd3Zos83bRm+3grzP0pKWniZ6TL/y7ZgFh4OlUMh9qJjIt6Lpz9",
    "l4uDxkgDDrKHn8IrflBxjJKq0OyXqwIYChnFoi/HGjcRtJhi8oTFToSvKMqIeUuL",
    "mWmLA8nXdDnMl7zwoQIDAQAB",
    "-----END PUBLIC KEY-----"
    */
    /*
    ["badanamu AMS"] //Dev
-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQChCrS9+Bt8tpsJQNpo0CkQMAmX
gxRXYJwBdn0Bf3Gks5dJF6THHjQMQmBKbdlZ7EsM46oveYf3UnJXH7X7xgBNBvHq
QLEnCvgze0Yi66ul0Rf0GKH6ImMUBfUVksn+sOJ/6c+uzcscEljy/eCKYaWKoMMQ
EDkqiqxrS3EewLpRxQIDAQAB
-----END PUBLIC KEY-----
    */
    /*
   ["badanamu AMS"] //Prod
-----BEGIN PUBLIC KEY-----
MIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgHGWLk3zzoWJ6nJhHEE7LtM9LCa1
8OSdVQPwvrFxBUTRHz0Hl+qdNMNHJIJkj9NEjL+kaRo0XxsGdrR6NGxL2/WiX3Zf
H+xCTJ4Wl3pIc3Lrjc8SJ7OcS5PmLc0uXpb0bDGen9KcI3oVe770y6mT8PWIgqjP
wTT7osO/AOfbIsktAgMBAAE=
-----END PUBLIC KEY-----
    */
])

const accountNamespace = v5(domain||"", v5.DNS)
export function accountUUID(email?: string) {
    const hash = createHash('sha256');
    if (email) { hash.update(email) }
    return v5(hash.digest(), accountNamespace)
}