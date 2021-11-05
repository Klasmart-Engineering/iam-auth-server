import { Request } from 'express'
import passport from 'passport'
import {
    BearerStrategy,
    IBearerStrategyOptionWithRequest,
    ITokenPayload,
} from 'passport-azure-ad'

import { 
    IdToken 
} from './types/token'

const credentials = {
    tenantName: process.env.AZURE_B2C_TENANT_NAME,
    clientID: process.env.AZURE_B2C_CLIENT_ID || '',
}
const policies = {
    policyName: process.env.AZURE_B2C_POLICY_NAME,
}
const metadata = {
    authority: process.env.AZURE_B2C_AUTHORITY,
    discovery: '.well-known/openid-configuration',
    version: 'v2.0',
}
const settings = {
    isB2C: true,
    validateIssuer: true,
    passReqToCallback: false,
    loggingLevel: 'warn',
}

const options: IBearerStrategyOptionWithRequest = {
    identityMetadata: `https://${credentials.tenantName}.b2clogin.com/${credentials.tenantName}.onmicrosoft.com/${policies.policyName}/${metadata.version}/${metadata.discovery}`,
    clientID: credentials.clientID,
    audience: credentials.clientID,
    policyName: policies.policyName,
    isB2C: settings.isB2C,
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

export async function transferAzureB2CToken(
    req: Request
): Promise<IdToken> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = await new Promise<any>((resolve, reject) => {
        passport.authenticate(
            'oauth-bearer',
            { session: false },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (err: Error | null, user: boolean | never, info: any) => {
                if (err) {
                    reject(err)
                }
                if (!user) {
                    reject({ message: 'Invalid token' })
                }
                if(info.emails && info.emails.length===0) {
                    reject({message: 'missing emails claim'})
                }
                const idToken = {
                    name: info.name,
                    email: info.emails[0]
                }
                resolve(idToken)
            }
        )(req)
    })
    return token
}

export default transferAzureB2CToken