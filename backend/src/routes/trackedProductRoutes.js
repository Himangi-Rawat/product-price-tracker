const express = require('express');
const controller = require('../controllers/trackedProductController');

const router = express.Router();

router.post('/', controller.createTrackedProduct);
router.get('/', controller.listTrackedProducts);
router.get('/:id', controller.getTrackedProduct);
router.get('/:id/history', controller.getHistory);
router.get('/:id/logs', controller.getLogs);
router.post('/:id/scrape', controller.manualScrape);

module.exports = router;