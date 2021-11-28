# Goodies for Archer LTE routers

## Features

### Implemented

* Easy to use script to send SMS
* Easy to use script to receive SMS
* REST API bridge for managing and sending SMS
* SMTP to SMS gateway

## Installation and requirements

You need `nodejs` and `yarn`. Install them first.

```bash
# clone this repository and execute to install required dependencies
yarn install
``` 

## Usage

### Limitations and warnings

* Bridge API is subject to change without warnings.
* Special characters work but careful how you escape them in your shell command.
* Script and API must be in the same network of the router (IP is verified by the router's backend).
* You should avoid connecting to the router web UI while using these tools because it might cause unexpected behaviors.
* Time and timezone must be configured on router for accurate received SMS times.

### Send SMS command

```bash
# example passing all arguments as command line args
./sms-send.js --url="http://192.168.1.1" --login="admin" --password="myrouterpassword" "0612345678" "my text message"

# returns 0 on success, 1 on error
# pipe output to /dev/null if you do not want debug output

# you can also hardcode the credentials in the file or in the default config file : config.json
./sms-send.js 0612345678 "my text message"

# it is possible to supply your own config file using the --config arg
./sms-send.js --config="/tmp/config.json" 0612345678 "my text message"

# sample config file (config.json) for sms-send.js
{
    "url": "http://192.168.1.1",
    "login": "admin",
    "password": "myrouterpassword"
}

```

### REST API Bridge

```bash
# Start API bridge, using local config.json
./api-bridge.js

# Using custom config.json file
./api-bridge.js --config=/tmp/config.json

# Sample config.json file
{
    "url": "http://192.168.1.1",
    "login": "admin",
    "password": "myrouterpassword",
    "api_listen_host": "127.0.0.1",
    "api_listen_port": 3000,
    "api_users": { "apiuser": "pleasechangeme" }
}

# Explore API on http://127.0.0.1:3000

# Sample queries
# ==============
# List received SMS
curl --user apiuser:pleasechangeme -X GET "http://127.0.0.1:3000/api/v1/sms/inbox" -H  "accept: application/json"

# Sending SMS application/x-www-form-urlencoded style
curl --user apiuser:pleasechangeme -d to=0123456789 -d content=test1 -X POST "http://127.0.0.1:3000/api/v1/sms/outbox" -H  "accept: application/json"

# Sending SMS application/json style
curl --user apiuser:pleasechangeme -d '{"to":"0123456789", "content":"test2"}' -H 'Content-Type: application/json' -X POST "http://127.0.0.1:3000/api/v1/sms/outbox" -H  "accept: application/json"
```

### Receive SMS with SMS cat

```bash
# Example piping new SMS to command to your own command process_incoming_sms
./sms-cat.js --config=/tmp/config.json | \
    jq -c 'select(.message|contains("Received SMS")) | .sms' | \
    jq -c --raw-output 'select(.from=="+33123456789") .content' | \
    while read smsContent; do ./process_incoming_sms "$smsContent"; done

# Sample config file for sms-cat.js
{
    "api_client_url": "http://localhost:3000",
    "api_client_login": "apiuser",
    "api_client_password": "pleasechangeme",
    "api_client_polling_delay": 5000
}
```

### SMTP to SMS Gateway

```bash
# Start listening for emails
./smtp-gateway.js --config=/tmp/config.json

# Sample config file for smtp-gateway.js
{
    "sms_gateway_url": "http://localhost:3000",
    "sms_gateway_login": "apiuser",
    "sms_gateway_password": "pleasechangeme",
    "sms_gateway_domain": "smtp2sms.local",
    "sms_gateway_listen_host": "127.0.0.1",
    "sms_gateway_listen_port": 1025
}
```

```bash
# SMTP Example
curl -vv smtp://127.0.0.1:1025 --mail-rcpt 123456789@smtp2sms.local --upload-file <(echo && echo -n "Hello world from curl")
```

```
*   Trying 127.0.0.1:1025...
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0* Connected to 127.0.0.1 (127.0.0.1) port 1025 (#0)
< 220 dom0 ESMTP SMTP gateway for SMS API
> EHLO 11
< 250-dom0 Nice to meet you, [127.0.0.1]
< 250-PIPELINING
< 250-8BITMIME
< 250-SMTPUTF8
< 250-AUTH LOGIN PLAIN
< 250 STARTTLS
> MAIL FROM:<>
< 250 Accepted
> RCPT TO:<123456789@smtp2sms.local>
< 250 Accepted
> DATA
< 354 End data with <CR><LF>.<CR><LF>
} [26 bytes data]
< 250 OK: message queued
100    26    0     0    0    26      0     49 --:--:-- --:--:-- --:--:--    49
* Connection #0 to host 127.0.0.1 left intact
```

## Supported models

* TP-Link Archer MR200 v5
    * Firmware Version : ‪1.2.0 0.9.1 v0001.0 Build 210120 Rel.67320n
* TP-Link Archer MR600
* TP-Link TL-MR6400 v5
    * Firmware Version : 1.1.0 0.9.1 v0001.0 Build 200511 Rel.43036n

## Common errors

HTTP 403 while sending SMS or using API bridge
: You might want to double-check that the password supplied is correct and that you call the script from the same network/subnet as the router.

## Development and debugging the router's protocol

To debug the interaction between your browser and the router, first log in on the router UI and then paste this code in the developer console of your browser.
All traffic will be logged in plain text in the console.

```javascript
$.Iencryptor.AESDecrypt_backup = $.Iencryptor.AESDecrypt;
$.Iencryptor.AESEncrypt_backup = $.Iencryptor.AESEncrypt;
$.Iencryptor.AESDecrypt = function(data) {
	let decrypted = $.Iencryptor.AESDecrypt_backup(data);
	console.log("RECV:\n" + decrypted);
	return decrypted;
}
$.Iencryptor.AESEncrypt = function(data) {
	console.log("SEND:\n" + data);
	return $.Iencryptor.AESEncrypt_backup(data);
}
```

### Alternatives and projects of interest

I can offer no guarantees about the following projects

* https://github.com/hercule115/TPLink-Archer
  * Python command line tool to dump MR600 router config and update dynamic DNS
* https://github.com/jeedom/plugin-tplinksms
  * Plugin for Jeedom that provides an UI
* https://github.com/mehmetbeyHZ/tp-link-m7200-api
  * PHP library for TP-Link M7000 range of products
* https://github.com/McMlok/DomoticzToRouterSmsBot
* https://github.com/jonscheiding/tplink-vpn-ddns


