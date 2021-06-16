import { Response as ExpressResponse } from 'express'
import { Response as TestResponse } from 'superagent'

// Superagent Response type doesn't include Express response object,
// but it is specified
export type Response = TestResponse & { res: ExpressResponse }

export function noCookieSet(res: Response) {
    expect(!('set-cookie' in res.headers))
}

export function invalidToken400(res: Response) {
    expect(res.status).toBe(400)
    expect(res.res.statusMessage).toBe('Invalid Token')
    noCookieSet(res)
}

export function invalidToken401(res: Response) {
    expect(res.status).toBe(401)
    expect(res.res.statusMessage).toBe('Invalid Token')
    noCookieSet(res)
}
