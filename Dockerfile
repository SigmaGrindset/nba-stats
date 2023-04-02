# FROM loadimpact/k6
# RUN k6 login cloud -t LI_TOKEN

FROM node:12

WORKDIR /app

COPY package*.json ./

RUN npm install

RUN npm install -g pm2

COPY . .

ENV PORT=8080

EXPOSE 8080

CMD ["pm2-runtime", "processes.json"]
