#!/usr/bin/env node
import fs from 'fs'
import minimist from 'minimist'
import smtpServerLib from 'smtp-server';
import mailparser from 'mailparser';
import axiosBase from 'axios';
import axiosRetry from 'axios-retry';
import logger from './src/logger.mjs'

const axios = axiosBase.create();

// this will be useful to retry some requests, exponential delay
const retryDelay = (retryNumber = 0) => {
  const seconds = Math.pow(2, retryNumber) * 1000;
  const randomMs = 1000 * Math.random();
  return seconds + randomMs;
};

let configFilePath = 'config.json';

axiosRetry(axios, {
  retries: 3,
  retryDelay,
});

const argv = minimist(process.argv.slice(2), {
  string: '_', // prevent string to number conversion
});

if (typeof argv['config'] !== 'undefined') {
  configFilePath = argv['config'];
}

let config ;
try {
  let rawConfig = fs.readFileSync(configFilePath);
  config = JSON.parse(rawConfig);
} catch(exception) {
  console.error('config file ' + configFilePath + ' could not be read');
  process.exit(1);
}

const bearerBuffer = Buffer.from(config.sms_gateway_login + ':' + config.sms_gateway_password, 'utf-8');
const token = bearerBuffer.toString('base64');
const axiosConfig = {
  headers: {
    'Authorization': `Basic ${token}`
  }
};

function sendSms(to, content) {
  const params = new URLSearchParams();
  params.append('to', to);
  params.append('content', content);

  logger.info('Sending SMS', params);

  return axios.post(config.sms_gateway_url + "/api/v1/sms/outbox", params, axiosConfig);
}

function streamToString (stream) {
  const chunks = []
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}

const regex = new RegExp("^\\+?[0-9]+@" + config.sms_gateway_domain + "$","g");

const server = new smtpServerLib.SMTPServer({
    secure: false,
    authOptional: true,
    banner: 'SMTP gateway for SMS API',
    onData(stream, session, callback) {
      const destAddress = session.envelope.rcptTo[0].address;
      const destNumber = destAddress.split('@')[0];

      let content;
      streamToString(stream)
        .then(string => {
          logger.info("Received SMTP payload", {smtpPayload: string});
          return string;
        })
        .then(string => mailparser.simpleParser(string, {}))
        .then(result => sendSms(destNumber, content = result.text.trim()))
        .then(() => {
          logger.info("SMS sent successfully", {to: destNumber, content});
          callback();
        })
        .catch((error) => {
          logger.error("Could not send SMS", error)
          return callback(
            new Error("Could not send SMS")
          );
        });
    },
    onRcptTo(address, _, callback) {
      if (!address.address.match(regex)) {
        return callback(
          new Error("Only xxxxxxxxxx@" + config.sms_gateway_domain + " is allowed to receive mail")
        );
      }
      return callback(); // Accept the address
    }
  });

server.on("error", err => {
  logger.error(err.message);
});
  
server.listen(config.sms_gateway_listen_port, config.sms_gateway_listen_host);