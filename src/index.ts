import app from './app'
import config from './config'

app.listen(config.port, () => {
    console.log(`🌎 Server ready at http://localhost:${config.port}`)
})
