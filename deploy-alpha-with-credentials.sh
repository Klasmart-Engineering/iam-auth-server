#!/usr/bin/env bash
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin 871601235178.dkr.ecr.ap-northeast-2.amazonaws.com
docker build -f Dockerfile-With-Credentials -t kidsloop-alpha-auth .
docker tag kidsloop-alpha-auth:latest 871601235178.dkr.ecr.ap-northeast-2.amazonaws.com/kidsloop-alpha-auth:latest
docker push 871601235178.dkr.ecr.ap-northeast-2.amazonaws.com/kidsloop-alpha-auth:latest
aws ecs update-service --service arn:aws:ecs:ap-northeast-2:871601235178:service/kidsloop-alpha/kidsloop-alpha-auth --force-new-deployment --cluster kidsloop-alpha --region ap-northeast-2
