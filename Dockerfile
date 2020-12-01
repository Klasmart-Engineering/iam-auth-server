FROM node:14
WORKDIR /usr/src/app
COPY ./package*.json ./
RUN npm i
COPY ./src ./src
COPY ./tsconfig.json .
COPY ./public_key ./
COPY ./private_key ./
EXPOSE 8080
CMD [ "npm", "start" ]