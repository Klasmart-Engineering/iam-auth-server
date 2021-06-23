import cookie from 'cookie'
import cookieParser from 'cookie-parser'
import express from 'express'
import { verify } from 'jsonwebtoken'
import request from 'supertest'
import validator from 'validator'

import OverrideConfig from '../../test/config'
import { createExternalJWT, testInternalIssuer } from '../../test/jwt'
import { invalidToken400 } from '../../test/response'
import config from '../config'
import transfer from './transfer'

describe('/transfer', () => {
    let tempConfig: OverrideConfig

    beforeAll(() => {
        tempConfig = new OverrideConfig()
    })

    afterAll(() => {
        tempConfig.tearDown()
    })

    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.post('/transfer', transfer)

    describe('responds with 400 Bad Request when', () => {
        it('there is no `token` in the request body', () => {
            return request(app).post('/transfer').send().expect(invalidToken400)
        })

        it('the JWT has no issuer', async () => {
            const token = await createExternalJWT({
                email: 'joe@bloggs.com',
            })
            return request(app)
                .post('/transfer')
                .send({ token })
                .expect(invalidToken400)
        })

        it("the JWT issuer isn't recognised", async () => {
            const token = await createExternalJWT({
                iss: 'invalid',
                email: 'joe@bloggs.com',
            })
            return request(app)
                .post('/transfer')
                .send({ token })
                .expect(invalidToken400)
        })

        it('the JWT signature is invalid', async () => {
            const token = await createExternalJWT({
                iss: 'test-issuer',
                email: 'joe@bloggs.com',
            })
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [header, payload, _signature] = token.split('.')
            return request(app)
                .post('/transfer')
                .send({
                    token: [header, payload, 'invalid-signature'].join('.'),
                })
                .expect(invalidToken400)
        })

        // TODO separate config to check the email/phone behaviours
    })

    describe('responds with 200 OK when', () => {
        it('a valid JWT is provided', async () => {
            const token = await createExternalJWT({
                email: 'joe@bloggs.com',
                iss: 'test-issuer',
            })
            return request(app)
                .post('/transfer')
                .send({ token })
                .expect(200)
                .expect((res) => {
                    const cookies = res.headers['set-cookie']
                    expect(cookies.length).toBe(2)

                    // TODO split this into multiple tests
                    const access = cookie.parse(cookies[0])
                    expect(access).toHaveProperty('access')
                    expect(access).toMatchObject({
                        'Max-Age': config.cookies.access.duration.toString(),
                        Domain: config.domain,
                    })
                    const accessPayload = verify(
                        access.access,
                        testInternalIssuer.publicKey
                    )
                    expect(accessPayload).toMatchObject({
                        email: 'joe@bloggs.com',
                        iss: 'test-kidsloop-issuer',
                    })

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
                    expect(
                        validator.isUUID(refreshPayload.session_id as string)
                    ).toBe(true)
                    expect(refreshPayload).toMatchObject({
                        iss: 'test-kidsloop-issuer',
                        sub: 'refresh',
                    })
                    expect(refreshPayload.token).toMatchObject({
                        email: 'joe@bloggs.com',
                    })
                })
        })
    })
})
