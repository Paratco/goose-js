FROM node:22 AS builder

# Create app directory
WORKDIR /app
RUN corepack enable

COPY . .

COPY .docker/package.json .docker/yarn.lock ./

RUN yarn install

RUN yarn build


FROM node:22-slim
WORKDIR /app

COPY --from=builder /app/package.json /app/yarn.lock /app/.yarnrc.yml ./

RUN corepack enable && yarn workspaces focus --production --all && \
    yarn cache clean
COPY --chmod=755 --from=builder /app/dist/cli.js ./dist/goose-cli
COPY --from=builder /app/dist/cli.js.map ./dist/goose-cli.map
ENV PATH="$PATH:/app/dist"
CMD [ "goose-cli" ]