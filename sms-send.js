#!/usr/bin/env node
// Send SMS via router

import fs from 'fs'
import minimist from 'minimist'
import RouterClient from './src/routerClient.mjs'
import { TP_ACT, TP_CONTROLLERS } from './src/routerProtocol.mjs'

// change these values if you do not want to provide them as args
// using the config.json file is recommended
let routerUiUrl = 'http://192.168.1.1';
let routerUiLogin = 'admin';
let routerUiPassword = 'myrouterpassword';
let configFilePath = 'config.json';

const argv = minimist(process.argv.slice(2), {
  string: '_', // prevent string to number conversion
});

if (argv['_'].length !== 2) {
  console.error('This command requires 2 arguments, a number and a string text message');
  console.error('Example: $self --url="http://192.168.1.1" --login=admin --password=myrouterpassword 0612345678 "my text message"');
  console.error('Example: $self --config=/tmp/config.json 0612345678 "my text message"');
  console.error('Example: $self 0612345678 "my text message"');
  process.exit(1);
}

if (typeof argv['config'] !== 'undefined') {
  configFilePath = argv['config'];
}

try {
  let rawConfig = fs.readFileSync(configFilePath);
  let config = JSON.parse(rawConfig);
  routerUiUrl = config.url;
  routerUiLogin = config.login;
  routerUiPassword = config.password;
} catch(exception) {
  console.log('config file ' + configFilePath + ' could not be read, skipping')
}

if (typeof argv['url'] !== 'undefined') {
  routerUiUrl = argv['url'];
}

if (typeof argv['login'] !== 'undefined') {
  routerUiLogin = argv['login'];
}

if (typeof argv['password'] !== 'undefined') {
  routerUiPassword = argv['password'];
}

const to = argv['_'][0];
const textContent = argv['_'][1];

console.log('args', {
  routerUiUrl,
  routerUiLogin,
  routerUiPassword,
  to,
  textContent,
});

const client = new RouterClient(routerUiUrl, routerUiLogin, routerUiPassword);

const payloadSendSms = {
  method: TP_ACT.ACT_SET,
  controller: TP_CONTROLLERS.LTE_SMS_SENDNEWMSG,
  attrs: {
    'index': 1,
    to,
    textContent,
  }
}

const payloadGetSendSmsResult = {
  method: TP_ACT.ACT_GET,
  controller: TP_CONTROLLERS.LTE_SMS_SENDNEWMSG,
  attrs: [
    'sendResult'
  ]
}

client
  .connect()
  .then(_ => client.execute(payloadSendSms))
  .then(verify_submission)
  .then(_ => client.execute(payloadGetSendSmsResult))
  .then(verify_submission_result)
  .then(_ => client.disconnect())
  .catch(function (error) {
    // handle error, exit failure
    console.log(error);
    process.exit(1);
  });

function verify_submission(result) {
  if (result.error === 0) {
    console.log("Great! SMS send operation was accepted.")
  } else {
    // hopefully we will never have this error
    throw new Error('SMS send operation was not accepted');
  }
}

function verify_submission_result(result) {
  if (result.error === 0 && result.data[0]['sendResult'] === 1) {
    console.log("Great! SMS sent successfully");
  } else if (result.error === 0 && result.data[0]['sendResult'] === 3) {
    //TODO sendResult=3 means queued or processing ??
    console.log("Warning: SMS sending was accepted but not yet processed.");
  } else {
    console.log("Error: SMS could not be sent by router");
  }
}
