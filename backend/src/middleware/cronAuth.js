const env = require('../config/env');

function verifyCronSecret(req, res, next) {
  const providedSecret = req.headers['x-cron-secret'];

  if (!providedSecret || providedSecret !== env.CRON_SECRET) {
    return res.status(401).json({ error: 'Missing or invalid cron secret' });
  }

  next();
}

module.exports = { verifyCronSecret };