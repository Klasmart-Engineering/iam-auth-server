import { ITokenPayload } from 'passport-azure-ad'

export type DecodedToken = Record<string, unknown>

export interface IdToken {
    id?: string
    email?: string
    phone?: string

    // Not used?
    name?: string

    // Only used by google
    given_name?: string
    family_name?: string
}

export interface AzureB2CTokenPayload extends ITokenPayload {
    email?: string
    phone?: string
    user_name?: string
    log_in_name: string
    has_email: boolean
    has_phone: boolean
    has_user_name: boolean
    // Provided in actual JWTs but not present in ITokenPayload type
    tfp: string
    nonce: string
}
