import { Request, Response } from "express"
import { DynamoDB } from "aws-sdk"
import { compare } from "bcrypt"
import { accessTokenDuration, refreshTokenDuration, signAccessToken, signRefreshToken } from "../jwt"

const domain = process.env.DOMAIN
const AccountsTable = process.env.ACCOUNTS_TABLE || "accounts_alphabeta"
const EmailTable = process.env.EMAIL_TABLE || "account_emails_alphabeta"
const PhoneTable = process.env.PHONE_TABLE || "account_phonenumbers_alphabeta"

const service = new DynamoDB({ region: "ap-northeast-1" })
const dynamoDB = new DynamoDB.DocumentClient({ service })


export async function login(req: Request, res: Response) {
    try {
        console.log("login")
        const username = req.body.username as string
        const password = req.body.password as string

        if (!validString(password)) {
            res.status(400)
            res.json({ error: "Invalid Password" })
            return
        }

        const id = await resolveId(username, res)
        if(!id) { return }
        
        const row = await dynamoDB.get({
            Key: { id },
            TableName: AccountsTable
        }).promise()
        if(!row.Item) { throw new Error(`Could not locate account from Id(${id}) and username(${username})`) }
        console.log(row.Item)
        const pwHash = validString(row.Item.pwHash)
        if(!pwHash) { throw new Error(`Could not get pwHash from accountId(${id}), username(${username})`) }
        const result = await compare(password, pwHash)
        if(!result) {
            res.status(403)
            res.json({ error: "Incorrect Password" })
            return
        }
        console.log("Correct")
        const accessJwt = await signAccessToken({id})
        console.log(accessJwt)
        const refreshJwt = await signRefreshToken({id})
        console.log(refreshJwt)
        res.cookie("access", accessJwt, {domain, httpOnly: true, maxAge: accessTokenDuration})
        res.cookie("refresh", refreshJwt, {path: "/refresh", httpOnly: true, maxAge: refreshTokenDuration, secure: true})
        res.status(200)
        res.end()
    } catch (e) {
        console.error(e)
        res.status(500)
        res.json({ error: "Server Error" })
    }
}

async function resolveId(username: any | undefined, res: Response) {
    const email = validString(username)
    try {
        if (!email) {
            res.status(400)
            res.json({ error: "Invalid email" })
            return
        }

        console.log("request")
        const row = await dynamoDB.get({
            Key: { email },
            TableName: EmailTable,
        }).promise()

        console.log(row.Item)
        if (!row.Item) {
            res.status(400)
            res.json({ error: "Invalid email" })
            return
        }

        if (!row.Item.accId) {throw new Error(`Can not locate accountId for email('${email}')`)}
        return validString(row.Item.accId)
    } catch (e) {
        console.error(e)
        res.status(500)
        res.json({ error: "Internal Server Error" })
        return
    }
}

function validString(username?: any): string | false {
    if (!username) { return false }
    if (typeof username !== "string") { return false }
    if (username.length > 1024) { return false }
    return username
}