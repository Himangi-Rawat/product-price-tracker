
const { openBrowserPage } = require('./browser');
const { runWithRetries } = require('./retryRunner');
const readline = require('readline');

function waitForEnter(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(message, () => { rl.close(); resolve(); }));
}

async function main() {
  const productId = process.argv[2];
  if (!productId) {
    console.error('Usage: node src/scrapers/headedRunner.js <productId>');
    process.exit(1);
  }

  console.log(`Starting HEADED scrape run for product ${productId}`);
  const { browser, page } = await openBrowserPage({ headed: true, slowMoMs: 250 });

  try {
    const result = await runWithRetries({ page, productId: parseInt(productId, 10), expectedName: null });

    console.log('\n--- FINAL RESULT ---');
    if (result.success) {
      console.log(`SUCCESS after ${result.attempts.length} attempt(s). Price: ${result.data.price}`);
    } else {
      console.log(`FAILED after ${result.attempts.length} attempt(s).`);
      console.log(`Last error: ${result.attempts[result.attempts.length - 1]?.errorMessage}`);
    }

    await waitForEnter('\nBrowser will stay open. Go inspect the page now. Press Enter here when done...\n');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Headed run crashed:', err);
  process.exit(1);
});