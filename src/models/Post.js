// src/models/Post.js
import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    authorEmail: {type: String, required: false, trim: true},
    content: { type: String, required: true },
    publishedOn : { type: Date, default: Date.now },
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Post = mongoose.model('Post', postSchema);