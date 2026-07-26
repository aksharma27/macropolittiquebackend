import { Post } from '../models/Post.js';
import { cloudinary } from '../config/cloudinary.js';
import {Otp} from '../models/Otp.js';
import transporter from '../util/mailer.js';
import crypto from 'crypto';
import { VerifiedEmail } from '../models/VerifiedEmail.js';

export async function getAllPosts(req, res) {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';
    const sortOrder = req.query.sort === 'asc' ? 1 : -1;

    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 20;

    const skip = (page - 1) * limit;

    // Build filter: only published posts
    let filter = { published: true };

    // ✅ Only apply search if query has 3+ characters
    const trimmedSearch = search.trim();
    if (trimmedSearch.length >= 3) {
      const regex = new RegExp(trimmedSearch, 'i');
      filter.$or = [
        { title: regex },
        { author: regex },
        { authorEmail: regex },
      ];
    }

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ publishedOn: sortOrder, createdAt: sortOrder })
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
      Post.countDocuments(filter),
    ]);

    // Normalize legacy image field
    const normalizedPosts = posts.map(post => {
      if (!post.imageUrl && post.image && post.image.url) {
        post.imageUrl = post.image.url;
      }
      return post;
    });

    res.json({
      posts: normalizedPosts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        postsPerPage: limit,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error('getAllPosts error:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
}

export async function createPostRequest(req, res) {
  try {
    const { title, author, authorEmail, content, published } = req.body;
    const isAdmin = req.user?.role === 'admin';

    // If a file is uploaded but user is not admin, reject
    if (req.file && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can upload images' });
    }

    // Force published: false for non-admins
    const finalPublished = isAdmin ? (published || false) : false;

    const imageUrl = req.file ? req.file.path : '';

    const post = await Post.create({
      title,
      author,
      authorEmail,
      content,
      published: finalPublished,
      imageUrl: isAdmin ? imageUrl : '', // admins can set image, others get empty
    });

    res.status(201).json(post);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
}

export async function deletePostByAdmin(req, res) {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('deletePostByAdmin error:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
}

export async function getAllPostForAdmin(req, res) {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const posts = await Post.find({ published: false })
      .sort({ publishedOn: -1, createdAt: -1 })
      .select('-__v')
      .lean();
    const normalizedPosts = posts.map(post => {
      if (!post.imageUrl && post.image && post.image.url) {
        post.imageUrl = post.image.url;
      }
      return post;
    });
    res.json(normalizedPosts);
  } catch (err) {
    console.error('getAllPostForAdmin error:', err);
    res.status(500).json({ error: 'Failed to fetch posts for admin' });
  }
}

export async function approvePostByAdmin(req, res) {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    const post = await Post.findByIdAndUpdate(
      id,
      { published: true, publishedOn: new Date() },
      { new: true, runValidators: true }
    );
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ message: 'Post approved successfully', post });
  } catch (err) {
    console.error('approvePostByAdmin error:', err);
    res.status(500).json({ error: 'Failed to approve post' });
  }
}

export async function editPostByAdmin(req, res) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const { title, content, published, removeImage } = req.body;

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (content !== undefined) updateFields.content = content;
    if (published !== undefined) updateFields.published = published;

    // Only update image if a file is uploaded or removal is requested
    if (req.file) {
      updateFields.imageUrl = req.file.path;
    } else if (removeImage === 'true') {
      updateFields.imageUrl = '';
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Always unset the legacy 'image' field
    const updateOperation = { $set: updateFields, $unset: { image: 1 } };

    const post = await Post.findByIdAndUpdate(id, updateOperation, {
      new: true,
      runValidators: true,
    });

    if (!post) return res.status(404).json({ error: 'Post not found' });

    res.json({ message: 'Post updated successfully', post });
  } catch (err) {
    console.error('editPostByAdmin error:', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
}

export const sendArticleOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Save or update OTP for this email (purpose: article-verify)
    await Otp.findOneAndUpdate(
      { email, purpose: 'article-verify' },
      { otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      { upsert: true }
    );

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Article Submission OTP',
      text: `Your OTP for article verification is: ${otp}. It is valid for 10 minutes. Do not share this with anyone.`,
    });

    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('sendArticleOtp error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

export const verifyArticleOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const record = await Otp.findOne({ email, purpose: 'article-verify' });
    if (!record) {
      return res.status(400).json({ error: 'OTP not found or expired' });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (record.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: record._id });
      return res.status(400).json({ error: 'OTP expired' });
    }

    // OTP verified – delete it
    await Otp.deleteOne({ _id: record._id });

    //save email as verified (upsert)
    await VerifiedEmail.findOneAndUpdate(
      { email: email.trim().toLowerCase() },
      { verifiedAt: new Date() },
      { upsert: true }
    );


    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('verifyArticleOtp error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};


export const checkEmailVerified = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const verified = await VerifiedEmail.findOne({ email: email.toLowerCase() });
    res.json({ verified: !!verified });
  } catch (error) {
    console.error('checkEmailVerified error:', error);
    res.status(500).json({ error: 'Failed to check email' });
  }
};