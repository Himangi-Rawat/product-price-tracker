const env = require('../config/env');
const { fetchLayoutClasses } = require('./layoutMapper');

async function dismissCookieBannerIfPresent(page, timeoutMs) {
  const banner = page.getByRole('dialog', { name: /cookie consent/i });
  const visible = await banner.isVisible().catch(() => false);
  if (!visible) return;

  const acceptButton = page.getByRole('button', { name: /accept/i });
  await acceptButton.click().catch(() => {});
  await banner.waitFor({ state: 'hidden', timeout: timeoutMs }).catch(() => {});
}

async function isRevealButtonEnabled(page) {
  return page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      /reveal price|refresh price/i.test(b.getAttribute('aria-label') || b.textContent || '')
    );
    return !!btn && !btn.disabled;
  });
}

async function hoverPriceBoxUntilEnabled(page, timeoutMs) {
  const priceBox = page.getByText('Price hidden').locator('..');
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await dismissCookieBannerIfPresent(page, 3000);

    const box = await priceBox.boundingBox().catch(() => null);
    if (box) {
      await page.mouse.move(0, 0);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
    }

    if (await isRevealButtonEnabled(page)) return;

    await page.waitForTimeout(500);
  }

  throw new Error('Reveal price button never became enabled within the timeout');
}

async function scrapeProductOnce({ page, productId }) {
  const productUrl = `${env.MOCK_STORE_BASE_URL}/product/${productId}`;

  await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: env.SCRAPE_PAGE_TIMEOUT_MS });

  await hoverPriceBoxUntilEnabled(page, env.SCRAPE_PAGE_TIMEOUT_MS);

  const revealButton = page.getByRole('button', { name: /reveal price|refresh price/i });
  await revealButton.click({ timeout: env.SCRAPE_PAGE_TIMEOUT_MS });

  const classes = await fetchLayoutClasses(page);

  const priceSelector = `.${classes.priceValue}`;
  const priceLocator = page.locator(priceSelector).first();

  await priceLocator.waitFor({ state: 'visible', timeout: env.SCRAPE_PAGE_TIMEOUT_MS });
  await page.waitForFunction(
    (selector) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const text = el.textContent || '';
      return /\d/.test(text);
    },
    priceSelector,
    { timeout: env.SCRAPE_PAGE_TIMEOUT_MS }
  );

  const priceRawText = (await priceLocator.textContent())?.trim() || null;

  let mrpRawText = null;
  let discountRawText = null;
  if (classes.mrp) {
    mrpRawText = (await page.locator(`.${classes.mrp}`).first().textContent().catch(() => null))?.trim() || null;
  }
  if (classes.badge) {
    discountRawText = (await page.locator(`.${classes.badge}`).first().textContent().catch(() => null))?.trim() || null;
  }

  let stockRawText = null;
  if (classes.stock) {
    stockRawText = (await page.locator(`.${classes.stock}`).first().textContent().catch(() => null))?.trim() || null;
  }

  const pageProductName = (await page.locator('h1').first().textContent().catch(() => null))?.trim() || null;

  return { productUrl, pageProductName, priceRawText, mrpRawText, discountRawText, stockRawText };
}

module.exports = { scrapeProductOnce };