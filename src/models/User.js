// src/models/Post.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    number: {type: String, required: true, unique: true, trim: true},
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    resetPasswordOtp: {type: String, default: null},
    resetPasswordOtpExpiry: {type: Date, default: null},
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);