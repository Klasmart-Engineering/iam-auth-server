import { Secret, sign, VerifyOptions } from 'jsonwebtoken'
import { ITokenPayload } from 'passport-azure-ad'

import { IssuerConfig } from '../src/jwt'
import { AzureB2CTokenPayload, DecodedToken, IdToken } from '../src/types/token'
import { testUser } from './user'

export const testExternalIssuer = {
    privateKey: `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAtNNnfc6LlHRMqWaokmX9UY1FORrg1C1wNM1om47dBJq01wR4
/6ChNyDObIpsjXVYuIGhmsk0DGkD3bXZIklKAr+ybbIikK52T/xEcDGO470XQjDe
i5BrR9VJWhvau4hmlU/f2zvlgXQRCdsZPyC9FrNlQHYh2cZir38OSma5MpX6rcxo
GsrIO2/LRcWIe0CcunLvUejygVPMY2L8DmtKG5vustSW9RscYhVpwWv9YZi5+8eX
8CK54RFCeAXogOC0HzpFkPkoHgk9BFwr/pb2fV9rnnYAhVdvNKYQRuQ93suFjpQi
CMyfmgqHTd973HIff5O7hUEXs9z4WV7Jsr3UNwIDAQABAoIBAEab8mKO37Q1gaX4
f0TDbJqGtowo8bgIkjMcLofnzmg43PrFNVZka+9x8QkzOFY4h09s1yTxAlECRM8z
bjlUMwFFx6/MCnFCntJ26GaDA4/sS4O+P3hyCWJAZ+c2zz/BcIVHbltWVTUqlGir
1HzxFMUjghscxfUa4Xgz/emRmSml/On0DFEQzm5T8DgqJh4bCQegJqMZut1TwJSY
xas0ZwQgekkY4dpkNXT46JGp9iCWqtVM1zkYh2E7B0Y4o1D+9SH89sRVo1ULWWK1
YQc+ljhGm80hZG4oPfsDn6bJ/IHZXzfVTakvdTidiD64qQ6YrGIJo0cg34EPCOs1
JtONOmECgYEA3Mq4rQk92Tyg3cHPeKso9edYjaZdWj+QpkF3Enqo5dWXYLhnC6v9
cotdJIXQcwSwFUBW+/H4p9D2caw92oISLzWZgDMSY2mjxEmAlEeX7su94GSws0nd
6AbUqGSM7mkdUTLi/egJLhlboMITlKwa9GJduorfTbQQVbmYIu8X0HECgYEA0akq
xrEGfcjBcAUz82Fcp5F6aaPwXtsriV0oqT6rMPrtLBkbZUytL3bDLcnzyykDN/ba
oaKstjP5KKJoZUopFGnh04dfOVveUd2cw1+6uK1uZ7Sulo13gYZAxz5Y1oTRJ/jF
n5YkvlbFXB/4M2xN5TZhLQQQWqaXtPVJDANHwycCgYEA1m5n913PXIj+bwDI35fT
uycJIOEfLwQnFuDjpOXN3RGY6E2Pfo12I+Xn+w2fCeXWoX0QPbaeWVWf03yFwg6r
XIBA6XowdK5nZ74/C0OQ8lGbwi/oUOf/hVYE+NpW6UDbQT4bqJ7PM59bFwEGBVE1
CH30K7St9QhZCPisIdl1lnECgYEAryr6bUUMGl13mEMQk4A97Fa0gryQoH/XEQ4/
YZ/VYbfUHirf47O7YlOEYKZBRPUAFmrtYWxLhnNH8XY3aKEcT0zje1q36XFi/tz8
E5PQqmlkO8sOrwSE2zeyuYTSrnALW60SV/IWwtw2SnD/at9K+X2ElRq3GzXivDLP
E/VNqLMCgYAUqw8BOEcmFFFmaH41dyflLzhs6S+nUDQMnMxyLBSpomLKl4zMSCEE
KpaBo07G8i5oBS0baIENMNhuTDN8uOpO/cLF9jPOAQKsb2ysss3fC82vwW5XX03x
CpTP8kLFy4V0l7Q4q9LAl86YNLaAe/TYV3ZcDVs1Us9v/J0yFsApSw==
-----END RSA PRIVATE KEY-----`,
    publicKey: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtNNnfc6LlHRMqWaokmX9
UY1FORrg1C1wNM1om47dBJq01wR4/6ChNyDObIpsjXVYuIGhmsk0DGkD3bXZIklK
Ar+ybbIikK52T/xEcDGO470XQjDei5BrR9VJWhvau4hmlU/f2zvlgXQRCdsZPyC9
FrNlQHYh2cZir38OSma5MpX6rcxoGsrIO2/LRcWIe0CcunLvUejygVPMY2L8DmtK
G5vustSW9RscYhVpwWv9YZi5+8eX8CK54RFCeAXogOC0HzpFkPkoHgk9BFwr/pb2
fV9rnnYAhVdvNKYQRuQ93suFjpQiCMyfmgqHTd973HIff5O7hUEXs9z4WV7Jsr3U
NwIDAQAB
-----END PUBLIC KEY-----`,
    iss: 'test-external-issuer',
}

export const testInternalIssuer = {
    privateKey: process.env.JWT_PRIVATE_KEY ?? '',
    publicKey: process.env.JWT_PUBLIC_KEY ?? '',
    iss: process.env.JWT_ISSUER,
}

export const createExternalJWT = async (
    payload: Record<string, unknown>,
    secret: Secret = testExternalIssuer.privateKey
) => {
    return new Promise<string>((resolve, reject) => {
        sign(
            payload,
            secret,
            { expiresIn: '1m', algorithm: 'RS256' },
            (err, encoded) => {
                if (encoded) {
                    resolve(encoded)
                } else {
                    reject(err)
                }
            }
        )
    })
}

const testAzureB2CIssuer = {
    privateKey: `-----BEGIN RSA PRIVATE KEY-----
MIICWwIBAAKBgQC0pCjfWaVW/6CuNTB6wuu6mn8xtP8s5wrIj//CI+OHjGDsre8P
qsOY5O1B+m0G2eOLLzWlJKD1qFUtOwqyofrq5mujqsGwkSlThefgNbItpKdcY83z
msMvjQ6XCUhklGAiuptB8tmgKqc6hUIYNZYz2z+6qI+OqErjNXNsftm1RQIDAQAB
AoGAFlLPJkLq1uSCU+UI17Ls9MORAnCOtFrdD0oUXkaXILItbDJWf8Yno+Zul5++
B4G3yASOiZkMNy+VTyCjws2Xt2iHTxE1p9nh9tPL3QqzeqKzk34NMdtGqnR7tDWG
Q7wBzLzZjoQ33pqAVoDDEkw9YhxHFrmjixDW/C2iHMEHKuECQQDih50owsDr361n
eNUL8j1z3z+0yi7pnChu17TvYJK8NaGL2Cfj2KStJyvxvziFKLAgOAdr10MEuIuG
gAAfF+I5AkEAzCREcdo8gFfBb73RZVj6RKAW0PDegGUlzjUXWtjEBdLssgY6Nj/z
7Is/D5743x/HAUI1QMHh3RkfPfjAw+V7bQJAegdj+dkv4+CSoPLOkajkwc65msJv
kxi0D0HUDj+PzCN36sV+d5b03vIDEi9YWyMX/cMw/D7xs1FWmBXL+vP6wQJAHPmQ
1XAaYkUSaZ/Rlsb4TsFCO8nUavjwUsJqXDSkLgdwHRyRKp4NKyfgfYEc5d6GyoDx
Og3K1yz3qD4kbimmSQJAcu/Kl30I2BKM7D2CFTkb/+V+JDQhKtrsY/RZAmlJWWKS
JQW/Z4uxEq35QZd7ca27r4UhncBr9M263kGteY53bw==
-----END RSA PRIVATE KEY-----
`,
    publicKey: `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC0pCjfWaVW/6CuNTB6wuu6mn8x
tP8s5wrIj//CI+OHjGDsre8PqsOY5O1B+m0G2eOLLzWlJKD1qFUtOwqyofrq5muj
qsGwkSlThefgNbItpKdcY83zmsMvjQ6XCUhklGAiuptB8tmgKqc6hUIYNZYz2z+6
qI+OqErjNXNsftm1RQIDAQAB
-----END PUBLIC KEY-----
`,
    iss: `https://${process.env.AZURE_B2C_DOMAIN}/${process.env.AZURE_B2C_TENANT_ID}/v2.0/`,
}

export const validAzureB2CJWTPayload: AzureB2CTokenPayload = {
    // NB: This needs to match the combined AZURE_B2C_DOMAIN and AZURE_B2C_TENANT_ID
    iss: testAzureB2CIssuer.iss,
    // NB: This needs to be in the future
    exp: 1_800_000_000,
    nbf: 1638291645,
    // NB: this needs to match the AZURE_B2C_CLIENT_ID
    aud: process.env.AZURE_B2C_CLIENT_ID,
    oid: '4aeaf96e-77af-4b11-b968-2baf1b31282c',
    sub: '4aeaf96e-77af-4b11-b968-2baf1b31282c',
    email: testUser.email,
    tfp: 'B2C_1_KL_create_user_or_sign_in',
    nonce: '9acaca09-27db-46fb-a838-05d8171a0117',
    scp: 'tasks.write',
    // NB: This will match the AZURE_B2C_CLIENT_ID of the application that requested the token
    azp: '0344eff3-68e0-45b0-99bb-bdbca3cce2f6',
    ver: '1.0' as ITokenPayload['ver'],
    iat: 1638291645,
    //
    log_in_name: 'string',
    has_email: true,
    has_phone: false,
    has_user_name: false,
}

export const createAzureB2CJWT = async (
    payload?: Record<string, unknown>,
    secret: Secret = testAzureB2CIssuer.privateKey
) => {
    const finalPayload = {
        ...validAzureB2CJWTPayload,
        payload,
    }
    return new Promise<string>((resolve, reject) => {
        sign(finalPayload, secret, { algorithm: 'RS256' }, (err, encoded) => {
            if (encoded) {
                resolve(encoded)
            } else {
                reject(err)
            }
        })
    })
}

export class TestIssuerConfig implements IssuerConfig {
    public async getValidationParameter(keyId?: string) {
        const options: VerifyOptions = {
            algorithms: ['RS256', 'RS384', 'RS512'],
        }
        return {
            publicKeyOrSecret: testExternalIssuer.privateKey,
            options,
        }
    }
    public createToken(token: DecodedToken): IdToken {
        const name = token?.name as string | undefined
        const email = token?.email as string | undefined
        const phone = token?.phone as string | undefined
        return {
            email,
            phone,
            name,
        }
    }
}

export const exampleJWTs = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    'eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.bQTnz6AuMJvmXXQsVPrxeQNvzDkimo7VNXxHeSBfClLufmCVZRUuyTwJF311JHuh',
]
