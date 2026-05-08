# ── Server ────────────────────────────────────────────────────
FROM node:22-alpine AS server
WORKDIR /app
COPY server/package*.json ./server/
# Install ALL deps (tsx is a devDep needed for runtime)
RUN cd server && npm ci
COPY server/ ./server/
COPY shared/ ./shared/
EXPOSE 9001
CMD ["npm", "--prefix", "server", "run", "dev"]

# ── Client Build ──────────────────────────────────────────────
FROM node:22-alpine AS client-build
WORKDIR /app
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
COPY shared/ ./shared/

RUN cd client && npm run build

FROM nginx:alpine AS client
COPY --from=client-build /app/client/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
