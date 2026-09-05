FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci || npm install

COPY . .

RUN npm run build

RUN chmod +x /app/start.sh

CMD ["./start.sh"]