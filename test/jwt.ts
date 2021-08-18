import cookie from 'cookie'
import { Secret, sign, VerifyOptions } from 'jsonwebtoken'

import { IdToken, IssuerConfig } from '../src/jwt'
import { DecodedToken } from '../src/types/token'

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
}

export const testInternalIssuer = {
    privateKey: `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAmf5kTZkYy5y3rRR5VoYtJYqOt/o58Wbjp9Rh7vjSJufTV7oc
glwX2fMyKmxy1TdIZnmg6TmYrCqcT56zS0ZBNOCpvpUU726o4ABIQgUXgzEs3lkp
81hPhT4vT4NlsaE8gIN0+gWpEB3fk5uzKRuuX6I8xVlP2Q+oaESgEHTOvFzaPSUw
epePnVPA56e5TXkAGKcgtjuLRUb38hb42RJ5gZCbXpaKqS4hspHeMRnbKvLhyVkh
C/fpXUYgxX+Ioo9GTZjsKyxCvVG2fGA0lGboD2KGALfIjTuAPTQa6O8BW5nf6LyX
wyEXvLPssLT4fVopa5VOo7lAbfq7opA/4dGdrQIDAQABAoIBAEkaKXVo0wt9ZvhD
+uHnKjFjGCMgJzeAt1uph6ARAHo1nO9NS1Fa9HujZlIbT1wGNVloLcnpbJ92TuPB
G64FONkoOYxeayTKbGKB38tvbVz7ECixPSfm6UEAZycg4jqzpuv++53g6APdmpAQ
3rkKCfoeIykwH6aUN0bgJPgK60UhNnJExKpYdRHLMDb620qIn8Lcp9jxZ3s9cs7P
TrFkdM0Rx+DT7bt0z2xZ+tBGHeywBeQI3ukirpTezZwbXDtov1vsnZ6fcsvRGZn7
yXHcMEBH+6CQXnYjmIRGlwiBJoq1+8pbu7U3YDkWXILon1o5O/o2TBryaUjGPMsp
9dAjC4ECgYEAyihdIgqXUJtUqOaUeqhFaIUE2yR1pnu4Yt6IgolXyyGdmuXoS+M0
qAfE8eFgQiq6K4v+YKBoYuvGSkIV1xX1S5Itb6Ry1y6gzX41yr7jORN/CoSnJmZw
GNRosbQSH4PvDqotLuxvuHGRW1pzYgKOtyjBMeSG+cr05a2Xh2Uss80CgYEAwwIV
ljmVjxQIC+HQawK+tet2aFBag+Pn0BkX6Je8igqMSvn0HBH2D7bijgJzZdhjJnX6
OwjUOmPchV0Vk/gkJ+88TrDlM3ovrS/KBz3p5fatj6PkNPybJWJVkQ6Mh48zrfcu
Vg+3ZFeQSotHu4BcU14BYA4HxfbzQlc7N1aUcWECgYBRbZzF/3ofr9GUDvyzw1/h
z+K62p7BJoiI2pYl7mh8m9e98ul019n37Nk5jMyXGlrO+57FERe68Ll4Y9IkRuX9
QK4okBbp8hA3daT5O5aPAPllJTWm1BBHEBfzrFK4ew4p3AZDJl2B78za/T4ItnsB
79qR3Dk6GLQ4Z4nnsasl6QKBgQCovjb7xVx7cLP9xCtbTgbE2LmfTljk4+OGGRCt
Pg/xy2rWvi/T0l7//htREyHUMUiq0U/0oZEz7ZG2/XNclU6EF+oxlbTftI1o6X+C
gLrTOX+6WfFxQFzoHo04dkR4URxBHzFDW1owQ+0h9B/gShSaNzAtdDaZwTWCZIVj
P1I4QQKBgCqLo4N+d/wgqZKk5bwm4FHaaWvyOSvflSR/PnLWb0nv+Z6bNRHYtJn6
w+V66ThyzwrEtKJHJu/Mc1vC4joYuWQgDFfAYc/evqvMw54pL7wtjIf0ShuMN4Yy
5VAZMqY/jXorZN1LJXhPTg9+jqg8j0c6YRrMgKeHds1WjAZA1Xgr
-----END RSA PRIVATE KEY-----`,
    publicKey: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmf5kTZkYy5y3rRR5VoYt
JYqOt/o58Wbjp9Rh7vjSJufTV7ocglwX2fMyKmxy1TdIZnmg6TmYrCqcT56zS0ZB
NOCpvpUU726o4ABIQgUXgzEs3lkp81hPhT4vT4NlsaE8gIN0+gWpEB3fk5uzKRuu
X6I8xVlP2Q+oaESgEHTOvFzaPSUwepePnVPA56e5TXkAGKcgtjuLRUb38hb42RJ5
gZCbXpaKqS4hspHeMRnbKvLhyVkhC/fpXUYgxX+Ioo9GTZjsKyxCvVG2fGA0lGbo
D2KGALfIjTuAPTQa6O8BW5nf6LyXwyEXvLPssLT4fVopa5VOo7lAbfq7opA/4dGd
rQIDAQAB
-----END PUBLIC KEY-----`,
}

export const testUser = {
    id: '66eb2744-065b-447c-b177-e4f196b9bae3',
    email: 'joe@bloggs.com',
}

export const validJWTPayload = {
    iss: 'test-kidsloop-issuer',
    id: testUser.id,
    email: testUser.email,
}

export const validInternalJWT = sign(
    validJWTPayload,
    testInternalIssuer.privateKey,
    {
        algorithm: 'RS256',
        expiresIn: '1h',
    }
)

export const validAccessCookie = cookie.serialize('access', validInternalJWT, {
    domain: 'kidsloop.test',
    maxAge: 10_000,
})

// Strip last character from signature to invalidate
const invalidInternalJWT = validInternalJWT.slice(0, -1)

export const invalidAccessCookie = cookie.serialize(
    'access',
    invalidInternalJWT,
    {
        domain: 'kidsloop.test',
        maxAge: 10_000,
    }
)

const noContactInfoInternalJWT = sign(
    Object.assign({}, validJWTPayload, { email: undefined, phone: undefined }),
    testInternalIssuer.privateKey,
    {
        algorithm: 'RS256',
        expiresIn: '1h',
    }
)

export const noContactInfoAccessCookie = cookie.serialize(
    'access',
    noContactInfoInternalJWT,
    {
        domain: 'kidsloop.test',
        maxAge: 10_000,
    }
)

export const expiredInternalJWT = sign(
    validJWTPayload,
    testInternalIssuer.privateKey,
    { algorithm: 'RS256', expiresIn: '-10m' }
)

export const expiredAccessCookie = cookie.serialize(
    'access',
    expiredInternalJWT,
    {
        domain: 'kidsloop.test',
        maxAge: 10_000,
    }
)

export const validRefreshPayload = {
    iss: 'test-kidsloop-issuer',
    sub: 'refresh',
    token: {
        id: testUser.id,
        email: testUser.email,
    },
    session_id: 'ed263fd6-da4e-4f98-bc2d-5c15aeee76d7',
}

const validRefreshJWT = sign(
    validRefreshPayload,
    testInternalIssuer.privateKey,
    { algorithm: 'RS256', expiresIn: '1d' }
)

export const validRefreshCookie = cookie.serialize('refresh', validRefreshJWT, {
    path: '/refresh',
    maxAge: 10_000,
})

const noSessionRefreshJWT = sign(
    Object.assign({}, validRefreshPayload, { session_id: undefined }),
    testInternalIssuer.privateKey,
    {
        algorithm: 'RS256',
        expiresIn: '1d',
    }
)

export const noSessionRefreshCookie = cookie.serialize(
    'refresh',
    noSessionRefreshJWT,
    {
        path: '/refresh',
        maxAge: 10_000,
    }
)

// Strip last character from signature to invalidate
const invalidRefreshJWT = sign(
    validRefreshPayload,
    testInternalIssuer.privateKey,
    {
        algorithm: 'RS256',
        expiresIn: '1d',
    }
).slice(0, -1)

export const invalidRefreshCookie = cookie.serialize(
    'refresh',
    invalidRefreshJWT,
    { path: '/refresh', maxAge: 10_000 }
)

export async function createExternalJWT(
    payload: Record<string, unknown>,
    secret: Secret = testExternalIssuer.privateKey
) {
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

export async function createInternalJWT(
    payload: Record<string, unknown>,
    secret: Secret = testInternalIssuer.privateKey
) {
    return new Promise<string>((resolve, reject) => {
        sign(
            payload,
            secret,
            {
                expiresIn: '1m',
                algorithm: 'RS256',
                issuer: 'test-kidsloop-issuer',
            },
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
