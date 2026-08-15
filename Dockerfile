FROM node:22-slim

WORKDIR /app

COPY package*.json ./

# ci installs exactly what the lockfile pins; --omit=dev leaves out cypress,
# jest, gulp and pm2's dev tooling
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/app.js"]
