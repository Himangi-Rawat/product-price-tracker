const express = require('express');
const { runScheduledScrape } = require('../controllers/cronController');
const { verifyCronSecret } = require('../middleware/cronAuth');

const router = express.Router();

router.post('/scrape', verifyCronSecret, runScheduledScrape);

module.exports = router;