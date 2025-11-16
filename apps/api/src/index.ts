import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { postRoutes } from './routes/posts';
import { errorHandler } from './middleware/error-handler';

// Define environment bindings type
export type Env = {
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  S3_BUCKET: string;
  CLOUDFRONT_URL: string;
  ENVIRONMENT: string;
};

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: [
    'https://aksharshruti.com',
    'https://app.aksharshruti.com',
    'capacitor://localhost',
    'ionic://localhost',
  ],
  credentials: true,
  maxAge: 86400,
}));

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: c.env.ENVIRONMENT,
    },
  });
});

// API version
app.get('/v1', (c) => {
  return c.json({
    success: true,
    data: {
      name: 'Aksharshruti API',
      version: '1.0.0',
      description: 'Literary social network for Indian languages',
    },
  });
});

// Mount routes
app.route('/v1/auth', authRoutes);
app.route('/v1/users', userRoutes);
app.route('/v1/posts', postRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
  }, 404);
});

// Error handler (must be last)
app.onError(errorHandler);

export default app;
