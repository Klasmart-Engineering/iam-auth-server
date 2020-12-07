import { SecretsManager } from "aws-sdk"

const client = new SecretsManager();

export async function retrieveJWTKeys(secretName: string) {
    try {
        const response = await client.getSecretValue({ SecretId: secretName }).promise();
        const secret = response.SecretString;
        if (!secret) throw new Error("The returned secret is undefined.");
        const keys = JSON.parse(secret);
        return {
            algorithm: keys["ALGORITHM"]?.replace(/\\n/gm, '\n') as string | undefined,
            privateKey: keys["PRIVATE_KEY"]?.replace(/\\n/gm, '\n') as string | undefined,
            publicKey: keys["PUBLIC_KEY"]?.replace(/\\n/gm, '\n') as string | undefined,
            privateKeyPassphrase: keys["PRIVATE_KEY_PASSPHRASE"]?.replace(/\\n/gm, '\n') as string | undefined,
        }
    } catch (err) {
        if (err.code === 'DecryptionFailureException')
            // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'InternalServiceErrorException')
            // An error occurred on the server side.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'InvalidParameterException')
            // You provided an invalid value for a parameter.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'InvalidRequestException')
            // You provided a parameter value that is not valid for the current state of the resource.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'ResourceNotFoundException')
            // We can't find the resource that you asked for.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else {
            throw err;
        }
    }
}