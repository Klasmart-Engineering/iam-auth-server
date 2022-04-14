FROM node:lts-alpine AS base
WORKDIR /usr/src/app
COPY ./package*.json ./

FROM base AS build
RUN npm ci --ignore-scripts
COPY tsconfig*.json ./
COPY src src
RUN npm run build

FROM base AS deps
RUN npm ci --only=production --ignore-scripts

FROM base as release
COPY --from=deps /usr/src/app/node_modules node_modules
COPY --from=build /usr/src/app/dist/ .
COPY ./api.yml ./
ENV PORT=8080
EXPOSE 8080
CMD [ "node", "src/entry.js" ]
