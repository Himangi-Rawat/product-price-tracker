const { scrapeAllActiveProducts } = require('../scrapers/scraperService');

async function runScheduledScrape(req, res) {
  try {
    const summary = await scrapeAllActiveProducts();
    console.log(
      `Cron scrape finished: ${summary.succeeded}/${summary.total} succeeded, ${summary.failed} failed.`
    );
    return res.status(200).json(summary);
  } catch (err) {
    console.error('Cron scrape run failed entirely:', err.message);
    return res.status(500).json({ error: 'Scheduled scrape run failed', detail: err.message });
  }
}

module.exports = { runScheduledScrape };