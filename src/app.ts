import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { initializeFirebase } from './config/firebase.ts';
import { getSecret } from './config/secrets.ts';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.ts';
import photoRoutes from './routes/photoRoutes.ts';
import likeRoutes from './routes/likeRoutes.ts';
import userRoutes from './routes/userRoutes.ts';
import commentRoutes from './routes/commentRoutes.ts';

// Load configuration from Google Secret Manager
await getSecret('xx').then((secretValue) => {
  const config = JSON.parse(secretValue);
  Object.entries(config).forEach(([key, value]) => {
    process.env[key] = value as string;
  });
}).catch((error) => {
  console.error('Failed to load secrets from Google Secret Manager:', error);
  process.exit(1);
});

// Initialize Firebase
initializeFirebase();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/photos', photoRoutes);
app.use('/api/like', likeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(` Photogram API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Security features enabled: Helmet, CORS, Rate Limiting`);
});

export default app;
