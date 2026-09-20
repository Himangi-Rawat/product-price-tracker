require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. Check your .env file against .env.example.`
    );
  }
  return value;
}

function optional(name, fallback) {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : fallback;
}

const env = {
  PORT: optional('PORT', '4000'),
  NODE_ENV: optional('NODE_ENV', 'development'),

  SUPABASE_URL: required('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),

  MOCK_STORE_BASE_URL: optional('MOCK_STORE_BASE_URL', 'https://demo.inelabteamdev.com'),

  CRON_SECRET: required('CRON_SECRET'),

  SCRAPE_MAX_ATTEMPTS: parseInt(optional('SCRAPE_MAX_ATTEMPTS', '4'), 10),
  SCRAPE_RETRY_BASE_DELAY_MS: parseInt(optional('SCRAPE_RETRY_BASE_DELAY_MS', '2000'), 10),
  SCRAPE_PAGE_TIMEOUT_MS: parseInt(optional('SCRAPE_PAGE_TIMEOUT_MS', '25000'), 10),
};

module.exports = env;