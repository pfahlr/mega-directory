const path = require('path');
const express = require('express');
require('./polyfills/fetch');

const listingsRouter = require('./routes/listings');
const seoRouter = require('./routes/seo');
const categoryLocationsRouter = require('./routes/categoryLocations');
const directoryPagesRouter = require('./routes/directoryPages');
const { resolveConfig } = require('./services/apiClient');

const app = express();
const port = process.env.PORT || 4000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.locals.appName = 'Mega Directory Admin';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.redirect('/listings');
});

app.use('/listings', listingsRouter);
app.use('/seo', seoRouter);
app.use('/category-locations', categoryLocationsRouter);
app.use('/directory-pages', directoryPagesRouter);

app.use((req, res) => {
  res.status(404).render('errors/not-found', {
    title: 'Not Found',
  });
});

async function startAdminServer() {
  try {
    await ensureAdminApiIsReady();
    app.listen(port, () => {
      console.log(`Admin app listening at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('[admin] Failed to connect to API:', error);
    process.exit(1);
  }
}

startAdminServer();

async function ensureAdminApiIsReady() {
  const { baseUrl, token } = resolveConfig();
  const healthUrl = new URL('/health', baseUrl);
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json'
  };

  const response = await fetch(healthUrl.toString(), { method: 'GET', headers });
  if (!response.ok) {
    throw new Error(`Admin API health check failed (${response.status} ${response.statusText})`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(`Admin API health check returned invalid JSON: ${error?.message ?? error}`);
  }

  // Accept healthy, degraded, or unhealthy - as long as API is responding
  const validStatuses = ['healthy', 'degraded', 'unhealthy'];
  if (!payload || !validStatuses.includes(payload.status)) {
    throw new Error(`Admin API health check returned unexpected status: ${payload?.status}`);
  }
}
