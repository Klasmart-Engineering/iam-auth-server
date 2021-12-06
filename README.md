# KidsLoop Authentication Server

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org) [![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

📢 Follow the specification covered in [CONTRIBUTING.md](CONTRIBUTING.md) 📢

## Dev Setup

### Database

```sh
CONTAINER=auth-server_postgres
docker run -d --name=$CONTAINER -p 5432:5432 -e POSTGRES_PASSWORD=kidsloop postgres
docker container exec -it $CONTAINER psql -U postgres -c "CREATE DATABASE auth_server_test;"
docker container exec -it $CONTAINER psql -U postgres -c "CREATE DATABASE auth_server_dev;"
```
