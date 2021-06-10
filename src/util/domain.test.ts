import { compileDomainRegex } from './domain'

describe('CORS domain matching', () => {
    let domainRegex: RegExp
    beforeAll(() => {
        domainRegex = compileDomainRegex('kidsloop.net')
    })

    describe('allowed', () => {
        it('domain with a protocol', () => {
            expect(domainRegex.test('https://kidsloop.net')).toBe(true)
        })

        it('domain with a port', () => {
            expect(domainRegex.test('https://kidsloop.net:8080')).toBe(true)
        })

        it('domain with a subdomain', () => {
            expect(domainRegex.test('https://auth.kidsloop.net')).toBe(true)
        })
    })

    describe('disallowed', () => {
        it('non-matching domain', () => {
            expect(domainRegex.test('https://other-site.com')).toBe(false)
        })
        it('prefix to correct domain', () => {
            expect(domainRegex.test('https://evilkidsloop.net')).toBe(false)
        })
    })
})
