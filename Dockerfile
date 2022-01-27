FROM node:lts-alpine
WORKDIR /usr/src/app
COPY ./package*.json ./
RUN npm ci
RUN npm audit fix
COPY ./src ./src
COPY ./tsconfig.json .
EXPOSE 8080
CMD [ "ts-node", "src/entry.ts" ]