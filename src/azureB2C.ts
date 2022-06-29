import { Request } from 'express'
import passport from 'passport'
import {
    BearerStrategy,
    IBearerStrategyOptionWithRequest,
    ITokenPayload,
} from 'passport-azure-ad'

import { MissingAccountIdentifierError } from './errors'
import { AzureB2CTokenPayload, IdToken } from './types/token'
import cleanPhone from './util/clean'

const credentials = {
    tenantID: process.env.AZURE_B2C_TENANT_ID,
    clientID: process.env.AZURE_B2C_CLIENT_ID || '',
}
const policies = {
    policyName: process.env.AZURE_B2C_POLICY_NAME,
}
const metadata = {
    authority: process.env.AZURE_B2C_AUTHORITY,
    domain: process.env.AZURE_B2C_DOMAIN,
    discovery: '.well-known/openid-configuration',
    version: 'v2.0',
}
const settings = {
    isB2C: true,
    issuer: `https://${metadata.domain}/${credentials.tenantID}/${metadata.version}/`,
    validateIssuer: true,
    passReqToCallback: false,
    loggingLevel: 'warn',
}

const options: IBearerStrategyOptionWithRequest = {
    identityMetadata: `https://${metadata.domain}/${credentials.tenantID}/${policies.policyName}/${metadata.version}/${metadata.discovery}`,
    clientID: credentials.clientID,
    audience: credentials.clientID,
    policyName: policies.policyName,
    isB2C: settings.isB2C,
    issuer: settings.issuer,
    validateIssuer: settings.validateIssuer,
    loggingLevel: 'info',
    passReqToCallback: settings.passReqToCallback,
}

const bearerStrategy = () =>
    new BearerStrategy(
        options,
        (token: ITokenPayload, done: CallableFunction) => {
            // Send user info using the second argument
            done(null, {}, token)
        }
    )

if (process.env.AZURE_B2C_ENABLED === 'true') {
    passport.initialize()
    passport.use(bearerStrategy())
}

export const isAzureB2CToken = (payload: {
    iss?: unknown
    [key: string]: unknown
}): boolean => {
    const { iss } = payload

    if (typeof iss !== 'string' || iss === '')
        throw new Error('Invalid iss value in payload')

    return iss === settings.issuer
}

interface AuthenticateResult {
    err: Error | null
    user: Record<string, never> | false
    info: AzureB2CTokenPayload | string | Error
}

export type AuthenticateCallback = (
    err: AuthenticateResult['err'],
    user: AuthenticateResult['user'],
    info: AuthenticateResult['info']
) => void

export const transferAzureB2CToken = async (req: Request): Promise<IdToken> => {
    return new Promise<IdToken>((resolve, reject) => {
        passport.authenticate(
            'oauth-bearer',
            { session: false },
            (
                err: AuthenticateResult['err'],
                user: AuthenticateResult['user'],
                info: AuthenticateResult['info']
            ) => {
                if (err) {
                    return reject(err)
                }
                if (!user) {
                    return reject({ message: 'Invalid token' })
                }
                if (typeof info === 'string') {
                    return reject({ message: info })
                }
                if (info instanceof Error) {
                    return reject(info)
                }

                if (!(info.email || info.phone || info.user_name)) {
                    return reject(new MissingAccountIdentifierError())
                }

                const idToken = {
                    name: info.name,
                    email: info.email,
                    phone: cleanPhone(info.phone),
                    user_name: info.user_name,
                    log_in_name: info.log_in_name,
                    has_email: info.has_email,
                    has_phone: info.has_phone,
                    has_user_name: info.has_user_name,
                    azure_ad_b2c_id: info.oid
                }
                return resolve(idToken)
            }
        )(req)
    })
}

export default transferAzureB2CToken
