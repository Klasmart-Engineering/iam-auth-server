import { Request } from 'express'
import {
    Algorithm,
    decode,
    JwtHeader,
    Secret,
    sign,
    SignOptions,
    verify,
    VerifyOptions,
} from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'
import { isEmpty, pickBy } from 'lodash'

import transferAzureB2CToken, { isAzureB2CToken } from './azureB2C'
import globalConfig from './config'
import {
    EmptyTokenError,
    MalformedAuthorizationHeaderError,
    MissingAccountIdentifierError,
    MissingTokenError,
    TokenTypeError,
} from './errors'
import { JwtConfig } from './jwtConfig'
import { RefreshToken } from './refreshToken'
import { DecodedToken, IdToken } from './types/token'
import { validateString } from './util/validate'

export class JwtService {
    public static create(jwtConfig: JwtConfig) {
        return new JwtService(jwtConfig)
    }

    public constructor(private config: JwtConfig) {}

    public verifyAccessToken(encodedToken: string) {
        return new Promise<any>((resolve, reject) => {
            verify(
                encodedToken,
                this.config.secretOrPublicKey,
                this.config.accessTokenOptions,
                (err, decoded) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    if (decoded) {
                        resolve(decoded)
                        return
                    }
                    reject(
                        'Unexpected error, token validation did not succeed but did not return an error'
                    )
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
                    if (err) {
                        reject(err)
                        return
                    }
                    if (decoded) {
                        resolve(decoded)
                        return
                    }
                    reject(
                        'Unexpected error, token validation did not succeed but did not return an error'
                    )
                }
            )
        })
    }
    public signAccessToken(token: IdToken) {
        return this.signJWT(
            token,
            this.config.secretOrPrivateKey,
            this.config.accessTokenOptions
        )
    }

    public signRefreshToken(refreshToken: RefreshToken) {
        return this.signJWT(
            refreshToken,
            this.config.secretOrPrivateKey,
            this.config.refreshTokenOptions
        )
    }

    private async signJWT(
        token: IdToken | RefreshToken,
        secret: Secret,
        options: SignOptions
    ) {
        return new Promise<string>((resolve, reject) => {
            sign(token, secret, options, (err, encoded) => {
                if (encoded) {
                    resolve(encoded)
                } else {
                    console.log(err)
                    reject(err)
                }
            })
        })
    }
}

export async function transferToken(tokenToTransfer: string): Promise<IdToken> {
    const encodedToken = validateString(tokenToTransfer)
    if (!encodedToken) {
        throw new Error('No token')
    }
    const { header, payload } = decode(encodedToken, { complete: true }) as {
        header: JwtHeader
        payload: any
    }
    const issuer = payload.iss
    const keyId = typeof header.kid === 'string' ? header.kid : undefined

    if (typeof issuer !== 'string') {
        throw new Error('Unknown issuer')
    }

    const issuerConfig = issuers.get(issuer)
    if (!issuerConfig) {
        throw new Error(`Unknown Issuer(${issuer})`)
    }

    const { publicKeyOrSecret, options } =
        await issuerConfig.getValidationParameter(keyId)
    if (!publicKeyOrSecret) {
        throw new Error(
            `Unable to get verification secret or public key for Issuer(${payload.iss}) and KeyId(${header.kid})`
        )
    }

    return new Promise<IdToken>((resolve, reject) => {
        verify(encodedToken, publicKeyOrSecret, options, (err, decoded) => {
            if (err) {
                reject(err)
                return
            }
            if (decoded) {
                try {
                    const token = issuerConfig.createToken(
                        decoded as DecodedToken
                    )
                    resolve(token)
                    return
                } catch (e) {
                    reject(e)
                    return
                }
            }
            reject(
                'Unexpected error, token validation did not succeed but did not return an error'
            )
        })
    })
}

export interface IssuerConfig {
    getValidationParameter(
        keyId?: string
    ): Promise<{ publicKeyOrSecret: Secret; options: VerifyOptions }>
    createToken(token: DecodedToken): IdToken
}

class GoogleIssuerConfig implements IssuerConfig {
    private client = jwksClient({
        strictSsl: true,
        jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
    })

    public async getValidationParameter(keyId?: string) {
        if (!keyId) {
            throw new Error(
                `Unable to get public key for Issuer(accounts.google.com) due to missing keyId(${keyId})`
            )
        }
        const response = await this.client.getSigningKeyAsync(keyId)
        const alg = validateAlgorithm((response as any)['alg'])
        const publicKeyOrSecret = response.getPublicKey()
        const options: VerifyOptions = {
            algorithms: [alg],
        }
        return {
            publicKeyOrSecret,
            options,
        }
    }

    public createToken(token: DecodedToken): IdToken {
        function givenName() {
            if (typeof token?.given_name === 'string') {
                return token.given_name.trim()
            }
            return undefined
        }
        function familyName() {
            if (typeof token?.family_name === 'string') {
                return token.family_name.trim()
            }
            return undefined
        }
        function name() {
            const given_name = givenName()
            const family_name = familyName()
            if (given_name && family_name) {
                return `${given_name} ${family_name}`
            }
            if (given_name) {
                return given_name
            }
            if (family_name) {
                return family_name
            }
            return undefined
        }

        let email = token?.email as string | undefined
        if (!email) {
            throw new Error('No Email')
        }
        if (typeof email !== 'string') {
            throw new Error('Email must be a string')
        }
        email = normalizedLowercaseTrimmed(email)

        return {
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
    public createToken(token: DecodedToken): IdToken {
        function name() {
            if (typeof token?.name === 'string') {
                return token.name
            }
            return undefined
        }

        let email = token?.em as string | undefined
        let phone = token?.pn as string | undefined
        if (!phone && !email) {
            throw new Error('Must specify email xor phone')
        }
        if (email && phone) {
            throw new Error('Must specify email OR phone, not both')
        }
        if (email) {
            if (typeof email !== 'string') {
                throw new Error('Email must be a string')
            }
            email = normalizedLowercaseTrimmed(email)
        }
        if (phone) {
            if (typeof phone !== 'string') {
                throw new Error('Phone must be a string')
            }
            phone = normalizedLowercaseTrimmed(phone)
        }

        return {
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
    public createToken(token: DecodedToken): IdToken {
        function name() {
            if (typeof token?.name === 'string') {
                return token.name
            }
            return undefined
        }

        let email = token?.email as string | undefined
        let phone = token?.phone as string | undefined
        if (email && phone) {
            throw new Error('Must not specify email and phone')
        }
        if (!email && !phone) {
            throw new Error('Must specify email OR phone, not both')
        }
        if (email) {
            if (typeof email !== 'string') {
                throw new Error('Email must be a string')
            }
            email = normalizedLowercaseTrimmed(email)
        }
        if (phone) {
            if (typeof phone !== 'string') {
                throw new Error('Phone must be a string')
            }
            phone = normalizedLowercaseTrimmed(phone)
        }

        return {
            email,
            phone,
            name: name(),
        }
    }
}

// Exported purely to add a test-only issuer
export const issuers = new Map<string, IssuerConfig>([
    ['accounts.google.com', new GoogleIssuerConfig()],
    [
        'Badanamu AMS',
        new BadanamuIssuerConfig(
            // Default to production AMS public key, but optionally accept a different public key
            // from the environment (e.g. dev AMS public key)
            process.env.AMS_PUBLIC_KEY ||
                [
                    '-----BEGIN PUBLIC KEY-----',
                    'MIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgHGWLk3zzoWJ6nJhHEE7LtM9LCa1',
                    '8OSdVQPwvrFxBUTRHz0Hl+qdNMNHJIJkj9NEjL+kaRo0XxsGdrR6NGxL2/WiX3Zf',
                    'H+xCTJ4Wl3pIc3Lrjc8SJ7OcS5PmLc0uXpb0bDGen9KcI3oVe770y6mT8PWIgqjP',
                    'wTT7osO/AOfbIsktAgMBAAE=',
                    '-----END PUBLIC KEY-----',
                ].join('\n'),
            {
                algorithms: ['RS256', 'RS384', 'RS512'],
            }
        ),
    ],
    [
        'Kidsloop_cn',
        new StandardIssuerConfig(
            [
                '-----BEGIN PUBLIC KEY-----',
                'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxw7TuSD72UpPMbS779d6',
                '/87nVC2TCCO14sHboHKaFSkENgTW6gGWwUUjrSaeT2KxS0mT8gZ42ToaSZ1jakBR',
                '4SqH8CZ+ZkFD6C5KLB+wGWzYnqt52XtHUbvH71xxN2Yd3eYGI9iLZs3ZwWUaxovW',
                '4JvNteRlY0MnkEcjCdc/E1VqKOnr+WaENU7vgQ/V1p8fLuNA0h/7/oIjFGHd++5c',
                'S1GdFIL29LiVrhgqyOnB8tvixT/nAd/cHHbotHNW2C1S5T1IKRkDe0K3m7eAAHzx',
                'fhf4evczLMI1RAWEPPMsRbBZzRkn14OhpQhe+nSpkdoW3hac350vy1/pZDRFE/zS',
                '8QIDAQAB',
                '-----END PUBLIC KEY-----',
            ].join('\n'),
            {
                algorithms: ['RS256', 'RS384', 'RS512'],
            }
        ),
    ],
])

function validateAlgorithm(alg?: any): Algorithm {
    if (typeof alg !== 'string') {
        throw new Error('Unknown alogrithm')
    }
    switch (alg) {
        case 'HS256':
        case 'HS384':
        case 'HS512':
        case 'RS256':
        case 'RS384':
        case 'RS512':
        case 'ES256':
        case 'ES384':
        case 'ES512':
        case 'PS256':
        case 'PS384':
        case 'PS512':
            return alg
    }
    throw new Error(`Unknown algorithm '${alg}'`)
}

const normalizedLowercaseTrimmed = (x: string): string =>
    x.normalize('NFKC').toLowerCase().trim()

export const decodeAndStandardizeThirdPartyJWT = (
    req: Request
): Promise<IdToken> => {
    // Avoid unecessary JWT decoding to check issuer, and revert to original behaviour
    if (!globalConfig.azureB2C.isEnabled) return transferToken(req.body.token)

    const { token, location } = extractTokenFromRequest(req)

    const payload = decode(token, { json: true })

    if (payload === null) throw new Error('JWT could not be decoded')

    // Use old 3rd party issuer behaviour
    if (!isAzureB2CToken(payload)) return transferToken(req.body.token)

    if (location === 'body') {
        // passport-azure-ad expects the access token as either:
        //  - "Authorization": `Bearer ${token}` header
        //  - `request.body.access_token`

        // In order to maintain our old API contract and support old clients (specifically the mobile app),
        // we need to accept the token as `request.body.token`

        // The alternative to modifying the request would be to reimplement our own Passport strategy,
        // as checking the `token` key in the body is deeply embedded in the passport-azure-ad `authenticate` function

        // https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/maintenance/passport-azure-ad#4-usage
        delete req.body.token
        req.body.access_token = token
    }

    return transferAzureB2CToken(req)
}

/**
 *
 * Conditionally extract a JWT from either the `Authorization` header if present, else check
 * req.body
 */
export const extractTokenFromRequest = (
    req: Request
): { token: string; location: 'header' | 'body' } => {
    if (req.headers.authorization !== undefined) {
        return {
            token: extractTokenFromAuthorizationHeader(
                req.headers.authorization
            ),
            location: 'header',
        }
    }

    if ('token' in req.body) {
        return { token: extractTokenFromBody(req.body), location: 'body' }
    }

    throw new MissingTokenError()
}

const extractTokenFromAuthorizationHeader = (
    authorizationHeader: string
): string => {
    const authorization = authorizationHeader.split(' ')
    if (
        !(
            authorization.length == 2 &&
            authorization[0].toLowerCase() === 'bearer'
        )
    )
        throw new MalformedAuthorizationHeaderError()

    const token = authorization[1]
    if (!token) throw new EmptyTokenError()

    return token
}

const extractTokenFromBody = (
    body: Record<string, unknown> & { token: unknown }
): string => {
    const token = body.token

    if (typeof token !== 'string') throw new TokenTypeError()

    if (!token) throw new EmptyTokenError()

    return token
}

export const extractAccountIdentifiers = (token: IdToken) => {
    const identifiers = pickBy({
        email: token.email,
        phone: token.phone,
        username: token.user_name,
    })

    if (!isEmpty(identifiers)) {
        return identifiers
    }

    throw new MissingAccountIdentifierError()
}
