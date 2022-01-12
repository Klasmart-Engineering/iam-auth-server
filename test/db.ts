import { Connection, createConnection } from 'typeorm'

import { testDBConfig } from '../src/config/db'

export const createTestConnection = async (): Promise<Connection> =>
    createConnection(testDBConfig)
