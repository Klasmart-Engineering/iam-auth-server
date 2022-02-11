export class MissingTokenError extends Error {
    constructor() {
        super("Token not found in 'Authorization' header or request.body")
        this.name = 'MissingTokenError'
    }
}

export class MalformedAuthorizationHeaderError extends Error {
    constructor() {
        super("Malformed 'Authorization' header")
        this.name = 'MalformedAuthorizationHeader'
    }
}

export class EmptyTokenError extends Error {
    constructor() {
        super('Token must not be an empty string')
        this.name = 'EmptyTokenError'
    }
}

export class TokenTypeError extends Error {
    constructor() {
        super('Token is not a string')
        this.name = 'TokenTypeError'
    }
}

export class MissingAccountIdentifierError extends Error {
    constructor() {
        super('Token must contain at least one of email/phone/user_name')
        this.name = 'MissingAccountIdentifierError'
    }
}
