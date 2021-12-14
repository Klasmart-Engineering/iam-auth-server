# KidsLoop Authentication Server

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org) [![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

📢 Follow the specification covered in [CONTRIBUTING.md](CONTRIBUTING.md) 📢

### Setting up 
- mkdir keys
- ssh-keygen -t rsa -b 4096 -m PEM -f keys/auth_server.priv
- rm keys/auth_server.priv.pub
- openssl rsa -in keys/auth_server.priv -pubout -outform PEM -out keys/auth_server.pub
- chmod 600 keys/auth_server.priv && chmod 600 keys/auth_server.pub
- copy the public key into jwt.ts
