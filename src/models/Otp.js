import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  purpose: { type: String, enum: ['reset-password', 'article-verify'], default: 'article-verify' },
  expiresAt: { type: Date, default: () => Date.now() + 10 * 60 * 1000 }, // 10 minutes
  createdAt: { type: Date, default: Date.now },
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = mongoose.model('Otp', otpSchema);