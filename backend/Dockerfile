FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node index.mjs server.mjs ./
USER node
EXPOSE 3000
CMD ["node", "index.mjs"]
