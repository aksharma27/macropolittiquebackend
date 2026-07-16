import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';

import authRouter from './routes/authRoutes.js';
import postsRouter from './routes/postRoutes.js';
import {attachUserFromSession} from './middleware/authMiddleware.js';

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

export function createApp() {
  const app = express();
app.set('trust proxy', 1);    //trust the rev proxy (nginx, render, heroku,etc)
  // Security & logging middleware
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session middleware (after DB connection is established)
  const clientPromise = connectDB().then(() => mongoose.connection.getClient());
  const SESSION_MAX_AGE_MS = 10 * 24 * 60 * 60 * 1000; // 10 days

  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        clientPromise,
        ttl: Number(process.env.SESSION_TTL) || (10 * 24 * 60 * 60) // seconds
      }),
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'development', // true in production (HTTPS)
        sameSite: process.env.NODE_ENV === 'development' ? 'none' : 'lax', // 'none' for cross-origin in production
        maxAge: SESSION_MAX_AGE_MS, // 10 days
      },
      name: 'sessionId',
      rolling: true // Note: should be boolean true, not string 'true'
    })
);

  // Routes
  app.use(attachUserFromSession);
  app.use('/auth', authRouter);
  app.use('/posts', postsRouter);

  app.use((err, req, res, next) => {
    console.error("Unknown err:", err);
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}