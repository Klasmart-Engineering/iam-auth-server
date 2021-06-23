import express from 'express'
import request from 'supertest'

import { hasUnsetCookies } from '../../test/cookie'
import { validAccessCookie, validRefreshCookie } from '../../test/jwt'
import signout from './signout'

describe('/signout', () => {
    const app = express()
    app.use('/signout', signout)

    it('clears Kidsloop access and refresh cookies', () => {
        return request(app)
            .post('/signout')
            .set('Cookie', [validAccessCookie, validRefreshCookie])
            .send()
            .expect(200)
            .expect(hasUnsetCookies)
    })
})
