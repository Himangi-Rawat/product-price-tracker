# INE Product Price Tracker

A small full-stack app that tracks product prices and stock from INE's mock storefront (`https://demo.inelabteamdev.com`). You search for a product, start tracking it, and the app scrapes its price and stock on a schedule — keeping an honest history of every scrape attempt, successes and failures both.

This was built for the INE Software Engineer Intern assignment. This README is honest about what's actually working versus what's still left — nothing here is claimed to work unless it's been tested for real.

## What's actually done and tested

- Search the mock store by partial or full product name
- Track a product (saved to Supabase)
- Scrape a tracked product's price, MRP, discount, and stock — tested successfully on two different real products
- Retry logic with backoff, capped at 4 attempts
- Every scrape attempt (success or failure) logged honestly — nothing hidden, nothing faked
- Manual "scrape now" from both the API and the frontend
- A cron-style endpoint (`/api/cron/scrape`) that scrapes every active tracked product in one call — tested, scraped 2 products in one run with 0 failures
- A working headed-mode scraper (`npm run scrape:headed`) — real browser window, real challenge/session/price flow, recorded on video
- Frontend dashboard: search, track, list of tracked products with live price/stock/status
- Frontend product page: price/stock history table, scrape log table, manual scrape button

## What's NOT done

- **Not deployed.** Backend, frontend, and database all work, but only locally — nothing is hosted on Render/Vercel yet. Supabase itself is a real hosted database, so that part is live.
- **cron-job.org not configured.** The endpoint it would call (`/api/cron/scrape`) is built and tested manually, but nothing is actually calling it on a schedule right now.

This is a partial-but-genuinely-working submission — the assignment explicitly allows this ("send your resume only if you can complete the assignment at least partially"). Everything listed as "done" above has been tested with real data against the real mock store, not just written.

## Architecture

product-price-tracker/
├── backend/ Express API + Playwright scraper
│ ├── src/
│ │ ├── config/ env loading
│ │ ├── controllers/ request handling for each route
│ │ ├── db/ Supabase client
│ │ ├── middleware/ cron auth, error handling
│ │ ├── routes/ route definitions
│ │ ├── scrapers/ the actual scraping logic (see below)
│ │ └── services/ Supabase reads/writes, mock-store catalog client
│ └── database/
│ └── schema.sql
└── frontend/ React (Vite) dashboard
└── src/
├── pages/ Dashboard, ProductDetail
└── api.js talks to the backend


**Scraper pieces**, each doing one job:
- `browser.js` — launches Playwright, headed or headless
- `layoutMapper.js` — asks the store for today's CSS class names (see design note — these rotate)
- `priceScraper.js` — one scrape attempt: navigate, handle the cookie banner, hover to enable the reveal button, click it, read the price/stock
- `validator.js` — checks a scraped result is actually real before it's allowed to be saved
- `retryRunner.js` — retries a failed attempt with backoff, logs every attempt honestly
- `scraperService.js` — the top-level orchestration: loads tracked products from Supabase, scrapes each one, saves results

## Tech stack

- **Frontend:** React + Vite, react-router-dom
- **Backend:** Node.js + Express
- **Database:** Supabase (PostgreSQL)
- **Scraping:** Playwright (Chromium) — see design note for why a headless browser was necessary here, not just HTTP fetching
- **Scheduling (designed, not yet wired up):** cron-job.org calling `/api/cron/scrape`

## Local setup

### Requirements
- Node.js 18+
- A free Supabase account

### 1. Database
1. Create a Supabase project
2. Open the SQL editor, paste in the contents of `backend/database/schema.sql`, run it
3. This creates three tables: `tracked_products`, `price_history`, `scrape_logs`

### 2. Backend

cd backend
npm install
npx playwright install chromium
cp .env.example .env

Fill in `.env`:
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Settings → API (use the **service role** key, not anon)
- `CRON_SECRET` — any string you make up, used to protect the cron endpoint
- Leave the rest at their defaults unless you have a reason to change them

Run it:

npm run start

Should print `Backend running on port 4000`.

### 3. Frontend

cd frontend
npm install
cp .env.example .env

`.env` just needs:

VITE_API_BASE_URL=http://localhost:4000

Run it:

npm run dev

Open the URL it prints (usually `http://localhost:5173`).

## Running the scraper directly (without the frontend)

Scrape everything once, right now, from the terminal:

npm run scrape:once


Run it in headed mode (a real visible browser window) against one product:

node src/scrapers/headedRunner.js <productId>

e.g. `node src/scrapers/headedRunner.js 133`

## How scheduled scraping is meant to work

`POST /api/cron/scrape` (with header `x-cron-secret: <your CRON_SECRET>`) scrapes every active tracked product and returns a summary. This is built and tested manually — it's designed to be called every 2 hours by an external service like cron-job.org (a scheduled function would work too), specifically because a free-tier backend like Render's can go to sleep, so relying on an in-process `setInterval` wouldn't be reliable. Setting up the actual cron-job.org schedule wasn't completed due to time.

## API endpoints

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/search?q=` | search the mock store |
| POST | `/api/tracked-products` | start tracking a product |
| GET | `/api/tracked-products` | list tracked products + latest status |
| GET | `/api/tracked-products/:id` | one tracked product |
| GET | `/api/tracked-products/:id/history` | price/stock history |
| GET | `/api/tracked-products/:id/logs` | scrape attempt log |
| POST | `/api/tracked-products/:id/scrape` | scrape one product right now |
| POST | `/api/cron/scrape` | scrape every active product (needs `x-cron-secret` header) |

## Environment variables

**Backend** (`backend/.env`):
| Variable | What it's for |
|---|---|
| `PORT` | port the server runs on locally |
| `SUPABASE_URL` | your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — backend only, never exposed to the frontend |
| `MOCK_STORE_BASE_URL` | the store being scraped |
| `CRON_SECRET` | shared secret the cron endpoint checks for |
| `SCRAPE_MAX_ATTEMPTS` | how many times to retry a failed scrape |
| `SCRAPE_RETRY_BASE_DELAY_MS` | base delay between retries |
| `SCRAPE_PAGE_TIMEOUT_MS` | how long to wait per attempt before giving up |

**Frontend** (`frontend/.env`):
| Variable | What it's for |
|---|---|
| `VITE_API_BASE_URL` | where the backend is running |

## Known limitations

- Not deployed — everything runs locally
- cron-job.org not actually configured
- The mock store's CSS classes rotate periodically and the reveal-price flow depends on specific hover/click behavior discovered through trial and error (see design note) — if the store's frontend changes further, some of this may need revisiting
- Search is done by fetching the store's catalog pages and filtering client-side, since it wasn't confirmed whether the store has a native search parameter