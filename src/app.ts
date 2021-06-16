import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { Request } from 'express'

import config, { corsConfiguration } from './config'
import { refresh, signout, switchProfile, transfer } from './routes'

const app = express()
app.use(cookieParser())
app.use(express.json())

app.get('/.well-known/express/server-health', (req, res) => {
    res.status(200)
    res.end()
})

app.post(`${config.routePrefix}/transfer`, transfer)

const router = express.Router()

router.use(cors<Request>(corsConfiguration))

app.all('/switch', switchProfile)
app.all('/refresh', refresh)
app.all('/signout', signout)

app.use(config.routePrefix, router)

export default app
