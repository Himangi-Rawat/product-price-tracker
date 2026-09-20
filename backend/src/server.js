const express = require('express');
const cors = require('cors');

const env = require('./config/env');

const searchRoutes = require('./routes/searchRoutes');
const trackedProductRoutes = require('./routes/trackedProductRoutes');
const cronRoutes = require('./routes/cronRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use('/api/search', searchRoutes);
app.use('/api/tracked-products', trackedProductRoutes);
app.use('/api/cron', cronRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Backend running on port ${env.PORT} (${env.NODE_ENV})`);
});