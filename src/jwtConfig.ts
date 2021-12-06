import { readFileSync } from 'fs'
import { Secret, SignOptions } from 'jsonwebtoken'

import config from './config'
import { retrieveJWTKeys } from './jwtKeyRetriever'

export interface JwtConfig {
    secretOrPrivateKey: Secret
    accessTokenOptions: SignOptions
    secretOrPublicKey: Secret
    refreshTokenOptions: SignOptions
}

export async function createJwtConfig(): Promise<JwtConfig> {
    let algorithm: string
    let secretOrPrivateKey: Secret
    let secretOrPublicKey: Secret

    const awsSecretName = process.env.AWS_SECRET_NAME
    if (awsSecretName) {
        if (process.env.JWT_SECRET) {
            throw new Error(
                `JWT configuration error - both AWS_SECRET_NAME and JWT_SECRET enviroment variables were specified. Please choose one or the other.`
            )
        }
        if (
            process.env.JWT_PRIVATE_KEY ||
            process.env.JWT_PRIVATE_KEY_FILENAME
        ) {
            throw new Error(
                `JWT configuration error - both AWS_SECRET_NAME and (JWT_PRIVATE_KEY || JWT_PRIVATE_KEY_FILENAME) enviroment variables were specified. Please choose one or the other.`
            )
        }
        if (process.env.JWT_PUBLIC_KEY || process.env.JWT_PUBLIC_KEY_FILENAME) {
            throw new Error(
                `JWT configuration error - both AWS_SECRET_NAME and (JWT_PUBLIC_KEY || JWT_PUBLIC_KEY_FILENAME) enviroment variables were specified. Please choose one or the other.`
            )
        }
        if (process.env.JWT_ALGORITHM) {
            throw new Error(
                `JWT configuration error - both AWS_SECRET_NAME and JWT_ALGORITHM enviroment variables were specified. Please choose one or the other.`
            )
        }

        const keys = await retrieveJWTKeys(awsSecretName)
        const passphrase =
            keys.passphrase || process.env.JWT_PRIVATE_KEY_PASSPHRASE
        algorithm = keys.algorithm
        secretOrPrivateKey = passphrase
            ? {
                  key: keys.privateKey,
                  passphrase: process.env.JWT_PRIVATE_KEY_PASSPHRASE,
              }
            : keys.privateKey
        secretOrPublicKey = keys.publicKey
    } else {
        switch (process.env.JWT_ALGORITHM) {
            case 'HS256':
            case 'HS384':
            case 'HS512':
                algorithm = process.env.JWT_ALGORITHM
                if (
                    process.env.JWT_PRIVATE_KEY ||
                    process.env.JWT_PRIVATE_KEY_FILENAME
                ) {
                    throw new Error(
                        `JWT configuration error - can not use '${algorithm}' algorithm with private key, please set JWT_SECRET enviroment variable`
                    )
                }
                if (!process.env.JWT_SECRET) {
                    throw new Error(
                        `JWT algorithm '${algorithm}' requires a secret please set the JWT_SECRET enviroment variable`
                    )
                }
                secretOrPrivateKey = process.env.JWT_SECRET
                secretOrPublicKey = process.env.JWT_SECRET
                break
            case 'RS256':
            case 'RS384':
            case 'RS512':
            case 'ES256':
            case 'ES384':
            case 'ES512':
            case 'PS256':
            case 'PS384':
            case 'PS512': {
                algorithm = process.env.JWT_ALGORITHM
                if (process.env.JWT_SECRET) {
                    throw new Error(
                        `JWT configuration error - can not use '${algorithm}' algorithm with jwt secret key, please set JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_FILENAME enviroment variable`
                    )
                }
                if (
                    process.env.JWT_PRIVATE_KEY &&
                    process.env.JWT_PRIVATE_KEY_FILENAME
                ) {
                    throw new Error(
                        `JWT configuration error - please use either JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_FILENAME not both`
                    )
                }
                if (
                    process.env.JWT_PUBLIC_KEY_FILENAME &&
                    process.env.JWT_PUBLIC_KEY
                ) {
                    throw new Error(
                        `JWT configuration error - please use either JWT_PUBLIC_KEY_FILENAME or JWT_PUBLIC_KEY not both`
                    )
                }
                const privateKey = process.env.JWT_PRIVATE_KEY_FILENAME
                    ? readFileSync(process.env.JWT_PRIVATE_KEY_FILENAME)
                    : process.env.JWT_PRIVATE_KEY
                if (!privateKey) {
                    throw new Error(
                        `JWT configuration error - please use either JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_FILENAME to specify private key`
                    )
                }
                const publicKey = process.env.JWT_PUBLIC_KEY_FILENAME
                    ? readFileSync(process.env.JWT_PUBLIC_KEY_FILENAME)
                    : process.env.JWT_PUBLIC_KEY
                if (!publicKey) {
                    throw new Error(
                        `JWT configuration error - please use either JWT_PUBLIC_KEY_FILENAME or JWT_PUBLIC_KEY to specify public key`
                    )
                }
                secretOrPrivateKey = process.env.JWT_PRIVATE_KEY_PASSPHRASE
                    ? {
                          key: privateKey,
                          passphrase: process.env.JWT_PRIVATE_KEY_PASSPHRASE,
                      }
                    : privateKey
                secretOrPublicKey = publicKey
                break
            }
            default:
                throw new Error('JWT Token not configured')
        }
    }

    const accessTokenOptions = {
        algorithm,
        expiresIn: config.cookies.access.duration,
        issuer: config.jwt.issuer,
        noTimestamp: true,
    } as SignOptions

    const refreshTokenOptions = {
        algorithm,
        issuer: config.jwt.issuer,
        expiresIn: config.cookies.refresh.duration,
        subject: 'refresh',
    } as SignOptions

    return {
        secretOrPrivateKey,
        accessTokenOptions,
        secretOrPublicKey,
        refreshTokenOptions,
    }
}
