import { createRequest } from 'node-mocks-http'

import { exampleJWTs } from '../test/jwt'
import { testUser } from '../test/user'
import {
    EmptyTokenError,
    MalformedAuthorizationHeaderError,
    MissingAccountIdentifierError,
    MissingTokenError,
    TokenTypeError,
} from './errors'
import { extractAccountIdentifiers, extractTokenFromRequest } from './jwt'

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

describe('extractAccountIdentifiers', () => {
    describe('when the token has no email, phone or user_name', () => {
        it('should throw a MissingAccountIdentifierError', () => {
            expect(() =>
                extractAccountIdentifiers({
                    email: '',
                    phone: undefined,
                    user_name: undefined,
                })
            ).toThrow(MissingAccountIdentifierError)
        })
    })

    describe('when the token has an email', () => {
        it('should return an object with the email', () => {
            const email = testUser.email
            expect(
                extractAccountIdentifiers({
                    email,
                    phone: undefined,
                    user_name: '',
                })
            ).toEqual({ email })
        })
    })

    describe('when the token has an phone', () => {
        it('should return an object with the phone', () => {
            const phone = testUser.phone
            expect(
                extractAccountIdentifiers({
                    phone,
                    email: undefined,
                    user_name: '',
                })
            ).toEqual({ phone })
        })
    })

    describe('when the token has a user_name', () => {
        it('should return an object with the username', () => {
            const username = testUser.username
            expect(
                extractAccountIdentifiers({
                    user_name: username,
                    phone: undefined,
                    email: '',
                })
            ).toEqual({ username })
        })
    })

    describe('when the token has multiple identifiers', () => {
        it('should return an object with all identifiers', () => {
            const { email, phone } = testUser

            expect(
                extractAccountIdentifiers({ user_name: '', email, phone })
            ).toEqual({ email, phone })
        })
    })
})
