#!/usr/bin/env bash
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin 494634321140.dkr.ecr.ap-northeast-2.amazonaws.com
docker build -t kidsloop-beta-auth .
docker tag kidsloop-beta-auth:latest 494634321140.dkr.ecr.ap-northeast-2.amazonaws.com/kidsloop-beta-auth:latest
docker push 494634321140.dkr.ecr.ap-northeast-2.amazonaws.com/kidsloop-beta-auth:latest
aws ecs update-service --service arn:aws:ecs:ap-northeast-2:494634321140:service/beta-hub/kidsloop-beta-auth --force-new-deployment --cluster beta-hub