import app from './app'
import config from './config'
import { connectToDB } from './db'

async function initialiseDB() {
    await connectToDB()
}

initialiseDB()

app.listen(config.port, () => {
    console.log(`🌎 Server ready at http://localhost:${config.port}`)
})
