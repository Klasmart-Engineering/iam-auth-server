import cookie from 'cookie'
import { Response } from 'express'

import config from '../config'

export type ParsedCookie = {
    [key: string]: string
}

export const accessCookie = {
    set(res: Response, token: string) {
        res.cookie('access', token, {
            domain: config.domain,
            httpOnly: true,
            maxAge: config.cookies.access.duration * 1000,
            secure: config.cookies.httpsOnly,
        })
    },
}

export const refreshCookie = {
    set(res: Response, token: string) {
        res.cookie('refresh', token, {
            path: '/refresh',
            httpOnly: true,
            maxAge: config.cookies.refresh.duration * 1000,
            secure: config.cookies.httpsOnly,
        })
    },
}

export function parseCookies(res: Response) {
    const rawCookies = res.headers['set-cookie']
    const cookies: Record<string, ParsedCookie> = {}
    rawCookies.forEach((_cookie: string) => {
        const data = cookie.parse(_cookie)
        if (Object.keys(data).length !== 0) {
            const name = _cookie.substring(0, _cookie.indexOf('=')).trim()
            cookies[name] = data
        }
    })
    return cookies
}
