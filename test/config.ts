import config from '../src/config'
import { issuers } from '../src/jwt'
import { testInternalIssuer, TestIssuerConfig } from './jwt'

// TODO dynamic configuration based on NODE_ENV, using config library e.g. convict

export default class OverrideConfig {
    algorithm: string | undefined
    issuer: string | undefined
    privateKey: string | undefined
    publicKey: string | undefined
    domain: string

    constructor() {
        this.setUp()
    }

    setUp() {
        issuers.set('test-issuer', new TestIssuerConfig())
        ;({
            JWT_ALGORITHM: this.algorithm,
            JWT_PRIVATE_KEY: this.privateKey,
            JWT_PUBLIC_KEY: this.publicKey,
            JWT_ISSUER: this.issuer,
        } = process.env)
        this.domain = config.domain
        config.domain = 'kidsloop.test'

        process.env.JWT_ISSUER = 'test-kidsloop-issuer'
        process.env.JWT_ALGORITHM = 'RS256'
        process.env.JWT_PRIVATE_KEY = testInternalIssuer.privateKey
        process.env.JWT_PUBLIC_KEY = testInternalIssuer.publicKey
    }

    tearDown() {
        issuers.delete('test-issuer')
        process.env.JWT_ALGORITHM = this.algorithm
        process.env.JWT_PRIVATE_KEY = this.privateKey
        process.env.JWT_PUBLIC_KEY = this.publicKey
        process.env.JWT_ISSUER = this.issuer
        config.domain = this.domain
    }
}
