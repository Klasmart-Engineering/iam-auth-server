import cookie from 'cookie'
import type { Express } from 'express'
import { verify } from 'jsonwebtoken'
import passport, { AuthenticateOptions, Strategy } from 'passport'
import request from 'supertest'
import { Connection } from 'typeorm'
import validator from 'validator'

import { createTestConnection } from '../test/db'
import {
    createAzureB2CJWT,
    createExternalJWT,
    testExternalIssuer,
    testInternalIssuer,
    validAzureB2CJWTPayload,
} from '../test/jwt'
import { badRequest400, Response } from '../test/response'
import { testUser } from '../test/user'
import { AuthenticateCallback } from './azureB2C'
import config from './config'
import { AuthServer } from './server'

describe('/transfer', () => {
    const email = testUser.email

    const expectSuccessfulTransfer = (res: Response) => {
        const cookies = res.headers['set-cookie']
        expect(cookies.length).toBe(2)

        const access = cookie.parse(cookies[0])
        expect(access).toHaveProperty('access')
        expect(access).toMatchObject({
            'Max-Age': config.cookies.access.duration.toString(),
            Domain: config.server.domain,
        })
        const accessPayload = verify(
            access.access,
            testInternalIssuer.publicKey
        )
        expect(accessPayload).toMatchObject({
            email,
            iss: testInternalIssuer.iss,
        })
        const accessIsHttpOnly = cookies[0].includes('HttpOnly')
        expect(accessIsHttpOnly).toBe(false)

        const refresh = cookie.parse(cookies[1])
        expect(refresh).toMatchObject({
            'Max-Age': config.cookies.refresh.duration.toString(),
            Path: '/refresh',
        })
        const refreshPayload = verify(
            refresh.refresh,
            testInternalIssuer.publicKey
        ) as Record<string, unknown>
        expect(refreshPayload).toHaveProperty('session_id')
        expect(validator.isUUID(refreshPayload.session_id as string)).toBe(true)
        expect(refreshPayload).toMatchObject({
            iss: testInternalIssuer.iss,
            sub: 'refresh',
        })
        expect(refreshPayload.token).toMatchObject({
            email,
        })
        const refreshIsHttpOnly = cookies[1].includes('HttpOnly')
        expect(refreshIsHttpOnly).toBe(true)
    }

    let app: Express
    let connection: Connection

    beforeAll(async () => {
        connection = await createTestConnection()
        app = await AuthServer.create()
    })

    beforeEach(() => {
        // "/transfer" will log to console on any error, which creates a lot of noise with these tests
        global.console.error = jest.fn()
    })

    afterAll(async () => {
        connection?.close()
    })

    describe('responds with 400 Bad Request when', () => {
        describe('with a 3rd party issuer', () => {
            test('there is no `token` in the request body', () => {
                return request(app)
                    .post('/transfer')
                    .send()
                    .expect(badRequest400)
            })
            test('the JWT has no issuer', async () => {
                const token = await createExternalJWT({
                    email,
                })
                return request(app)
                    .post('/transfer')
                    .send({ token })
                    .expect(badRequest400)
            })
            test("the JWT issuer isn't recognised", async () => {
                const token = await createExternalJWT({
                    iss: 'invalid',
                    email,
                })
                return request(app)
                    .post('/transfer')
                    .send({ token })
                    .expect(badRequest400)
            })
            test('the JWT signature is invalid', async () => {
                const token = await createExternalJWT({
                    iss: testExternalIssuer.iss,
                    email,
                })
                const [header, payload] = token.split('.')
                return request(app)
                    .post('/transfer')
                    .send({
                        token: [header, payload, 'invalid-signature'].join('.'),
                    })
                    .expect(badRequest400)
            })
        })

        describe('with Azure B2C', () => {
            beforeAll(() => {
                passport.authenticate = jest
                    .fn()
                    .mockImplementation(
                        (
                            strategy: string | string[] | Strategy,
                            options: AuthenticateOptions,
                            callback?: AuthenticateCallback
                        ) => callback?.(null, false, 'something went wrong')
                    )
            })

            afterEach(() => {
                jest.clearAllMocks()
            })

            test('passport.authenticate fails', async () => {
                await request(app)
                    .post('/transfer')
                    .set('Authorization', 'Bearer not-valid-JWT')
                    .send()
                    .expect(badRequest400)
            })
        })
    })
    describe('responds with 200 OK when', () => {
        describe('from a 3rd party issuer', () => {
            test('a valid JWT is provided', async () => {
                const token = await createExternalJWT({
                    email,
                    iss: testExternalIssuer.iss,
                })
                return request(app)
                    .post('/transfer')
                    .send({ token })
                    .expect(200)
                    .expect(expectSuccessfulTransfer)
            })
        })

        describe('from Azure B2C', () => {
            beforeAll(() => {
                passport.authenticate = jest
                    .fn()
                    .mockImplementation(
                        (
                            strategy: string | string[] | Strategy,
                            options: AuthenticateOptions,
                            callback?: AuthenticateCallback
                        ) =>
                            // Successful authentication signature
                            callback?.(null, {}, validAzureB2CJWTPayload)
                    )
            })

            afterEach(() => {
                jest.clearAllMocks()
            })

            test('a valid JWT is provided in the Authorization header', async () => {
                const token = await createAzureB2CJWT()

                await request(app)
                    .post('/transfer')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200)
                    .expect(expectSuccessfulTransfer)
            })

            test('a valid JWT is provided as request.body.token', async () => {
                const token = await createAzureB2CJWT()

                await request(app)
                    .post('/transfer')
                    .send({ token: token })
                    .expect(200)
                    .expect(expectSuccessfulTransfer)
            })
        })
    })
})

describe('/docs', () => {
    describe('if enabled', () => {
        let originalIsEnabled: boolean
        beforeEach(() => {
            originalIsEnabled = config.docs.isEnabled
            config.docs.isEnabled = true
        })

        afterEach(() => {
            config.docs.isEnabled = originalIsEnabled
        })

        it('shows the documentation', async () => {
            const app = await AuthServer.create()
            return request(app).get('/docs/').send().expect(200)
        })
    })

    describe('if disabled', () => {
        let originalIsEnabled: boolean
        beforeEach(() => {
            originalIsEnabled = config.docs.isEnabled
            config.docs.isEnabled = false
        })

        afterEach(() => {
            config.docs.isEnabled = originalIsEnabled
        })

        it('returns 404 Not Found', async () => {
            const app = await AuthServer.create()
            return request(app).get('/docs/').send().expect(404)
        })
    })
})
