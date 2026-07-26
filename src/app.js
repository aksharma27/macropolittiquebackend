import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import authRouter from './routes/authRoutes.js';
import postsRouter from './routes/postRoutes.js';
import { attachUserFromSession } from './middleware/authMiddleware.js';

dotenv.config(); // Ensure environment variables are loaded

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  // Security & logging
  app.use(helmet());

  // ---------- CORS ----------
  // Parse allowed origins from environment variable
const allowedOrigins = [
  'https://macropolitique.in',
  'https://www.macropolitique.in',
  'https://macropolitiqueui-glz5.vercel.app',
  'http://localhost:3000'
];

  console.log('✅ Allowed CORS origins:', allowedOrigins);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.error('❌ Blocked by CORS:', origin);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true, // Allow cookies to be sent
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(morgan('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ---------- Session ----------
  const clientPromise = connectDB().then(() => mongoose.connection.getClient());
  const SESSION_MAX_AGE_MS = 10 * 24 * 60 * 60 * 1000; // 10 days

  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        clientPromise,
        ttl: Number(process.env.SESSION_TTL) || 10 * 24 * 60 * 60,
      }),
      cookie: {
        httpOnly: true,
        // ✅ In production (HTTPS) secure must be true
        // ✅ For cross-origin, sameSite must be 'none'
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: SESSION_MAX_AGE_MS,
      },
      name: 'sessionId',
      rolling: true,
    })
  );

  // Routes
  app.use(attachUserFromSession);
  app.use('/auth', authRouter);
  app.use('/posts', postsRouter);

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('❌ Unknown error:', err);
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}