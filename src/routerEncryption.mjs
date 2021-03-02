import crypto from 'crypto'
import jsbn from 'jsbn';

import logger from './logger.mjs'

const BigInteger = jsbn.BigInteger;

// convert a (hex) string to a bignum object
function parseBigInt(str, r) {
  return new BigInteger(str, r);
}

// AES-128-CBC is used to encrypt commands
class AES {
  genKey() {
    const key = crypto.randomBytes(8).toString('hex');
    const iv = crypto.randomBytes(8).toString('hex');

    this.setKey(key, iv);
  }
  setKey(key, iv) {
    this.key = key;
    this.iv = iv;
  }
  getKeyString() {
    return 'key=%key%&iv=%iv%'.replace('%key%', this.key).replace('%iv%', this.iv);
  }
  encrypt(plainText) {
    const cipher = crypto.createCipheriv('aes-128-cbc', this.key, this.iv);
    cipher.setAutoPadding(true);
    return cipher.update(plainText, 'utf8', 'base64') + cipher.final('base64');
  }
  decrypt(encrypted) {
    const cipher = crypto.createDecipheriv('aes-128-cbc', this.key, this.iv)
    cipher.setAutoPadding(true)
    return cipher.update(encrypted, 'base64', 'utf8') + cipher.final('utf8');
  };
}

// RSA 512 bits is used to sign authentication request and encrypt AES key and iv for the router
// custom implementation for router which is a customized version of jsbn's RSA
// Copyright (c) 2003-2005  Tom Wu
// All Rights Reserved.
// See node_modules/jsbn/LICENSE for copyright
class RSAKey {
  n = null;
  e = 0;

  nopadding(s, n) {
    if (n < s.length) {
      logger.error('Message too long for RSA');
      return null;
    }
    let byteArray = [];
    let i = 0;
    let j = 0;
    while (i < s.length && j < n) {
      const charCode = s.charCodeAt(i++);
      if (charCode < 128) { // encode using utf-8
        byteArray[j++] = charCode;
      } else if (charCode > 127 && charCode < 2048) {
        byteArray[j++] = (charCode & 63) | 128;
        byteArray[j++] = (charCode >> 6) | 192;
      } else {
        byteArray[j++] = (charCode & 63) | 128;
        byteArray[j++] = ((charCode >> 6) & 63) | 128;
        byteArray[j++] = (charCode >> 12) | 224;
      }
    }
    while (j < n) {
      byteArray[j++] = 0;
    }
    return new BigInteger(byteArray);
  }

  // Perform raw public operation on "x": return x^e (mod n)
  doPublic(x) {
    return x.modPowInt(this.e, this.n);
  }

  // Set the public key fields N and e from hex strings
  setPublic(N, E) {
    if (N != null && E != null && N.length > 0 && E.length > 0) {
      this.n = parseBigInt(N, 16);
      this.e = parseInt(E, 16);
    }
    else {
      logger.error("Invalid RSA public key");
    }  
  }

  // Return the RSA encryption of "text" as an even-length hex string
  encrypt(text) {
    const m = this.nopadding(text, this.n.bitLength() + 7 >> 3);
    if (null == m) {
      return null;
    }
    const c = this.doPublic(m);
    if (null == c) {
      return null;
    }
    const h = c.toString(16);
    return (h.length & 1) == 0 ? h : '0' + h;
  }
}

class RSA {
  setKey(n, e) {
    this.rsaKey = new RSAKey();
    this.rsaKey.setPublic(n, e);
  }

  calculateRsaChunk(rsaKey, val, strEnlen) {
    let result = rsaKey.encrypt(val);
    if (result.length != strEnlen) {
      const l = Math.abs(strEnlen - result.length)
      for (let i = 0; i < l; i++) {
        result = '0' + result;
      }
    }
    return result;
  }

  encrypt(plainText) {
    const RSA_BIT = 512;
    const STR_EN_LEN = RSA_BIT / 4;
    const STR_DE_LEN = RSA_BIT / 8;
    const step = STR_DE_LEN;
    let startlength = 0;
    let endlength = step;
    let buffer = '';
      
    while (startlength < plainText.length) {
      endlength = endlength < plainText.length ? endlength : plainText.length;
      buffer += this.calculateRsaChunk(this.rsaKey, plainText.substring(startlength, endlength), STR_EN_LEN);
      startlength += step;
      endlength += step;
    }
    
    return buffer;
  }
}

class Encryption {
  constructor() {
    this.aes = new AES();
    this.rsa = new RSA();
  }
  setSeq(seq) {
    this.seq = parseInt(seq);
  }
  genAESKey() {
    this.aes.genKey();
    this.aesKeyString = this.aes.getKeyString();
  }
  // for debug purposes
  getAESKeyString() {
    return this.aes.getKeyString();
  }
  // for debug purposes
  setAESKey(key, iv) {
    this.aes.setKey(key, iv);
    this.aesKeyString = this.aes.getKeyString();
  }
  setRSAKey(n, e) {
    this.rsa.setKey(n, e);
  }
  getSignature(seq, isLogin) {
    // when it's a login the aes key is prefixed for future encrypted communication
    let s = isLogin ? this.aesKeyString + '&' : '';
    s += 'h=' + this.hash + '&s=' + seq || this.seq;
    return this.rsa.encrypt(s);
  }
  AESEncrypt(data, isLogin = false) {
    const encrypted = this.aes.encrypt(data);
    
    return {
      data: encrypted,
      sign: this.getSignature(this.seq + encrypted.length, isLogin)
    };
  }
  AESDecrypt(data) {
    return this.aes.decrypt(data);
  }
}

export default new Encryption();