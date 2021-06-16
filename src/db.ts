import { createConnection } from 'typeorm'

export async function connectToDB() {
    try {
        const connection = await createConnection({
            name: 'default',
            type: 'postgres',
            url: process.env.DATABASE_URL,
            synchronize: false,
            logging: Boolean(process.env.DATABASE_LOGGING),
            entities: ['src/entities/*.ts'],
        })
        console.log('🐘 Connected to postgres')
        return connection
    } catch (e) {
        console.log('❌ Failed to connect or initialize postgres')
        throw e
    }
}
