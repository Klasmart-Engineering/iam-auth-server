import * as dotenv from 'dotenv'

dotenv.config({ path: __dirname + '/../.env' })

import { startServer } from './server'

startServer()
