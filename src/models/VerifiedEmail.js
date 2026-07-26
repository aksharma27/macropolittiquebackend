import mongoose from 'mongoose';

const verifiedEmailSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  createdAt: { type: Date, default: Date.now },
});

export const VerifiedEmail = mongoose.model('VerifiedEmail', verifiedEmailSchema);