import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import {
	accessTokenDuration,
	httpsOnlyCookie,
	JwtService,
	refreshTokenDuration,
	transferToken,
} from "./jwt";
import { RefreshTokenManager } from "./refreshToken";
import { validateString } from "./util/validate";
import cookieParser from "cookie-parser";
import cors, { CorsOptions } from "cors"
import { decode } from "jsonwebtoken";
import { createJwtConfig } from "./jwtConfig";
import escapeStringRegexp from "escape-string-regexp"
import { connectToDB, switchProfile } from "./db";

const domain = process.env.DOMAIN || ""
if(!domain) { throw new Error(`Please specify the DOMAIN enviroment variable`) }

const domainRegex = new RegExp(`^(.*\.)?${escapeStringRegexp(domain)}(:[0-9]+)?$`)
const routePrefix = process.env.ROUTE_PREFIX || ""

export class AuthServer {
	public static async create() {
		const jwtConfig = await createJwtConfig();
		const jwtService = JwtService.create(jwtConfig);
		const dbconnection = await connectToDB();
		const tokenManager = RefreshTokenManager.create(jwtService);
		const server = new AuthServer(tokenManager, jwtService);

		const jsonParser = bodyParser.json();

		const corsConfiguration: CorsOptions = {
			allowedHeaders: ["Authorization", "Content-Type"],
			credentials: true,
			origin: (origin, callback) => {
				try {
					if (!origin) { console.log(origin, false); callback(null, false); return }
					const match = origin.match(domainRegex)
					callback(null, Boolean(match))
				} catch (e) {
					console.log(e)
					callback(e)
				}
			}
		}

		const app = express()
		app.use(cookieParser())
		app.use(jsonParser)
		app.get('/.well-known/express/server-health', (req, res) => { res.status(200); res.end() })
		app.post(`${routePrefix}/transfer`, (req, res) => server.transfer(req, res))
		app.all(`${routePrefix}/switch`, cors(corsConfiguration), (req, res) => server.switchProfile(req, res))
		app.all(`${routePrefix}/refresh`, cors(corsConfiguration), (req, res) => server.refresh(req, res))
		app.all(`${routePrefix}/signout`, cors(corsConfiguration), (req, res) => server.signOut(req, res))


		return new Promise<AuthServer>((resolve, reject) => {
			const port = process.env.PORT || 8080;
			app.listen(port, () => {
				console.log(`🌎 Server ready at http://localhost:${port}`);
				resolve(server);
			});
		});
	}

	private refreshTokenManager: RefreshTokenManager;
	private jwtService: JwtService;
	private constructor(tokenManager: RefreshTokenManager, jwtService: JwtService) {
		this.refreshTokenManager = tokenManager;
		this.jwtService = jwtService;
	}

	private async transfer(req: Request, res: Response) {
		try {
			const encodedToken = validateString(req.body.token);
			if (!encodedToken) {
				throw new Error("No token");
			}
			const session_name = req.get("User-Agent") || "Unkown Device";

			const token = await transferToken(encodedToken);

			const accessToken = await this.jwtService.signAccessToken(token);
			const refreshToken = await this.refreshTokenManager.createSession(
				session_name,
				token
			);
			this.setTokenCookies(res, refreshToken, accessToken);

			res.status(200);
			res.end();
			return;
		} catch (e) {
			console.error(e);
			res.statusMessage = "Invalid Token";
			res.status(400);
			res.end();
		}
	}

	private async switchProfile(req: Request, res: Response) {
		try {
			const previousEncodedAccessToken = validateString(req.cookies.access);
			if (!previousEncodedAccessToken) {
				throw new Error("No token");
			}
			
			const user_id = validateString(req.body.user_id);
			if(!user_id) {
				res.statusMessage = "Invalid ID";
				res.status(401).end()
				return;
			}
			const previousAccessToken = await this.jwtService.verifyAccessToken(previousEncodedAccessToken)
			
			const session_name = req.get("User-Agent") || "Unkown Device";
			const newToken = await switchProfile(previousAccessToken, user_id)
			const accessToken = await this.jwtService.signAccessToken(newToken);
			const refreshToken = await this.refreshTokenManager.createSession(session_name, newToken);
			this.setTokenCookies(res, refreshToken, accessToken)

			res.status(200);
			res.end();
			return;
		} catch(e) {
			console.error(e);
			res.statusMessage = "Invalid Token";
			res.status(401);
			res.end();
		}
	}

	private async refresh(req: Request, res: Response) {
		try {
			const previousEncodedAccessToken = validateString(req.cookies.access);
			if (previousEncodedAccessToken) {
				const accessToken = await this.jwtService.verifyAccessToken(previousEncodedAccessToken).catch((e) => undefined)
				if (accessToken) {
					res.status(200)
						.json(accessToken)
						.end()
					return
				}
			}

			const session_name = req.get("User-Agent") || "Unkown Device";
			const previousEncodedRefreshToken = validateString(req.cookies.refresh);
			if (!previousEncodedRefreshToken) {
				throw new Error("No token");
			}

			const {
				encodedAccessToken,
				encodedRefreshToken,
			} = await this.refreshTokenManager.refreshSession(
				session_name,
				previousEncodedRefreshToken
			);
			this.setTokenCookies(res, encodedRefreshToken, encodedAccessToken);
			if (typeof req.query.redirect === "string") {
				const url = new URL(req.query.redirect);
				console.log("redirectUrl", url)
				if (url.hostname.match(domainRegex)) {
					res.redirect(req.query.redirect, 307);
					return
				}
			}
			const accessToken = decode(encodedAccessToken)

			res.status(200)
				.json(accessToken)
				.end();
		} catch (e) {
			console.error(e);
			res.statusMessage = "Invalid Token";
			res.status(401);
			res.end();
		}
	}

	private signOut(req: Request, res: Response) {
		try {
			res.clearCookie("access", { domain })
				.clearCookie("refresh", { path: "/refresh" })
				.status(200)
				.end()
		} catch (e) {
			console.error(e)
			res.status(500).end()
		}
	}

	private setTokenCookies(
		res: Response,
		refreshToken: string,
		accessToken: string
	) {
		res.cookie("access", accessToken, {
			domain,
			httpOnly: true,
			maxAge: accessTokenDuration*1000,
			secure: httpsOnlyCookie,
		});
		res.cookie("refresh", refreshToken, {
			path: "/refresh",
			httpOnly: true,
			maxAge: refreshTokenDuration*1000,
			secure: httpsOnlyCookie,
		});
	}
}
