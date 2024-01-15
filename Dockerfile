FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json ./
COPY tsconfig.json ./
COPY .env ./
COPY prisma ./prisma
COPY src ./src

RUN npm install -g pnpm
RUN pnpm install

ENTRYPOINT ["/bin/sh", "-c" , "pnpm db:migrate && pnpm commands:reload && pnpm start"]