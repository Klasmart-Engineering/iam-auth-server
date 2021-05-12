import { sign, Secret, SignOptions, VerifyOptions, Algorithm } from "jsonwebtoken"
import { v5 } from "uuid"
import jwksClient from "jwks-rsa"
import { decode, JwtHeader, verify, VerifyErrors } from "jsonwebtoken"
import { createHash } from "crypto"
import { JwtConfig } from "./jwtConfig"
import * as dotenv from 'dotenv';

dotenv.config({ path: __dirname + '/../.env' });
export const accessTokenDuration = Number(process.env.JWT_ACCESS_TOKEN_DURATION) || 15*60*1000
export const refreshTokenDuration = Number(process.env.JWT_REFRESH_TOKEN_DURATION) || 14*24*60*60*1000
export const httpsOnlyCookie = process.env.JWT_COOKIE_ALLOW_HTTP === undefined

const domain = process.env.DOMAIN

export class JwtService {
    public static create(jwtConfig: JwtConfig) {
        return new JwtService(jwtConfig)
    }

    private config: JwtConfig;
    public constructor(config: JwtConfig) {
        this.config = config
    }

    public verifyAccessToken(encodedToken: string) {
        return new Promise<any>((resolve, reject) => {
            verify(
                encodedToken,
                this.config.secretOrPublicKey,
                this.config.accessTokenOptions,
                (err, decoded) => {
                    if (err) { reject(err); return }
                    if (decoded) { resolve(decoded); return }
                    reject("Unexpected error, token validation did not succeed but did not return an error")
                }
            )
        })
    }

    public verifyRefreshToken(encodedToken: string) {
        return new Promise<any>((resolve, reject) => {
            verify(
                encodedToken,
                this.config.secretOrPublicKey,
                this.config.refreshTokenOptions,
                (err, decoded) => {
                    if (err) { reject(err); return }
                    if (decoded) { resolve(decoded); return }
                    reject("Unexpected error, token validation did not succeed but did not return an error")
                }
            )
        })
    }
    public signAccessToken(token: IdToken) {
        return this.signJWT(token, this.config.secretOrPrivateKey, this.config.accessTokenOptions)
    }

    public signRefreshToken(refreshToken: object) {
        return this.signJWT(refreshToken, this.config.secretOrPrivateKey, this.config.refreshTokenOptions)
    }

    private async signJWT(token: Object, secret: Secret, options: SignOptions) {
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
}

export interface IdToken {
    id: string,
    email?: string,
    phone?: string,

    // Not used?
    name?: string,

    // Only used by google
    given_name?: string,
    family_name?: string,

    // For external services/clients
    external?: string,
}

export async function transferToken(encodedToken: string): Promise<IdToken> {
    const { header, payload } = decode(encodedToken, { complete: true }) as { header: JwtHeader, payload: any }
    const issuer = payload.iss
    const keyId = typeof header.kid === "string" ? header.kid : undefined

    if (typeof issuer !== "string") { throw new Error("Unknown issuer"); }

    const config = issuers.get(issuer)
    if (!config) { throw new Error(`Unknown Issuer(${issuer})`) }

    const {publicKeyOrSecret, options} = await config.getValidationParameter(keyId)
    if (!publicKeyOrSecret) { throw new Error(`Unable to get verification secret or public key for Issuer(${payload.iss}) and KeyId(${header.kid})`) }

    return new Promise<IdToken>((resolve, reject) => {
        verify(
            encodedToken,
            publicKeyOrSecret,
            options,
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
    getValidationParameter(keyId?: string): Promise<{publicKeyOrSecret: Secret, options: VerifyOptions}>
    createToken(token: object): IdToken
}

class GoogleIssuerConfig implements IssuerConfig {
    private client = jwksClient({
        strictSsl: true,
        jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
    })
    constructor() {}

    public async getValidationParameter(keyId?: string) {
        if (!keyId) { throw new Error(`Unable to get public key for Issuer(accounts.google.com) due to missing keyId(${keyId})`) }
        const response = await this.client.getSigningKeyAsync(keyId)
        const alg = validateAlgorithm((response as any)["alg"])
        const publicKeyOrSecret = response.getPublicKey();
        const options: VerifyOptions = {
            algorithms: [alg],
        }
        return {
            publicKeyOrSecret,
            options,
        }
    }

    public createToken(token: any): IdToken {
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

        let email = token.email
        if (!email) { throw new Error("No Email") }
        if (typeof email !== "string") { throw new Error("Email must be a string") }
        email = normalizedLowercaseTrimmed(email)
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
    private options: VerifyOptions

    constructor(publicKeyOrSecret: Secret, options: VerifyOptions) {
        this.publicKeyOrSecret = publicKeyOrSecret
        this.options = options
    }
    public async getValidationParameter(keyId?: string) {
        return {
            publicKeyOrSecret: this.publicKeyOrSecret,
            options: this.options,
        }
    }
    public createToken(token: any): IdToken {
        function name() {
            if (typeof token.name === "string") { return token.name }
            return undefined
        }

        let email = token.em
        let phone = token.pn
        if (!phone && !email) { throw new Error("Must specify email xor phone") }
        if (email && phone) { throw new Error("Must specify email OR phone, not both") }
        if(email) {
            if(typeof email !== "string") { throw new Error("Email must be a string") }
            email = normalizedLowercaseTrimmed(email)
        }
        if(phone) {
            if (typeof phone !== "string") { throw new Error("Phone must be a string") }
            phone = normalizedLowercaseTrimmed(phone)
        }

        const id = accountUUID(email||phone)

        return {
            id,
            email,
            phone,
            name: name(),
        }
    }
}

class StandardIssuerConfig implements IssuerConfig {
    private publicKeyOrSecret: Secret
    private options: VerifyOptions

    constructor(publicKeyOrSecret: Secret, options: VerifyOptions) {
        this.publicKeyOrSecret = publicKeyOrSecret
        this.options = options
    }
    public async getValidationParameter(keyId?: string) {
        return {
            publicKeyOrSecret: this.publicKeyOrSecret,
            options: this.options,
        }
    }
    public createToken(token: any): IdToken {
        function name() {
            if (typeof token.name === "string") { return token.name }
            return undefined
        }

        let email = token.email
        let phone = token.phone
        if (email && phone) { throw new Error("Must not specify email and phone") }
        if (!email && !phone) { throw new Error("Must specify email OR phone, not both") }
        if(email) {
            if(typeof email !== "string") { throw new Error("Email must be a string") }
            email = normalizedLowercaseTrimmed(email)
        }
        if(phone) {
            if (typeof phone !== "string") { throw new Error("Phone must be a string") }
            phone = normalizedLowercaseTrimmed(phone)
        }

        const id = accountUUID(email||phone)

        return {
            id,
            email,
            phone,
            name: name(),
        }
    }
}

class SchoolMitraIssuerConfig implements IssuerConfig {
    private publicKeyOrSecret: Secret
    private options: VerifyOptions

    constructor(publicKeyOrSecret: Secret, options: VerifyOptions) {
        this.publicKeyOrSecret = publicKeyOrSecret
        this.options = options
    }
    public async getValidationParameter(keyId?: string) {
        return {
            publicKeyOrSecret: this.publicKeyOrSecret,
            options: this.options,
        }
    }
    public createToken(token: any): IdToken {
        function name() {
            if (typeof token.name === "string") { return token.name }
            return undefined
        }

        let email = token.email
        let phone = token.phone
        if (!phone && !email) { throw new Error("Must specify email OR phone") }
        if (email && phone) { throw new Error("Must specify email OR phone, not both") }
        if (email) {
            if (typeof email !== "string") { throw new Error("Email must be a string") }
            email = normalizedLowercaseTrimmed(email)
        }
        if (phone) {
            if (typeof phone !== "string") { throw new Error("Phone must be a string") }
            phone = normalizedLowercaseTrimmed(phone)
        }

        const id = accountUUID(email||phone)

        return {
            id,
            email,
            phone,
            name: name(),
            external: "SchoolMitra",
        }
    }
}

const issuers = new Map<string, IssuerConfig>([
    ["accounts.google.com", new GoogleIssuerConfig()],
    [
        "Badanamu AMS",
        new BadanamuIssuerConfig(
            [
                "-----BEGIN PUBLIC KEY-----",
                "MIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgHGWLk3zzoWJ6nJhHEE7LtM9LCa1",
                "8OSdVQPwvrFxBUTRHz0Hl+qdNMNHJIJkj9NEjL+kaRo0XxsGdrR6NGxL2/WiX3Zf",
                "H+xCTJ4Wl3pIc3Lrjc8SJ7OcS5PmLc0uXpb0bDGen9KcI3oVe770y6mT8PWIgqjP",
                "wTT7osO/AOfbIsktAgMBAAE=",
                "-----END PUBLIC KEY-----",
            ].join("\n"),
            {
                algorithms: [
                    "RS256",
                    "RS384",
                    "RS512",
                ],
            }
        ),
    ],
    [
        "Kidsloop_cn",
        new StandardIssuerConfig(
            [
                "-----BEGIN PUBLIC KEY-----",
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxw7TuSD72UpPMbS779d6",
                "/87nVC2TCCO14sHboHKaFSkENgTW6gGWwUUjrSaeT2KxS0mT8gZ42ToaSZ1jakBR",
                "4SqH8CZ+ZkFD6C5KLB+wGWzYnqt52XtHUbvH71xxN2Yd3eYGI9iLZs3ZwWUaxovW",
                "4JvNteRlY0MnkEcjCdc/E1VqKOnr+WaENU7vgQ/V1p8fLuNA0h/7/oIjFGHd++5c",
                "S1GdFIL29LiVrhgqyOnB8tvixT/nAd/cHHbotHNW2C1S5T1IKRkDe0K3m7eAAHzx",
                "fhf4evczLMI1RAWEPPMsRbBZzRkn14OhpQhe+nSpkdoW3hac350vy1/pZDRFE/zS",
                "8QIDAQAB",
                "-----END PUBLIC KEY-----",
            ].join("\n"),
            {
                algorithms: [
                    "RS256",
                    "RS384",
                    "RS512",
                ],
            }
        ),
    ],
    [
        "Chrysalis_School_Mitra",
        new SchoolMitraIssuerConfig(
            [
                "-----BEGIN PUBLIC KEY-----",
                "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDd4+G+PapaVeEq2ZbHBbfOFtdcCJ",
                "CRbOgiTaIY+058TK4bn57j0lx0GpgdV3sIbjDfiR3oGiNsaRe8+AIqA6isgCht8Ofq",
                "AQfvAh8ns5APHwy/T0SbEAyyQZQeqfR08bIITZQkzlLmUkxynb+RIA7LbPMtWeIgVW",
                "uaAAaT+GDsEQIDAQAB",
                "-----END PUBLIC KEY-----",
            ].join("\n"),
            {
                algorithms: [
                    "RS512",
                ],
            }
        )
    ]
])

function validateAlgorithm(alg?: any): Algorithm {
    if(typeof alg !== "string") { throw new Error("Unknown alogrithm") }
    switch(alg) {
        case "HS256":
        case "HS384":
        case "HS512":
        case "RS256":
        case "RS384":
        case "RS512":
        case "ES256":
        case "ES384":
        case "ES512":
        case "PS256":
        case "PS384":
        case "PS512":
            return alg
        }
        throw new Error(`Unknown algorithm '${alg}'`)
}

const normalizedLowercaseTrimmed = (x: string) => x.normalize("NFKC").toLowerCase().trim()
const accountNamespace = v5(domain||"", v5.DNS)
export function accountUUID(email?: string) {
    const hash = createHash('sha256');
    if (email) { hash.update(normalizedLowercaseTrimmed(email)) }
    return v5(hash.digest(), accountNamespace)
}
