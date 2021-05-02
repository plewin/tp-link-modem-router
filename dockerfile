FROM node:lts-alpine
WORKDIR /home/node
RUN apk --no-cache add curl
RUN curl -s -L -O "https://github.com/plewin/tp-link-modem-router/archive/master.zip"
RUN unzip master.zip
WORKDIR /home/node/tp-link-modem-router-master
RUN yarn install

FROM node:lts-alpine
WORKDIR /home/node/tp-link-modem-router-master
COPY --from=0 /home/node/tp-link-modem-router-master .
CMD ["node", "./api-bridge.js"]