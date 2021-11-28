/**
 * @swagger
 *  components:
 *    schemas:
 *      InboxSms:
 *        type: object
 *        required:
 *          - index
 *          - from
 *          - content
 *          - receivedTime
 *          - unread
 *        properties:
 *          index:
 *            type: integer
 *            description: SMS id as stored in the router
 *          from:
 *            type: string
 *            format: phonenumber
 *            description: Phone number of sender
 *          content:
 *            type: string
 *            description: SMS content
 *          receivedTime:
 *            type: datetime
 *            description: Date and time of reception
 *          unread:
 *            type: boolean
 *            description: Whether the SMS is marked unread
 *        example:
 *            index: 35
 *            from: '+33123456789'
 *            content: 'Test content'
 *            receivedTime: '2020-07-16 23:04:16'
 *            unread: true
 *      OutboxSms:
 *        type: object
 *        required:
 *          - index
 *          - to
 *          - content
 *          - sendTime
 *        properties:
 *          index:
 *            type: integer
 *            description: SMS id as stored in the router
 *          to:
 *            type: string
 *            format: phonenumber
 *            description: Phone number of receiver
 *          content:
 *            type: string
 *            description: SMS content
 *          sendTime:
 *            type: datetime
 *            description: Date and time of sending
 *        example:
 *            index: 35
 *            to: '+33123456789'
 *            content: 'Test content'
 *            sent: '2020-07-16 23:04:16'
 *      OutboxNewSms:
 *        type: object
 *        required:
 *          - to
 *          - content
 *        properties:
 *          to:
 *            type: string
 *            format: phonenumber
 *            description: Phone number of receiver
 *          content:
 *            type: string
 *            description: SMS content
 *        example:
 *            to: '+33123456789'
 *            content: 'Test content'
 */

/**
 * @swagger
 * tags:
 *   name: SMS
 *   description: SMS Management
 */

/**
 * @swagger
 * path:
 *  /sms/inbox:
 *    get:
 *      summary: Get Received SMS (last 8 max received SMS)
 *      description:
 *        Returns a list of the last 8 received SMS, optionally filtered by unread status, sorted by most recent first.
 *        Only the last 8 elements are reported because the bridge does not support pagination at the router's end.
 *
 *        Messages could be missed if this endpoint is polled and more than 8 messages are received. To poll messages
 *        from this endpoint without missing any, one should poll with filter unread=true and mark already read SMS using a PATCH request.
 *
 *        Please note that the order of the results is important if other endpoints are to be called.
 *      tags: [SMS]
 *      parameters:
 *        - in: query
 *          name: unread
 *          schema:
 *             type: boolean
 *          required: false
 *          description: Filter on this unread value, true = only unread SMS, false = only read SMS. Due to protocol limitations, reported results for filter unread=false are inaccurate. Filter unread=true does not have this issue and reports correctly the last 8 unread SMS.
 *      responses:
 *        "200":
 *          description: List of inbox SMS
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/InboxSms'
 *  /sms/inbox/{smsOrderNumber}:
 *    patch:
 *      summary: Mark SMS as read for the n-th SMS in the last 8 SMS
 *      description: Difficult endpoint to use because of the stateful nature of the protocol at router's end. This endpoint must be called only after an unfiltered call to GET /sms/inbox.
 *      tags: [SMS]
 *      parameters:
 *        - name: "smsOrderNumber"
 *          in: "path"
 *          description: SMS order number in the max 8 SMS returned from /sms/inbox. It is not the SMS id.". First is 1 not 0. Range is 1 to 8 included.
 *          required: true
 *          type: "integer"
 *    delete:
 *      summary: Delete the n-th SMS in the last 8 SMS
 *      description: Difficult endpoint to use because of the stateful nature of the protocol at router's end. This endpoint must be called only after an unfiltered call to GET /sms/inbox.
 *      tags: [SMS]
 *      parameters:
 *        - name: "smsOrderNumber"
 *          in: "path"
 *          description: SMS order number in the max 8 SMS returned from /sms/inbox. It is not the SMS id.". First is 1 not 0. Range is 1 to 8 included.
 *          required: true
 *          type: "integer"
 *  /sms/outbox:
 *    get:
 *      summary: Get Sent SMS (last 8 max sent SMS)
 *      tags: [SMS]
 *      responses:
 *        "200":
 *          description: List of sent SMS
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/OutboxSms'
 *    post:
 *      summary: Send new SMS
 *      description: Submit new SMS for the router to send. Accepting json object or form-urlencoded.
 *      tags: [SMS]
 *      consumes:
 *       - "application/json"
 *       - "application/x-www-form-urlencoded"
 *      produces:
 *       - "application/json"
 *      requestBody:
 *        description: "SMS object that needs to be sent"
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/OutboxNewSms'
 *          application/x-www-form-urlencoded:
 *            schema:
 *              $ref: '#/components/schemas/OutboxNewSms'
 *  /sms/outbox/{smsOrderNumber}:
 *    delete:
 *      summary: Delete the n-th SMS in the last 8 SMS
 *      description: Difficult endpoint to use because of the stateful nature of the protocol at router's end. This endpoint must be called only after a call to GET /sms/outbox.
 *      tags: [SMS]
 *      parameters:
 *        - name: "smsOrderNumber"
 *          in: "path"
 *          description: SMS order number in the max 8 SMS returned from /sms/outbox. It is not the SMS id.". First is 1 not 0. Range is 1 to 8 included.
 *          required: true
 *          type: "integer"
 */

import express from 'express';
import { TP_ACT, TP_CONTROLLERS } from '../routerProtocol.mjs'

const router = express.Router();

const payloadResetInboxCursor = {
  method: TP_ACT.ACT_SET,
  controller: TP_CONTROLLERS.LTE_SMS_RECVMSGBOX,
  attrs: {'PageNumber': 1},
}

const payloadInbox = {
  method: TP_ACT.ACT_GL,
  controller: TP_CONTROLLERS.LTE_SMS_RECVMSGENTRY,
  attrs: ['index', 'from', 'content', 'receivedTime', 'unread'],
};

const payloadInboxUnread = {
  method: TP_ACT.ACT_GL,
  controller: TP_CONTROLLERS.LTE_SMS_UNREADMSGENTRY,
  attrs: ['index', 'from', 'content', 'receivedTime', 'unread'],
};

const payloadResetOutboxCursor = {
  method: TP_ACT.ACT_SET,
  controller: TP_CONTROLLERS.LTE_SMS_SENDMSGBOX,
  attrs: {'PageNumber': 1},
}

const payloadOutbox = {
  method: TP_ACT.ACT_GL,
  controller: TP_CONTROLLERS.LTE_SMS_SENDMSGENTRY,
  attrs: ['index', 'to', 'content', 'sendTime'],
};

router.get('/inbox', async function (req, res) {
  const client = req.app.get('router_client');

  client.execute([payloadResetInboxCursor, payloadInbox])
    .then((response) => {
      // apply filters
      if (typeof req.query.unread != 'undefined') {
        const unreadFilter = req.query.unread == 'true';
        response.data = response.data.filter(entry => entry.unread == unreadFilter);
      }

      return response;
    })
    .then((response) => {
      res.json({status: 200, data: response.data});
    })
    .catch((exception) => {
      res.status(500).json({status: 500, exception: {name: exception.name, message: exception.message}});
    });
});

router.patch('/inbox/:smsOrderNumber(\\d+)', async function (req, res) {
  const client = req.app.get('router_client');

  const smsOrderNumber = parseInt(req.params['smsOrderNumber']);

  const payloadMarkRead = {
    method: TP_ACT.ACT_SET,
    controller: TP_CONTROLLERS.LTE_SMS_RECVMSGENTRY,
    stack: smsOrderNumber + ',0,0,0,0,0',
    attrs: {'unread': 0},
  };

  client.execute(payloadMarkRead)
    .then((response) => {
      res.json({status: 200, data: response.data});
    })
    .catch((exception) => {
      res.status(500).json({status: 500, exception: {name: exception.name, message: exception.message}});
    });
});

router.delete('/inbox/:smsOrderNumber(\\d+)', async function (req, res) {
  const client = req.app.get('router_client');

  const smsOrderNumber = parseInt(req.params['smsOrderNumber']);

  const payloadDelete = {
    method: TP_ACT.ACT_DEL,
    controller: TP_CONTROLLERS.LTE_SMS_RECVMSGENTRY,
    stack: smsOrderNumber + ',0,0,0,0,0',
  };

  client.execute(payloadDelete)
    .then((response) => {
      res.json({status: 200, data: response.data});
    })
    .catch((exception) => {
      res.status(500).json({status: 500, exception: {name: exception.name, message: exception.message}});
    });
});

router.get('/outbox', async function (req, res) {
  const client = req.app.get('router_client');

  client.execute([payloadResetOutboxCursor, payloadOutbox])
    .then((response) => {
      res.json({status: 200, data: response.data});
    })
    .catch((exception) => {
      res.status(500).json({status: 500, exception: {name: exception.name, message: exception.message}});
    });
});

router.post('/outbox', async function (req, res) {
  if (typeof req.body.to == 'undefined' || typeof req.body.content == 'undefined') {
    res.status(400).json({status: 400});
    return;
  }

  const to = req.body.to;
  const content = req.body.content;
  const client = req.app.get('router_client');

  const payloadSendSms = {
    method: TP_ACT.ACT_SET,
    controller: TP_CONTROLLERS.LTE_SMS_SENDNEWMSG,
    attrs: {
      'index': 1,
      'to': to,
      'textContent': content,
    }
  };

  client.execute(payloadSendSms)
    .then((response) => {
      res.json({status: 200, data: response.data});
    })
    .catch((exception) => {
      res.status(500).json({status: 500, exception: {name: exception.name, message: exception.message}});
    });
});

router.delete('/outbox/:smsOrderNumber(\\d+)', async function (req, res) {
  const client = req.app.get('router_client');

  const smsOrderNumber = parseInt(req.params['smsOrderNumber']);

  const payloadDelete = {
    method: TP_ACT.ACT_DEL,
    controller: TP_CONTROLLERS.LTE_SMS_SENDMSGENTRY,
    stack: smsOrderNumber + ',0,0,0,0,0',
  };

  client.execute(payloadDelete)
    .then((response) => {
      res.json({status: 200, data: response.data});
    })
    .catch((exception) => {
      res.status(500).json({status: 500, exception: {name: exception.name, message: exception.message}});
    });
});

export default router;
