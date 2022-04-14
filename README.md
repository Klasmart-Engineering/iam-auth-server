# KidsLoop Authentication Server

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org) [![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

📢 Follow the specification covered in [CONTRIBUTING.md](CONTRIBUTING.md) 📢

## API Documentation

Set `API_DOCUMENTATION_ENABLED=true` in your `.env` file.

Start a server, and the docs can be read at http://localhost:8080/docs/

## Dev Setup

### Database

```sh
CONTAINER=auth-server_postgres
docker run -d --name=$CONTAINER -p 5432:5432 -e POSTGRES_PASSWORD=kidsloop postgres
docker container exec -it $CONTAINER psql -U postgres -c "CREATE DATABASE auth_server_test;"
docker container exec -it $CONTAINER psql -U postgres -c "CREATE DATABASE auth_server_dev;"
```

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
