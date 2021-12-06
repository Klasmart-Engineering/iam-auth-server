import dotenv from 'dotenv'
import path from 'path'

const setup = async () => {
    // NB: Must be an absolute path. Relative paths do not work
    dotenv.config({ path: path.resolve(__dirname, '.env') })
}

export default setup
