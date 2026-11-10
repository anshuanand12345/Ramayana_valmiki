FROM node:22-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts
# Bake the embedding model into the image so cold starts do not download it.
RUN npm run models:download

ENV NODE_ENV=production
EXPOSE 8080
USER node
CMD ["node", "src/server.js"]
