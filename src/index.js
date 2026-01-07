import dotenv from 'dotenv';
dotenv.config();
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import session from 'express-session';
import passport from './config/passport.js';

import { app, loadRoutes } from './app.js';
import { prisma } from './config/dbConfig.js';
import { logger } from './config/logger.js';
// import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { checkPermissions } from './middleware/auth.js';
import { initializeSocket } from './socket/socket.js';
import { createServer } from 'http';

const PORT = process.env.PORT || 8000;

// Trust proxy for deployment platforms like Render, Heroku, etc.
app.set('trust proxy', 1);

// Security middleware - disabled for development
// app.use(helmet());

// Parse allowed origins from environment variables
const getAllowedOrigins = () => {
  const origins = [];

  // Add FRONTEND_URL if exists
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }

  // Add ALLOWED_ORIGINS if exists (comma-separated)
  if (process.env.ALLOWED_ORIGINS) {
    const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map((origin) =>
      origin.trim()
    );
    origins.push(...envOrigins);
  }

  // Add default localhost for development
  origins.push(
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    'https://eximexperts.in'
  );

  return [...new Set(origins)]; // Remove duplicates
};

const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Cache-Control',
      'X-File-Name',
    ],
    exposedHeaders: ['Authorization', 'Content-Disposition'],
    preflightContinue: false,
    optionsSuccessStatus: 200,
    maxAge: 86400,
  })
);

app.use(compression());
// app.use(generalLimiter);
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session configuration for passport
app.use(
  session({
    secret: process.env.JWT_SECRET_KEY || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

app.use('/uploads', cors(), express.static('uploads'));
app.use('/public', express.static('public'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Load all routes
const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Add public routes BEFORE global middleware
    const { default: invitationRoute } = await import(
      './routes/invitationRoute.js'
    );
    const { default: authRoute } = await import('./routes/authRoute.js');
    
    app.use('/api/v1/invitation', invitationRoute);
    app.use('/api/v1', authRoute); // Auth routes without permission check

    // Add global permission check AFTER public routes
    app.use('/api/v1', checkPermissions);

    await loadRoutes(); // ← Load all other routes here

    app.use(notFound);
    app.use(errorHandler);

    // Create HTTP server
    const server = createServer(app);
    httpServer = server; // Store reference for graceful shutdown

    // Start server first
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);

      // Initialize Socket.io after server starts
      initializeSocket(server);
      logger.info('🔌 Socket.io ready');
    });

    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already in use`);
        logger.info('💡 Try: pkill -f "node.*index.js" or use different port');
        process.exit(1);
      } else {
        logger.error('❌ Server error:', err);
        process.exit(1);
      }
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Store server reference for graceful shutdown
let httpServer = null;

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);

  if (httpServer) {
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });
  }

  await prisma.$disconnect();
  logger.info('Database disconnected');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

startServer();
