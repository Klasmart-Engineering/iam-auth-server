import { createConnection } from 'typeorm'

import config from './config'
import { User } from './entities/user'
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
    previousAccessToken: IdToken,
    user_id: string
): Promise<IdToken> {
    const email = previousAccessToken.email
    const phone = previousAccessToken.phone
    if (!email && !phone) {
        throw new Error('Access token does not contain valid email or phone')
    }

    await User.findOneOrFail({
        where: [
            { user_id, email },
            { user_id, phone },
        ],
    })

    return {
        id: user_id,
        email,
        phone,
    }
}
