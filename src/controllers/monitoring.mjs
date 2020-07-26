/**
 * @swagger
 * tags:
 *   name: Monitoring
 *   description: Monitoring
 */

/**
 * @swagger
 * path:
 *  /monitoring/metrics:
 *    get:
 *      summary: Prometheus metrics endpoint WIP
 *      description:
 *        Monitoring
 *      tags: [Monitoring]
 *      responses:
 *        "200":
 *          description: Monitoring data
 */

import express from 'express';

const router = express.Router();

router.get('/metrics', async function (req, res) {
  res.send('WIP');
});

export default router;