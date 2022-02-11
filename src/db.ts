import { createConnection } from 'typeorm'

import config from './config'
import { User } from './entities/user'
import { extractAccountIdentifiers } from './jwt'
import { IdToken } from './types/token'

export async function connectToDB() {
    try {
        const connection = await createConnection(config.db)
        console.log('🐘 Connected to postgres')
        return connection
    } catch (e) {
        console.log('❌ Failed to connect or initialize postgres')
        throw e
    }
}

export async function switchProfile(
    tokenPayload: IdToken,
    user_id: string
): Promise<IdToken> {
    const accountIdentifiers = extractAccountIdentifiers(tokenPayload)

    await User.findOneOrFail({
        where: Object.entries(accountIdentifiers).map(([field, value]) => {
            return { user_id, [field]: value }
        }),
    })

    return {
        id: user_id,
        ...accountIdentifiers,
    }
}
