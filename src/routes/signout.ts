import { Request, Response } from 'express'

import config from "../config"

export default function signout(req: Request, res: Response) {
    try {
        res.clearCookie('access', { domain: config.domain })
            .clearCookie('refresh', { path: '/refresh' })
            .status(200)
            .end()
    } catch (e) {
        console.error(e)
        res.status(500).end()
    }
}
