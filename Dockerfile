FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json ./
COPY tsconfig.json ./
COPY .env ./

COPY assets ./assets
COPY prisma ./prisma
COPY templates ./templates
COPY src ./src

RUN npm install -g pnpm
RUN pnpm install

ENTRYPOINT ["/bin/sh", "-c" , "pnpm db:migrate:prod && pnpm commands:reload && pnpm start"]