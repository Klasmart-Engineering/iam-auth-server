import { Connection, createConnection, getConnection } from 'typeorm'

import dbConfig from '../src/config/db'

type ITestConnectionManager = {
    create(): Promise<Connection>
    close(): Promise<void>
    clear(): Promise<void>
}

export const TestConnectionManager: ITestConnectionManager = {
    async create() {
        return createConnection(dbConfig)
    },

    async close() {
        return getConnection().close()
    },

    async clear() {
        const conn = getConnection()
        const entities = conn.entityMetadatas

        entities.forEach(async (entity) => {
            const repository = conn.getRepository(entity.name)
            await repository.clear()
        })
    },
}
