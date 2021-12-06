import { createRequest } from 'node-mocks-http'

import { exampleJWTs } from '../test/jwt'
import {
    EmptyTokenError,
    extractTokenFromRequest,
    MalformedAuthorizationHeaderError,
    MissingTokenError,
    TokenTypeError,
} from './jwt'

describe('extractTokenFromRequest', () => {
    const [jwt, otherJwt] = exampleJWTs

    describe('when there is no token provided in the request', () => {
        it('should throw a MissingTokenError', () => {
            const request = createRequest()

            expect(() => extractTokenFromRequest(request)).toThrow(
                MissingTokenError
            )
        })
    })

    describe('when a Authorization header is specified', () => {
        describe('and uses the correct Bearer format', () => {
            it('should return the token', () => {
                const request = createRequest({
                    headers: { authorization: `Bearer ${jwt}` },
                    body: {
                        token: otherJwt,
                    },
                })

                const { token, location } = extractTokenFromRequest(request)

                expect(token).toEqual(jwt)
                expect(location).toEqual('header')
            })
        })

        describe('and is malformed', () => {
            it('should throw a MalformedAuthorizationHeaderError', () => {
                const request = createRequest({
                    headers: { authorization: `No JWT here` },
                })

                expect(() => extractTokenFromRequest(request)).toThrow(
                    MalformedAuthorizationHeaderError
                )
            })
        })

        describe('and is empty', () => {
            it('should throw an EmptyTokenError', () => {
                const request = createRequest({
                    headers: { authorization: `Bearer ` },
                })

                expect(() => extractTokenFromRequest(request)).toThrow(
                    EmptyTokenError
                )
            })
        })
    })

    describe('when request.body has a "token" property', () => {
        describe('and the token is not empty', () => {
            it('should return the token', () => {
                const request = createRequest({
                    body: {
                        token: jwt,
                    },
                })

                const { token, location } = extractTokenFromRequest(request)

                expect(token).toEqual(jwt)
                expect(location).toEqual('body')
            })
        })

        describe('and the token is empty', () => {
            it('should throw an EmptyTokenError', () => {
                const request = createRequest({
                    body: {
                        token: '',
                    },
                })

                expect(() => extractTokenFromRequest(request)).toThrow(
                    EmptyTokenError
                )
            })
        })

        describe('and the "token" property is not a string', () => {
            it('should throw a TokenTypeError', () => {
                const request = createRequest({
                    body: {
                        token: null,
                    },
                })

                expect(() => extractTokenFromRequest(request)).toThrow(
                    TokenTypeError
                )
            })
        })
    })
})
