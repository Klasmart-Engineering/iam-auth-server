import { issuers } from '../src/jwt'
import { testInternalIssuer, TestIssuerConfig } from './jwt'

export default class OverrideConfig {
    constructor() {
        this.setUp()
    }

    setUp() {
        issuers.set('test-issuer', new TestIssuerConfig())
        process.env.JWT_PRIVATE_KEY = testInternalIssuer.privateKey
        process.env.JWT_PUBLIC_KEY = testInternalIssuer.publicKey
    }

    tearDown() {
        issuers.delete('test-issuer')
    }
}
