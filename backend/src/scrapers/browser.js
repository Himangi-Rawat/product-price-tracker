const { chromium } = require('playwright');

async function openBrowserPage({ headed = false, slowMoMs = 0 } = {}) {
    const browser = await chromium.launch({
    headless: !headed,
    slowMo: headed ? slowMoMs : 0,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const page = await context.newPage();
  return { browser, context, page };
}

module.exports = { openBrowserPage };