from node:23-alpine3.20

WORKDIR /app
COPY package.json .
RUN npm install --omit=dev
COPY . . 

CMD [ "npm","start" ]