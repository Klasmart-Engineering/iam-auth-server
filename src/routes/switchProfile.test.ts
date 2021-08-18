import cookieParser from 'cookie-parser'
import express from 'express'
import { internet } from 'faker'
import supertest from 'supertest'
import { Connection, getConnection } from 'typeorm'
import { TransactionalTestContext } from 'typeorm-transactional-tests'
import { v4 as uuid } from 'uuid'

import OverrideConfig from '../../test/config'
import { TestConnectionManager } from '../../test/connection'
import {
    hasNewSessionID,
    hasSetCookies,
    hasValidCookies,
} from '../../test/cookie'
import {
    invalidAccessCookie,
    noContactInfoAccessCookie,
    testUser,
    validAccessCookie,
    validRefreshPayload,
} from '../../test/jwt'
import { invalidToken401, Response } from '../../test/response'
import { User } from '../entities/user'
import { switchProfile } from './index'

describe('/switch', () => {
    let tempConfig: OverrideConfig
    let connection: Connection
    let transaction: TransactionalTestContext
    let user: User

    beforeAll(async () => {
        tempConfig = new OverrideConfig()
        connection = await TestConnectionManager.create()

        user = new User()
        user.email = testUser.email
        await user.save()
    })

    beforeEach(async () => {
        // TODO fix transactions here
        transaction = new TransactionalTestContext(connection)
        await transaction.start()
    })

    afterEach(async () => {
        await transaction?.finish()
    })

    afterAll(async () => {
        tempConfig.tearDown()
        await TestConnectionManager.clear()
        await TestConnectionManager.close()
    })

    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use('/switch', switchProfile)

    describe('no access cookie', () => {
        it('returns 401 Unauthorized', () => {
            return supertest(app).get('/switch').send().expect(invalidToken401)
        })
    })

    describe('no user_id in request.body', () => {
        it('returns 401 Unauthorized', () => {
            return supertest(app)
                .get('/switch')
                .set('Cookie', [validAccessCookie])
                .send()
                .expect(401)
                .expect((res: Response) => {
                    expect(res.res.statusMessage).toBe('Invalid ID')
                })
        })
    })

    describe('invalid access cookie', () => {
        it('with no email or phone returns 401 Unauthorized', () => {
            return supertest(app)
                .get('/switch')
                .set('Cookie', [noContactInfoAccessCookie])
                .send({ user_id: user.user_id })
                .expect(invalidToken401)
        })

        it('with a non-existant user_id returns 401 Unauthorized', () => {
            return supertest(app)
                .get('/switch')
                .set('Cookie', [validAccessCookie])
                .send({ user_id: uuid() })
                .expect(invalidToken401)
        })

        it('with an existing user_id, but not matching email/phone returns 401 Unauthorized', async () => {
            await User.createQueryBuilder()
                .update()
                .set({ email: internet.email() })
                .where('user_id = :id', { id: user.user_id })
                .execute()

            return supertest(app)
                .get('/switch')
                .set('Cookie', [validAccessCookie])
                .send({ user_id: user.user_id })
                .expect(invalidToken401)
        })

        it('with an invalid signature returns 401 Unauthorized', () => {
            return supertest(app)
                .get('/switch')
                .set('Cookie', [invalidAccessCookie])
                .send({ user_id: user.user_id })
                .expect(invalidToken401)
        })
    })

    describe('valid access cookie', () => {
        it('returns 200 OK and sets new cookies for the chosen user', () => {
            return (
                supertest(app)
                    .get('/switch')
                    .set('Cookie', [validAccessCookie])
                    .send({ user_id: user.user_id })
                    .expect(200)
                    .expect(hasSetCookies)
                    // TODO change this so it checks for the newly created User
                    .expect(hasValidCookies)
                    .expect(hasNewSessionID(validRefreshPayload.session_id))
                    .expect((res: Response) => {
                        // TODO check payload of Access token has the new User ID
                        expect(true).toBe(false)
                    })
            )
        })
    })
})
