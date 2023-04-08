# FROM loadimpact/k6
# RUN k6 login cloud -t LI_TOKEN

FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

RUN npm install -g pm2

COPY . .

ENV PORT=8080

EXPOSE 8080

# CMD ["pm2-runtime", "ecosystem.config.js"]
CMD ["npm", "run", "start:prod"]
