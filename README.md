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


### Setup the AMS_PUBLIC_KEY variable
You need to copy the public key that you setup in the auth-lambda-funcs setup. Make sure that it is formatted as a multiline yaml string with the pipline char '|' so that the newline characters are maintained.
```
  - name: AMS_PUBLIC_KEY
    value: |
        -----BEGIN PUBLIC KEY-----
        MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA18fOlp2EQKI0aa4B+MJ9
        Ob7reHcXGbfQo2RD9YwBnM6RryAUHpq4hIGmWw5Ch57eW0NBNV3dpkTWr48UKlnV
        8HhEPyJwbXdGo1N+Qh9eo58yb+sgOxMCUXmklpxtprjXjgaH+6ecU4wCk53/jGkI
        t5vvyaQogSmf8NTF95IWuT/DULc6qnB+AFBch4AHgregu3HU2aV0BC1eUdHQCF1o
        XoZOIaGfEXBOy032DzUheVM1UMCw0SNOsm9zJdOpHpGoA67fQcOGt/K8tnl2c3TW
        TZejGprudVsBheQCBh3+3b8yvRxAcOGY2YK/EX/x8jEdOY2cAxu3RnGjSpZSvYyr
        tanZ6z36oFBRSXvKsfzxhSdCZeID8z9EFnHdMK3LnhY6OinuQ7eVPZBzUQVaYBmw
        eXtm8TgI6J0L6j1z8GjpDLYZsX4pS0FKKv/vtca1K+wNe2M2PAndLFUyPYsku1CH
        JaUrn+sR8LJGDibC66ScK3CxLJpgPMVPd5XtyhfS6EmI4wr3SdktqHMxgEVSpjcj
        B+x9tQCFgxEfjMvgKAh/PNoE1CFAE5iPvmYccsZZZ6vKAHmzwhFey1Qqup2A8e11
        cpYDSlLcNMEDoQcUhjv6CsOJBaeKSAWvRKiiM3/ES8D7I9+3/yXKo0B/CTAsrau3
        q/qovQYzU2qEwtMMz65ZZ8MCAwEAAQ==
        -----END PUBLIC KEY-----
```