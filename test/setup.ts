// Add test issuer config
// Can't include this in `globalSetup` as it doesn't mutate the original hashmap
import { issuers } from '../src/jwt'
import { testExternalIssuer, TestIssuerConfig } from './jwt'

/**
 * In production, we support 3rd party JWT issuers like Google and Badanamu AMS
 * For testing, we need to add a fake 3rd party issuer to avoid using any private key used in production,
 * and enable more representative testing
 */
const addTestIssuer = () => {
    if (!issuers.has(testExternalIssuer.iss)) {
        issuers.set(testExternalIssuer.iss, new TestIssuerConfig())
    }
}

addTestIssuer()
