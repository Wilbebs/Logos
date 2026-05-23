import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import applicantsRouter from './routes/applicants.js';
import emailRouter from './routes/email.js';

// -----------------------------------------------------------------------
// Webhook router is built by Agent 4.  Import conditionally so the server
// starts cleanly before that file exists.
// -----------------------------------------------------------------------
let webhookRouter = null;
try {
  const mod = await import('./routes/webhook.js');
  webhookRouter = mod.default ?? mod;
  console.log('[server] webhook router loaded successfully');
} catch (err) {
  console.error('[server] Failed to load webhook router:', err.message);
}

// -----------------------------------------------------------------------
// App setup
// -----------------------------------------------------------------------
const app = express();
const PORT = process.env.PORT ?? 3001;

// -----------------------------------------------------------------------
// CORS
// Allow all origins in development; restrict to env-specified origin in prod.
// -----------------------------------------------------------------------
const corsOptions =
  process.env.NODE_ENV === 'production' && process.env.ALLOWED_ORIGIN
    ? { origin: process.env.ALLOWED_ORIGIN, optionsSuccessStatus: 200 }
    : { origin: true, optionsSuccessStatus: 200 };

app.use(cors(corsOptions));

// -----------------------------------------------------------------------
// Body parsing
// -----------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MachForm sends key-value pairs with Content-Type: text/plain
// Parse them manually into req.body
app.use((req, _res, next) => {
  if (req.headers['content-type']?.startsWith('text/plain')) {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        req.body = Object.fromEntries(new URLSearchParams(data));
      } catch {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
});

// -----------------------------------------------------------------------
// Health check
// -----------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// -----------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------
app.use('/api/applicants', applicantsRouter);
app.use('/api/email', emailRouter);

if (webhookRouter) {
  app.use('/webhook', webhookRouter);
} else {
  app.use('/webhook', (_req, res) => {
    res.status(503).json({ error: 'Webhook handler not yet deployed.' });
  });
}

// -----------------------------------------------------------------------
// 404 handler — must come after all routes
// -----------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// -----------------------------------------------------------------------
// Global error handler — always returns JSON, never HTML
// -----------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err);
  const status = err.status ?? err.statusCode ?? 500;
  res.status(status).json({
    error: err.message ?? 'Internal server error.',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// -----------------------------------------------------------------------
// Start
// -----------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`[server] LOGOS Admissions API running on http://localhost:${PORT}`);
  console.log(`[server] Health check: http://localhost:${PORT}/health`);
});

export default app;
