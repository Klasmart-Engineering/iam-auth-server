import cookieParser from 'cookie-parser'
import express from 'express'
import supertest from 'supertest'

import OverrideConfig from '../../test/config'
import {
    hasNewSessionID,
    hasSetCookies,
    hasValidCookies,
} from '../../test/cookie'
import {
    expiredAccessCookie,
    invalidRefreshCookie,
    noSessionRefreshCookie,
    validAccessCookie,
    validRefreshCookie,
    validRefreshPayload,
} from '../../test/jwt'
import { invalidToken401, noCookieSet } from '../../test/response'
import refresh from './refresh'

describe('/refresh', () => {
    let tempConfig: OverrideConfig

    beforeAll(() => {
        tempConfig = new OverrideConfig()
    })

    afterAll(() => {
        tempConfig.tearDown()
    })

    const app = express()
    app.use(cookieParser())
    app.use('/refresh', refresh)

    describe('valid access token', () => {
        it("if not expired returns 200 OK and doesn't overwrite any cookies", () => {
            return supertest(app)
                .get('/refresh')
                .set('Cookie', [validAccessCookie])
                .send()
                .expect(200)
                .expect(noCookieSet)
        })

        it('if expired returns 401 Unauthorized', () => {
            return supertest(app)
                .get('/refresh')
                .set('Cookie', [expiredAccessCookie])
                .send()
                .expect(invalidToken401)
        })
    })

    describe('missing refresh token', () => {
        it('returns 401 Unauthorized', () => {
            return supertest(app).get('/refresh').send().expect(invalidToken401)
        })
    })

    describe('invalid refresh token', () => {
        it('missing `session_id` in token payload returns 401 Unauthorized', () => {
            return supertest(app)
                .get('/refresh')
                .set('Cookie', [noSessionRefreshCookie])
                .send()
                .expect(invalidToken401)
        })

        it('with invalid token signature returns 401 Unauthorized', () => {
            return supertest(app)
                .get('/refresh')
                .set('Cookie', [invalidRefreshCookie])
                .send()
                .expect(invalidToken401)
        })
    })

    describe('valid refresh token', () => {
        it('creates a new access and refresh cookie', () => {
            return supertest(app)
                .get('/refresh')
                .set('Cookie', [validRefreshCookie])
                .send()
                .expect(200)
                .expect(hasSetCookies)
                .expect(hasValidCookies)
                .expect(hasNewSessionID(validRefreshPayload.session_id))
        })

        describe('with a ?redirect queryparam', () => {
            it('on the same domain returns 307 Temporary Redirect', () => {
                // TODO check if this behaviour is actually required
                // as domainRegex will never match `hostname`
                // so this functionality doesn't work
                const redirectUri = 'https://kidsloop.test/another-page'
                return supertest(app)
                    .get('/refresh')
                    .query({ redirect: redirectUri })
                    .set('Cookie', [validRefreshCookie])
                    .send()
                    .expect(307)
                    .expect(hasSetCookies)
                    .expect('Location', redirectUri)
            })

            it("on a different domain doesn't redirect", () => {
                return supertest(app)
                    .get('/refresh')
                    .query({ redirect: 'https://another-domain.com' })
                    .set('Cookie', [validRefreshCookie])
                    .send()
                    .expect(200)
                    .expect(hasSetCookies)
            })

            it("which isn't a valid URL returns 401 Unauthorized", () => {
                return supertest(app)
                    .get('/refresh')
                    .set('Cookie', [validRefreshCookie])
                    .query({ redirect: 1000 })
                    .send()
                    .expect(invalidToken401)
            })
        })
    })
})
