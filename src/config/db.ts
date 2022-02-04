import { ConnectionOptions } from 'typeorm'

const baseDBConfig: ConnectionOptions = {
    name: 'default',
    type: 'postgres',
    synchronize: false,
    entities: ['src/entities/*{.ts,.js}'],
}

export const defaultDBConfig: ConnectionOptions = {
    ...baseDBConfig,
    url: process.env.DATABASE_URL,
    logging: Boolean(process.env.DATABASE_LOGGING),
}

export const testDBConfig: ConnectionOptions = {
    ...baseDBConfig,
    host: 'localhost',
    port: 5432,
    synchronize: true,
    username: 'postgres',
    password: 'kidsloop',
    database: 'auth_server_test',
}
