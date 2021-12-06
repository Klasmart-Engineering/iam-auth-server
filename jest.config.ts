import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    globalSetup: './test/globalSetup.ts',
    setupFilesAfterEnv: ['./test/setup.ts'],
}

export default config
