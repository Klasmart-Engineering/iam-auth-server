import cookie from 'cookie'
import express from 'express'
import request from 'supertest'

import signout from './signout'

describe('/signout', () => {
    const accessCookie = cookie.serialize('access', 'letmein', {
        domain: 'alpha.kidsloop.net',
        maxAge: 900,
    })
    const refreshCookie = cookie.serialize('refresh', 'reinvigorate', {
        path: '/refresh',
        maxAge: 10_000,
    })

    const app = express()
    app.use('/signout', signout)

    it('clears Kidsloop access and refresh cookies', () => {
        request(app)
            .post('/signout')
            .set('Cookie', [accessCookie, refreshCookie])
            .send()
            .expect(200)
            .expect(
                'Set-Cookie',
                cookie.serialize('access', '', {
                    domain: 'alpha.kidsloop.net',
                    expires: new Date(),
                })
            )
            .expect(
                'Set-Cookie',
                cookie.serialize('refresh', '', {
                    path: '/refresh',
                    expires: new Date(),
                })
            )
    })
})
