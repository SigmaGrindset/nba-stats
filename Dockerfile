# FROM loadimpact/k6
# RUN k6 login cloud -t LI_TOKEN

FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

RUN npm install -g pm2


COPY . .

ENV PORT=3000

EXPOSE 3000

# CMD ["npm", "run", "start:dev"]
CMD ["pm2-runtime", "ecosystem.config.js"]
