import { createConnection, getConnection } from 'typeorm'

export const connection = {
    options: {
        name: 'default',
        type: 'postgres',
        // TODO use config approach, which defaults to the same as DATABASE_URL but with `test` prefix
        url: process.env.DATABASE_URL,
        entities: ['src/entities/*.ts'],
    },

    async create() {
        await createConnection()
    },

    async close() {
        getConnection().close()
    },

    async clear() {
        const conn = getConnection()
        const entities = conn.entityMetadatas

        entities.forEach(async (entity) => {
            const repository = conn.getRepository(entity.name)
            await repository.query(`DELETE FROM ${entity.tableName}`)
        })
    },
}
