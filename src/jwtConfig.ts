import { readFileSync } from "fs";
import { Secret, SignOptions } from "jsonwebtoken";
import { accessTokenDuration, refreshTokenDuration } from "./jwt";
import { retrieveJWTKeys } from "./jwtKeyRetriever";

const issuer = process.env.JWT_ISSUER

export interface JwtConfig {
    secretOrPrivateKey: Secret
    accessTokenOptions: SignOptions
    secretOrPublicKey: Secret
    refreshTokenOptions: SignOptions
}

export async function createJwtConfig(): Promise<JwtConfig> {
    validateEnvironmentVariables()

    let algorithmString: string | undefined
    let secret: Secret | undefined
    let publicKey: Secret | undefined
    let privateKeyString: string | undefined
    let privateKeyPassphrase: string | undefined

    const awsSecretName = process.env.AWS_SECRET_NAME
    if (awsSecretName) {
        const keys = await retrieveJWTKeys(awsSecretName)
        algorithmString = keys.algorithm
        privateKeyString = keys.privateKey
        publicKey = keys.publicKey
        privateKeyPassphrase = keys.privateKeyPassphrase
    }
    else if (process.env.JWT_SECRET) {
        algorithmString = process.env.JWT_ALGORITHM;
        secret = process.env.JWT_SECRET
    } else if (process.env.JWT_PRIVATE_KEY || process.env.JWT_PRIVATE_KEY_FILENAME) {
        privateKeyString = process.env.JWT_PRIVATE_KEY_FILENAME ? readFileSync(process.env.JWT_PRIVATE_KEY_FILENAME).toString() : process.env.JWT_PRIVATE_KEY
        if (!privateKeyString) {
            throw new Error(`JWT configuration error - please use either JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_FILENAME to specify private key`)
        }
        publicKey = process.env.JWT_PUBLIC_KEY_FILENAME ? readFileSync(process.env.JWT_PUBLIC_KEY_FILENAME) : process.env.JWT_PUBLIC_KEY
        if (!publicKey) {
            throw new Error(`JWT configuration error - please use either JWT_PUBLIC_KEY_FILENAME or JWT_PUBLIC_KEY to specify public key`)
        }
        privateKeyPassphrase = process.env.JWT_PRIVATE_KEY_PASSPHRASE
        algorithmString = process.env.JWT_ALGORITHM;
    }

    let privateKey: Secret | undefined = privateKeyString
    if (privateKeyPassphrase && privateKeyString) {
        privateKey = { key: privateKeyString, passphrase: privateKeyPassphrase }
    }

    const { secretOrPrivateKey, secretOrPublicKey, algorithm } = validateParameters(algorithmString, secret, privateKey, publicKey)

    const accessTokenOptions = {
        algorithm,
        expiresIn: accessTokenDuration,
        issuer,
        noTimestamp: true,
    }

    const refreshTokenOptions = {
        algorithm,
        issuer,
        expiresIn: refreshTokenDuration,
        subject: "refresh"
    }

    return {
        secretOrPrivateKey,
        accessTokenOptions,
        secretOrPublicKey,
        refreshTokenOptions,
    }
}

function validateEnvironmentVariables() {
    if (process.env.AWS_SECRET_NAME) {
        if (process.env.JWT_SECRET) {
            throw new Error(`JWT configuration error - both AWS_SECRET_NAME and JWT_SECRET enviroment variables were specified. Please choose one or the other.`)
        }
        if (process.env.JWT_PRIVATE_KEY || process.env.JWT_PRIVATE_KEY_FILENAME) {
            throw new Error(`JWT configuration error - both AWS_SECRET_NAME and (JWT_PRIVATE_KEY || JWT_PRIVATE_KEY_FILENAME) enviroment variables were specified. Please choose one or the other.`)
        }
        if (process.env.JWT_PUBLIC_KEY || process.env.JWT_PUBLIC_KEY_FILENAME) {
            throw new Error(`JWT configuration error - both AWS_SECRET_NAME and (JWT_PUBLIC_KEY || JWT_PUBLIC_KEY_FILENAME) enviroment variables were specified. Please choose one or the other.`)
        }
        if (process.env.JWT_ALGORITHM) {
            throw new Error(`JWT configuration error - both AWS_SECRET_NAME and JWT_ALGORITHM enviroment variables were specified. Please choose one or the other.`)
        }
    }
    if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PRIVATE_KEY_FILENAME) {
        throw new Error(`JWT configuration error - please use either JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_FILENAME not both`)
    }
    if (process.env.JWT_PUBLIC_KEY_FILENAME && process.env.JWT_PUBLIC_KEY) {
        throw new Error(`JWT configuration error - please use either JWT_PUBLIC_KEY_FILENAME or JWT_PUBLIC_KEY not both`)
    }
}

function validateParameters(algorithmString?: string, secret?: Secret, privateKey?: Secret, publicKey?: Secret):
    { secretOrPrivateKey: Secret, secretOrPublicKey: Secret, algorithm: "HS256" | "HS384" | "HS512" | "RS256" | "RS384" | "RS512" | "ES256" | "ES384" | "ES512" | "PS256" | "PS384" | "PS512" | "none" | undefined } {
    switch (algorithmString) {
        case "HS256":
        case "HS384":
        case "HS512":
            if (privateKey) {
                throw new Error(`JWT configuration error - can not use '${algorithmString}' algorithm with private key, please set JWT_SECRET enviroment variable`)
            }
            if (!secret) {
                throw new Error(`JWT configuration error - '${algorithmString}' algorithm was provided but a secret was not`)
            }
            return { secretOrPrivateKey: secret, secretOrPublicKey: secret, algorithm: algorithmString }
        case "RS256":
        case "RS384":
        case "RS512":
        case "ES256":
        case "ES384":
        case "ES512":
        case "PS256":
        case "PS384":
        case "PS512":
            if (secret) {
                throw new Error(`JWT configuration error - can not use '${algorithmString}' algorithm with jwt secret key, please set JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_FILENAME enviroment variable`)
            }
            if (!privateKey || !publicKey) {
                throw new Error(`JWT configuration error - '${algorithmString}' algorithm was provided but a public/private key pair was not`)
            }
            return { secretOrPrivateKey: privateKey, secretOrPublicKey: publicKey, algorithm: algorithmString }
        default:
            throw new Error(`JWT algorithm name is invalid: ${algorithmString}`)
    }
}