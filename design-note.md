# Design Note

## Why Playwright, not lightweight HTTP fetching

Before writing any scraper code, I inspected the mock store's network traffic. The product listing (`/api/catalog`) and product detail (`/api/product/:id`) are plain JSON — no browser needed there, and the search feature does use a normal fetch call. But price and stock don't come back as plain data at all. Loading a product's price triggers three chained requests: `GET /api/challenge` (returns a WASM binary and a proof-of-work puzzle), `POST /api/session` (submits the solved puzzle, gets back a short-lived token), then `GET /api/products/:id/price` — and even that last response is an **encrypted** payload, not a plain price.

Trying to reimplement a WASM proof-of-work solver and whatever decryption scheme turns that payload into a real number by hand would be both fragile and, honestly, missing the point of what's being tested. The reasonable engineering choice is to let a real browser run the page's own JavaScript and do all of that itself, then read the final price straight off the rendered DOM. That's why the scraper is Playwright-driven rather than fetch-based, specifically for the price/stock step.

## How reliability was actually achieved

Every scrape attempt goes through the same real page, in a fresh browser profile, doing exactly what a real user would do — navigate, deal with the cookie banner, hover the price box, click reveal, wait for the result. If any of that fails, the whole attempt is marked failed and retried from scratch (fresh page load), up to a capped number of attempts, with a growing delay between tries. Nothing is ever half-saved: a scrape either produces a fully validated price and stock reading, or it produces nothing in `price_history` and an honest row in `scrape_logs` explaining what went wrong.

Validation happens before anything touches the database: the scraped price has to parse as a real positive number, the page has to show an actual product name (a basic check we didn't land on an empty/broken page), and only then is a row written. Nothing here ever converts a missing value into zero or writes a placeholder just to look successful.

## Timeouts and retries

The retry cap is 4 attempts with a backoff that grows each time (roughly 2s, 4s, 6s between tries). The per-attempt timeout went through several real revisions — see "what went wrong" below, since this was one of the places testing actually changed the design, not just tuned a number.

## Preventing invalid data from being saved

`validator.js` is the one gate everything passes through before a database write. If the price text can't be parsed into a real number, or the product name isn't present on the page, the result is rejected — logged as a failed attempt, never inserted into `price_history`. Stock is parsed a bit more leniently (a plain "In stock" with no number still gets saved, since that's genuinely what the store showed), but the raw text is always kept alongside the parsed number so nothing is silently invented.

## How the free-tier scheduling problem is solved

Render's free tier can put a backend instance to sleep when it's idle. Relying on an in-process timer (`setInterval`) inside that backend would mean the timer itself stops when the instance sleeps, and might not resume correctly. Instead, scheduled scraping is a plain HTTP endpoint (`POST /api/cron/scrape`, protected by a shared secret header) that an external service — cron-job.org — is meant to call every 2 hours. The act of calling it is what wakes the instance up if it was asleep, so the schedule doesn't depend on the backend staying awake on its own.

(Note: as documented in the README, the actual cron-job.org schedule wasn't set up due to time — the endpoint itself is built and was tested manually, multiple times, successfully scraping all active tracked products in one call.)

## What AI tools got wrong on the first attempt, and how it was found and fixed

This is the part I want to be genuinely honest about, since the assignment specifically asks for real mistakes, not invented ones. Everything below actually happened during development, in this order:

**1. Assumed the price loaded automatically on page visit.**
The very first version of the scraper just navigated to the product page and waited for a price element to appear. It never did — it just sat there until timeout, every single time. Only by recording a real screen capture of manually visiting the page did we discover the price is hidden behind a "Reveal price" button that has to be interacted with — nothing loads on its own.

**2. Missed a cookie consent banner entirely.**
Manual DevTools inspection earlier in the process never surfaced a cookie consent dialog. It turned out to appear a few seconds after page load — late enough that our first fix (a quick check right after navigation) missed it — and it sits on top of the page, silently blocking clicks on anything underneath it. This was only found by reviewing frame-by-frame screenshots from a real screen recording. The fix had to actively wait for the banner to appear (rather than a quick check-and-move-on) and confirm it was actually dismissed before continuing.

**3. Assumed `.hover()` would trigger the site's hover-to-enable button behavior.**
The "Reveal price" button starts disabled and only enables once the mouse genuinely moves over the surrounding price box — not the button itself. Playwright's built-in `.hover()` worked inconsistently, especially in headless mode, likely because it can move the mouse to the target in a way that doesn't register as a "real" hover to the page's own JS. The fix was to manually walk the mouse there in small steps using `page.mouse.move(..., { steps: 20 })` instead of relying on `.hover()`.

**4. Fetched the store's `/api/layout` class-name mapping too early.**
The scraper originally fetched `/api/layout` (which tells you the *current* CSS class names for price/stock, since they rotate) before navigating to the product page. This seems to have interfered with something the real page's own script does on its own load — the reveal button never became clickable when we did this. Moving that fetch to *after* the reveal-price flow was triggered fixed it.

**5. Timeout was set way too low, repeatedly.**
The proof-of-work challenge's solve time turned out to be highly variable — anywhere from ~10 seconds to well over a minute, depending on the machine. The timeout went through several honest revisions during testing: 25 seconds, then 40, then 90 — each time because real logged `duration_ms` values showed attempts landing right at the timeout ceiling, meaning the previous value was consistently too tight rather than the scraper being broken.

**6. A batch database insert gave every retry attempt the same timestamp.**
`scrape_logs` originally inserted all of one scrape's attempts in a single batch `INSERT`, so Supabase's `default now()` timestamped all of them identically — technically honest about *what* happened, but dishonest about *when*. Since the whole point of this log is to be a truthful record, this was fixed by calculating each attempt's real timestamp backward from its own duration before inserting.

**7. A dedup bug in search.**
Search results occasionally contained duplicate products, traced to the search function scanning multiple catalog pages without checking for products it had already seen (the store's own pagination isn't strictly non-overlapping). Fixed with a simple `Set` of seen product IDs.

Each of these was found by actually running the thing against the real store, not assumed or guessed at — most of them only became clear after recording and reviewing real screen captures, frame by frame, rather than trusting a quick "it seems to work" glance.

## Trade-offs

- Search does not use a dedicated store search endpoint, since it wasn't confirmed whether one exists — it works by scanning catalog pages client-side, which is reliable but not the fastest approach for a 1,000-product catalog.
- The retry cap (4 full page-load attempts) is intentionally lower than what the store's own frontend shows internally (up to 6), since each of our attempts is a full browser navigation, not a lightweight request — a higher cap would mean much longer worst-case scrape times for comparatively little extra reliability.git add README.md design-note.md