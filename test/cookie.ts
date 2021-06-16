import { decode, verify } from 'jsonwebtoken'
import validator from 'validator'

import config from '../src/config'
import { parseCookies, ParsedCookie } from '../src/cookies'
import {
    testInternalIssuer,
    validJWTPayload,
    validRefreshPayload,
} from './jwt'
import { Response } from './response'

// TODO resolve typescript issues

const hasParsedCookies = (res: Response): boolean =>
    typeof res.cookies !== 'undefined'

function assertParsedCookies(res: Response) {
    if (!hasParsedCookies(res)) {
        throw Error('hasSetCookies must be called first to parse cookies')
    }
}

export function hasSetCookies(res: Response) {
    const cookies = parseCookies(res.res)
    expect(Object.keys(cookies)).toStrictEqual(['access', 'refresh'])
    // Store cookies on response for further assertions
    res.cookies = cookies
}

export function hasValidAccessCookie(res: Response) {
    assertParsedCookies(res)

    const accessCookie: ParsedCookie = res.cookies['access']
    if (typeof accessCookie === 'undefined') {
        throw Error('access cookie not set')
    }

    const payload = verify(accessCookie.access, testInternalIssuer.publicKey)

    expect(payload).toMatchObject(validJWTPayload)
}

export function hasValidRefreshCookie(res: Response) {
    assertParsedCookies(res)

    const refreshCookie: ParsedCookie = res.cookies['refresh']
    if (typeof refreshCookie === 'undefined') {
        throw Error('refresh cookie not set')
    }

    expect(refreshCookie).toMatchObject({
        'Max-Age': config.cookies.refresh.duration.toString(),
        Path: '/refresh',
    })
    const payload = verify(
        refreshCookie.refresh,
        testInternalIssuer.publicKey
    ) as Record<string, unknown>
    expect(payload).toHaveProperty('session_id')
    expect(validator.isUUID(payload.session_id as string)).toBe(true)
    expect(payload).toMatchObject({
        iss: 'test-kidsloop-issuer',
        sub: 'refresh',
    })
    expect(payload.token).toMatchObject(validRefreshPayload.token)
}

export function hasValidCookies(res: Response) {
    hasValidAccessCookie(res)
    hasValidRefreshCookie(res)
}

export function hasNewSessionID(oldSessionID: string) {
    return function (res: Response) {
        assertParsedCookies(res)

        const payload = decode(res.cookies['refresh'].refresh)
        expect(payload.session_id).not.toBe(oldSessionID)
    }
}
