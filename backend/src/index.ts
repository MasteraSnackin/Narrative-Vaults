import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { setupRoutes } from './api/routes';
import { initializePrisma } from './db';
import { startAgentLoop } from './agent/agentMainLoop';
import { setupRedis } from './services/redis.service';
import { initializeWebSocketServer } from './services/websocket.service';
import { initializeSaltService, getServiceStatus as getSaltStatus } from './services/salt.service';
import { initializeHyperliquidService, getServiceStatus as getHyperliquidStatus } from './services/hyperliquid.service';

const app = express();
const port = process.env.PORT || 3001;

// Store agent loop interval for cleanup
let agentLoopInterval: NodeJS.Timeout | null = null;

// Initialize middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_RPM || '100'),
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Health check endpoint (before other routes)
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      salt: getSaltStatus(),
      hyperliquid: getHyperliquidStatus()
    }
  });
});

async function startServer() {
  console.log('='.repeat(50));
  console.log('Starting Narrative Vaults Backend...');
  console.log('='.repeat(50));

  try {
    // 1. Initialize database
    console.log('\n[1/6] Initializing database...');
    await initializePrisma();
    console.log('[1/6] Database initialized successfully');

    // 2. Initialize Redis (optional - don't fail if not available)
    console.log('\n[2/6] Initializing Redis...');
    try {
      await setupRedis();
      console.log('[2/6] Redis initialized successfully');
    } catch (redisError) {
      console.warn('[2/6] Redis initialization failed - continuing without cache:', redisError);
    }

    // 3. Initialize Salt service
    console.log('\n[3/6] Initializing Salt service...');
    const saltInitialized = await initializeSaltService();
    if (saltInitialized) {
      console.log('[3/6] Salt service initialized successfully');
    } else {
      console.warn('[3/6] Salt service running in SIMULATION MODE');
    }

    // 4. Initialize Hyperliquid service
    console.log('\n[4/6] Initializing Hyperliquid service...');
    const hyperliquidInitialized = await initializeHyperliquidService();
    if (hyperliquidInitialized) {
      console.log('[4/6] Hyperliquid service initialized successfully');
    } else {
      console.warn('[4/6] Hyperliquid service initialization failed - some features may be limited');
    }

    // 5. Create HTTP server and initialize WebSocket
    console.log('\n[5/6] Setting up HTTP and WebSocket servers...');
    const server = http.createServer(app);
    initializeWebSocketServer(server);
    console.log('[5/6] Servers configured successfully');

    // 6. Setup API routes
    console.log('\n[6/6] Setting up API routes...');
    setupRoutes(app);
    console.log('[6/6] API routes configured successfully');

    // Start the server
    server.listen(port, () => {
      console.log('\n' + '='.repeat(50));
      console.log(`Backend server running on port ${port}`);
      console.log('='.repeat(50));

      // Start agent loop after server is listening
      const agentIntervalMs = parseInt(process.env.AGENT_LOOP_INTERVAL_MS || '30000');
      console.log(`\nStarting agent loop (interval: ${agentIntervalMs}ms)...`);
      agentLoopInterval = startAgentLoop(agentIntervalMs);
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);

      // Stop agent loop
      if (agentLoopInterval) {
        clearInterval(agentLoopInterval);
        console.log('Agent loop stopped');
      }

      // Close server
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('\nFailed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
