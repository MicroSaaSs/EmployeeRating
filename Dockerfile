FROM node:24.22.1-bookworm-slim AS build
WORKDIR /app
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm ci --prefix client && npm ci --prefix server
COPY client ./client
COPY server ./server
ARG VITE_SUPPORT_EMAIL
ENV VITE_SUPPORT_EMAIL=$VITE_SUPPORT_EMAIL
RUN npm run build --prefix client && npm run build --prefix server

FROM node:24.22.1-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/migrations ./migrations
COPY --from=build /app/client/build /app/client/build
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
