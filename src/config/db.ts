import { ConnectionOptions } from 'typeorm'

const baseConfig: ConnectionOptions = {
    name: 'default',
    type: 'postgres',
    synchronize: false,
    entities: ['src/entities/*.ts'],
}

const defaultConfig: ConnectionOptions = {
    ...baseConfig,
    url: process.env.DATABASE_URL,
    logging: Boolean(process.env.DATABASE_LOGGING),
}

const testConfig: ConnectionOptions = {
    ...baseConfig,
    host: 'localhost',
    port: 5432,
    synchronize: true,
    username: 'postgres',
    password: 'kidsloop',
    database: 'test_auth',
}

export default process.env.NODE_ENV === 'test' ? testConfig : defaultConfig
