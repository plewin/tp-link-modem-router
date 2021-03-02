let TP_ACT = {
  ACT_GET: 1,
  ACT_SET: 2,
  ACT_DEL: 4,
  ACT_GL: 5, // get list
  ACT_GS: 6,
  ACT_CGI: 8,
}

let TP_CONTROLLERS = {
  LTE_SMS_RECVMSGBOX: 'LTE_SMS_RECVMSGBOX',
  LTE_SMS_RECVMSGENTRY: 'LTE_SMS_RECVMSGENTRY',
  LTE_SMS_UNREADMSGENTRY: 'LTE_SMS_UNREADMSGENTRY',
  LTE_SMS_SENDMSGBOX: 'LTE_SMS_SENDMSGBOX',
  LTE_SMS_SENDMSGENTRY: 'LTE_SMS_SENDMSGENTRY',
  LTE_SMS_SENDNEWMSG: 'LTE_SMS_SENDNEWMSG',
}

/**
 * Encapsulates MR600 router protocol implementation
 */
class RouterProtocol {
  makeDataFrame(payload) {
    if (!Array.isArray(payload)) {
      payload = [payload];
    }
  
    let sections = payload.map(payload => {
      let attrs = payload.attrs;
  
      const stack = payload.stack !== undefined ? payload.stack : '0,0,0,0,0,0';
      const pStack = '0,0,0,0,0,0'; // not used
      attrs = this.toKv(attrs);
    
      return {
        method: payload.method,
        controller: payload.controller,
        stack: stack,
        pStack: pStack,
        attrs: attrs,
        nbAttrs: attrs && attrs.match(/\r\n/g) != null ? attrs.match(/\r\n/g).length : 0
      };
    });
  
    let index = 0;

    const header = sections.map(section => section['method']).join('&');
    const data = sections.map(s => '[' + s['controller'] + '#' + s['stack'] + '#' + s['pStack'] + ']' + (index++) + ',' + s['nbAttrs'] + '\r\n' + s['attrs']).join('');

    return header + '\r\n' + data;
  }

  fromDataFrame(dataFrame) {
    const lines = dataFrame.trim().split("\n");
    let error = 0;

    const objectHeaderExtractor = /\[\d,\d,\d,\d,\d,\d\]\d/; // ex [0,0,0,0,0,0]0
    const objectAttributeExtractor = /^([a-zA-Z0-9]+)=(.*)$/; // ex totalNumber=11
    const frameErrorExtractor = /^\[error\](\d+)$/; // ex [error]0

    let currentObject = null;
    let data = [];
    lines.forEach(line => {
      let matching = line.match(objectHeaderExtractor);
      // found header
      if (matching != null) {
        if (currentObject !== null) {
          data.push(currentObject);
        }
        currentObject = {};
        return;
      }

      matching = line.match(frameErrorExtractor);
      // found error code
      if (matching != null) {
        error = matching[1];
        if (currentObject !== null) {
          data.push(currentObject);
        }
        return;
      }

      // found attribute
      matching = line.match(objectAttributeExtractor);
      if (matching != null) {
        currentObject[matching[1]] = matching[2];
        return;
      }
    });

    return {
      error,
      data,
    }
  }

  prettifyResponsePayload(payload) {
    payload['error'] = parseInt(payload['error']);

    const integerTypedAttributes = [
      'index',
      'sendResult',
    ];

    const booleanTypedAttributes = [
      'unread',
    ];

    const dateTypedAttributes = [
      'receivedTime',
      'sendTime',
    ];

    const stringTypedAttributes = [
      'content',
    ];

    payload.data.forEach((payloadObject, index) => {
      Object.keys(payloadObject).forEach((key) => {
        if (integerTypedAttributes.includes(key)) {
          payload.data[index][key] = parseInt(payload.data[index][key]);
        } else if (booleanTypedAttributes.includes(key)) {
          payload.data[index][key] = parseInt(payload.data[index][key]) > 0;
        } else if (dateTypedAttributes.includes(key)) {
          payload.data[index][key] = new Date(payload.data[index][key]);
        } else if (stringTypedAttributes.includes(key)) {
          payload.data[index][key] = payload.data[index][key].replace(/\u0012/gm, "\n");
        }
      });
    })

    return payload;
  }
  
  objectToKv(obj, keyValueSeparator, lineSeparator) {
    let ret = '';
    for (let key in obj) {
      if (obj[key] || 0 === obj[key] || '' === obj[key]) {
        const value = typeof obj[key] === 'string' ? obj[key].replace(/(\r\n|\n|\r)/gm, "\u0012") : obj[key];
        ret += key + keyValueSeparator + value + lineSeparator;
      } else {
        ret += key + lineSeparator;
      }
    }
    return ret;
  };
  
  toKv(data, keyValueSeparator = '=', lineSeparator = '\r\n') {
    if (!data) {
      return '';
    }

    if (typeof data === 'string') {
      return data;
    }

    if (data instanceof Array) {
      return data.join(lineSeparator) + lineSeparator;
    }

    return this.objectToKv(data, keyValueSeparator, lineSeparator);
  };
}

export { TP_ACT, TP_CONTROLLERS, RouterProtocol }