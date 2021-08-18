import { createConnection } from 'typeorm'

import dbConfig from './config/db'

export async function connectToDB() {
    try {
        const connection = await createConnection(dbConfig)
        console.log('🐘 Connected to postgres')
        return connection
    } catch (e) {
        console.log('❌ Failed to connect or initialize postgres')
        throw e
    }
}
