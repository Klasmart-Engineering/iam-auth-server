FROM node:lts-alpine
WORKDIR /usr/src/app
COPY ./package*.json ./
RUN npm ci
# RUN npm audit fix
COPY ./node_modules ./node_modules
COPY ./keys ./keys
COPY ./src ./src
COPY ./tsconfig.json .
EXPOSE 8083
CMD [ "npm", "start" ]