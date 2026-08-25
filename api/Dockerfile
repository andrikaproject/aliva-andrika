FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./

RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_PATH=/data/rsvp.sqlite

EXPOSE 4000

CMD ["node", "--experimental-sqlite", "server.js"]
