const express = require('express');
const cors = require('cors');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { getSecret } = require('./services/secretService');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8081';

// Middleware: Add Request ID to every request
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-Id', req.id);
  // Log incoming request with ID
  console.log(`[${req.id}] ${req.method} ${req.path}`);
  next();
});

// Allow CORS from frontend dev server (Tightened)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

// Global variable for keys
let INGEST_API_KEY = process.env.INGEST_API_KEY;

// 1. Middleware: Ensure Secret Loaded or Fail Fast
const ensureIngestKey = async (req, res, next) => {
  if (!INGEST_API_KEY) {
    console.warn("⚠️ INGEST_API_KEY missing in middleware, attempting fetch...");
    try {
      INGEST_API_KEY = await getSecret('ROUTEMASTER_INGEST_API_KEY');
    } catch (err) {
      console.error("❌ Failed to fetch INGEST_API_KEY:", err.message);
      return res.status(503).json({ error: "Service Configuration Error" });
    }
  }

  if (!INGEST_API_KEY) {
    console.error("⛔ Service Unavailable: INGEST_API_KEY could not be loaded.");
    return res.status(503).json({ error: "Service Configuration Error" });
  }

  // SECURITY: Strip client-provided key before proxying
  delete req.headers['x-api-key'];
  next();
};

// 3. Proxy to Backend (Sync Injection)
const apiProxy = createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/ingest': '/',          // Rewrites /api/ingest -> /
    '^/api': ''                   // Rewrites /api/gemini/x -> /gemini/x
  },
  onProxyReq: (proxyReq, req, res) => {
    // Inject server-side key (guaranteed to exist by middleware)
    proxyReq.setHeader('x-api-key', INGEST_API_KEY);

    // Forward Request ID for end-to-end tracing
    if (req.id) {
      proxyReq.setHeader('x-request-id', req.id);
    }
  }
});

// 3. Config Endpoint (Local to BFF)
app.get('/api/config', (req, res) => {
  res.json({
    version: "1.0.0",
    flags: {
      offlineMode: true,
      enableOptimization: false
    },
    env: process.env.NODE_ENV || 'development'
  });
});

app.use('/api', ensureIngestKey, apiProxy);

// 4. Serve Static Frontend
if (process.env.NODE_ENV === 'production' || process.argv.includes('--serve-dist')) {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/config')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// 5. Async Startup
async function startServer() {
  console.log("🔐 Initializing secrets...");
  // Pre-load to minimize latency on first request
  INGEST_API_KEY = await getSecret('ROUTEMASTER_INGEST_API_KEY');

  if (INGEST_API_KEY) {
    console.log("✅ INGEST_API_KEY loaded.");
  } else {
    console.warn("⚠️ INGEST_API_KEY not found on startup. Middleware will attempt lazy fetch.");
  }

  app.listen(PORT, () => {
    console.log(`🛡️ BFF running on http://localhost:${PORT}`);
    console.log(`👉 Backend target: ${BACKEND_URL}`);
  });
}

startServer();
