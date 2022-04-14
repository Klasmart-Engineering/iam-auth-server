# KidsLoop Authentication Server

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org) [![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

📢 Follow the specification covered in [CONTRIBUTING.md](CONTRIBUTING.md) 📢

## Summary

This project is responsible for issuing Kidsloop [JWTs](https://jwt.io/introduction), which are used for authentication with downstream APIs e.g. `user-service`.

At a high level, this involves:

-   extracting the payload of a 3rd party JWT from an authentication provider (e.g. [Azure AD B2C](https://docs.microsoft.com/en-us/azure/active-directory-b2c/overview) or [AMS](https://calmisland.atlassian.net/wiki/spaces/SRE/pages/2148171898/AMS+Service)), encoding the payload in a new Kidsloop JWT, and storing these tokens in cookies
-   encoding a specified `user_id` in new access and refresh tokens (completing the authentication journey)
-   refreshing access tokens
-   ending a Kidsloop session (clearing cookies)

## API Documentation

Set `API_DOCUMENTATION_ENABLED=true` in your `.env` file.

Start a server, and the docs can be read at http://localhost:8080/docs/

## Dev Setup

### Environment

#### Server

| Variable                  | Example                                                | Explanation                                                        |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| NODE_ENV                  | development                                            | Enable/disable Express production optimisations & debugging output |
| DATABASE_URL              | postgres://postgres:kidsloop@localhost/auth_server_dev | Database URL for `user-service` database                           |
| DATABASE_LOGGING          | true                                                   | Enable TypeORM logging                                             |
| ROUTE_PREFIX              |                                                        | Prefix for all core API routes                                     |
| DOMAIN                    | alpha.kidsloop.net                                     | CORS whitelist, cookie domain, regex for /refresh?redirect URIs    |
| PORT                      | 8080                                                   | Express server port                                                |
| API_DOCUMENTATION_ENABLED | true                                                   | Show/hide OpenAPI documentation on `/docs` endpoint                |

#### JWT

| Variable                   | Example                                                                 | Explanation                                                      |
| -------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| AWS_SECRET_NAME            | auth-server-top-secret                                                  | Name of secret in AWS Secrets Manager                            |
| JWT_ISSUER                 | calmid-debug                                                            | Generated JWT `iss` claim                                        |
| JWT_SECRET                 | YR+iArLc82-,$qJ5ziF<<.[8`v#yaZ2ot                                       | Secret key for symmetric JWT signing algorithm (e.g. HS256)      |
| JWT_ALGORITHM              | RS256                                                                   | JWT signing algorithm (e.g. RS256, HS256)                        |
| JWT_ACCESS_TOKEN_DURATION  | 900                                                                     | TTL in seconds of `access` cookie/JWT                            |
| JWT_REFRESH_TOKEN_DURATION | 1206000                                                                 | TTL in seconds of `refresh` cookie/JWT                           |
| JWT_COOKIE_ALLOW_HTTP      | true                                                                    | Enable/disable `HttpsOnly` cookie flag                           |
| JWT_PRIVATE_KEY            | -----BEGIN RSA PRIVATE KEY-----\nABCD...\n-----END RSA PRIVATE KEY----- | Private key (on one line) for asymmetric `JWT_ALGORITHM`         |
| JWT_PRIVATE_KEY_FILENAME   | /home/bob/.ssh/id_rsa                                                   | Absolute path to local private key file                          |
| JWT_PRIVATE_KEY_PASSPHRASE | man-plan-canal-panama                                                   | Private key passphrase                                           |
| JWT_PUBLIC_KEY             | -----BEGIN RSA PUBLIC KEY-----\nABCD...\n-----END RSA PUBLIC KEY-----   | Public key (on one line) for asymmetric `JWT_ALGORITHM`          |
| JWT_PUBLIC_KEY_FILENAME    | /home/bob/.ssh/id_rsa.pub                                               | Absolute path to local public key file                           |
| AMS_PUBLIC_KEY             | -----BEGIN PUBLIC KEY-----\nABCDE...\n-----END PUBLIC KEY-----          | Override default (production) AMS public key e.g. beta/local AMS |

Some settings are mutually exclusive (e.g. don't specify both `JWT_PRIVATE_KEY_FILENAME` and `JWT_PRIVATE_KEY`).

Example valid combinations:

Example 1:

```text
JWT_SECRET=abcde
JWT_ALGORITHM=HS256
```

Example 2:

```
JWT_ALGORITHM=RS256
JWT_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----...
JWT_PUBLIC_KEY=-----BEGIN RSA PUBLIC KEY-----...
```

Example 3:

```
AWS_SECRET_NAME=auth-server-secret
```

Example 4:

```text
JWT_ALGORITHM=RS512
JWT_PRIVATE_KEY_FILENAME=/home/bob/.ssh/auth_server
JWT_PRIVATE_KEY_PASSPHRASE=password
JWT_PUBLIC_KEY=-----BEGIN RSA PUBLIC KEY-----...
```

#### Azure B2C

| Variable              | Example                              | Explanation                                                                                                             |
| --------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| AZURE_B2C_ENABLED     | true                                 | Azure B2C feature flag                                                                                                  |
| AZURE_B2C_CLIENT_ID   | 3c75ad44-010c-4b2e-88c3-8148abf00d21 | Client ID of the corresponding Azure application                                                                        |
| AZURE_B2C_TENANT_ID   | 8dc632b7-4df1-4904-a155-7c4663e345bb | Tenant ID                                                                                                               |
| AZURE_B2C_DOMAIN      | login.sso.kidsloop.live              | B2C [custom domain](https://docs.microsoft.com/en-us/azure/active-directory-b2c/custom-domain?pivots=b2c-custom-policy) |
| AZURE_B2C_POLICY_NAME | B2C_1A_RELYING_PARTY_SIGN_UP_LOG_IN  | Name of target B2C policy                                                                                               |
| AZURE_B2C_AUTHORITY   | B2C_1A_RELYING_PARTY_SIGN_UP_LOG_IN  | Issuer authority (with the current configuration, should be the same as `AZURE_B2C_POLICY_NAME`)                        |

### Database

A database connection is required for the server to successfully start, which is used for the `/switch` endpoint.

In production, this service directly accesses the [user-service](https://github.com/KL-Engineering/user-service) database - which is used to validate the specified `user_id` belongs to the account in the JWT (i.e matching `email`/`phone`/`user_name` claim) and therefore the request is authorized.

Locally, you can either point to a running `user-service` DB, or alternatively create a separate database by running:

```sh
CONTAINER=auth-server_postgres
docker run -d --name=$CONTAINER -p 5432:5432 -e POSTGRES_PASSWORD=kidsloop postgres
docker container exec -it $CONTAINER psql -U postgres -c "CREATE DATABASE auth_server_test;"
docker container exec -it $CONTAINER psql -U postgres -c "CREATE DATABASE auth_server_dev;"
```

NB: The [User](src/entities/user.ts) [TypeORM](https://typeorm.io/) entity uses a stub definition of the `user-service` entity, only containing the fields used by this service.
To avoid data loss/accidental migrations, the `synchronize` option is disabled.
This means if you're using a separate database, you will need to temporarily enable `synchronize` or manually setup the table.

### Docker

You can build the production Docker image by running the following commands

```sh
docker build --tag auth-server:latest .
docker run -p 8080:8080 --env-file .env auth-server:latest
```

This image supports either the `AWS_SECRET_NAME` or a combination of `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` environment variables (in addition to the other required `JWT_` variables such as `JWT_ALGORITHM`)

If you want to use local files for your private/public key pair, first rename the keys to `private_key` and `public_key`, and store them in the root of the project.

Then ensure the following is set in your `.env` file

```txt
JWT_PUBLIC_KEY_FILENAME=./public_key
JWT_PRIVATE_KEY_FILENAME=./private_key
```

then run

```sh
docker build --tag auth-server:latest -f Dockerfile-With-Credentials .
docker run -p 8080:8080 --env-file .env auth-server:latest
```
