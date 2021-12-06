import { Response as ExpressResponse } from 'express'
import { Response as TestResponse } from 'superagent'

// Superagent Response type doesn't include Express response object,
// but it is specified

export type Response = TestResponse & { res: ExpressResponse }

export function cookiesNotSet(res: Response) {
    expect(res.headers).not.toContain('set-cookie')
}

export function badRequest400(res: Response) {
    expect(res.status).toBe(400)
    expect(res.res.statusMessage).toBe('Invalid Token')
    cookiesNotSet(res)
}
