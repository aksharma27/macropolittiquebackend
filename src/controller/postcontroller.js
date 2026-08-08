// backend/controllers/postController.js
import { Post } from '../models/Post.js';
import { cloudinary } from '../config/cloudinary.js';
import { Otp } from '../models/Otp.js';
import crypto from 'crypto';
import { VerifiedEmail } from '../models/VerifiedEmail.js';
import resend from '../util/mailer.js';

// ========== Helper: Extract public_id from Cloudinary URL ==========
function extractPublicIdFromUrl(url) {
  if (!url) return null;

  try {
    const parts = url.split('/');
    const uploadIndex = parts.findIndex(part => part === 'upload');
    if (uploadIndex === -1) return null;

    const pathSegments = parts.slice(uploadIndex + 2); // skip version
    const fullPath = pathSegments.join('/');
    const publicId = fullPath.replace(/\.[^.]+$/, '');
    return publicId;
  } catch (error) {
    console.error('Error extracting public_id:', error);
    return null;
  }
}

// ========== GET ALL PUBLISHED POSTS (with search & sort) ==========
export async function getAllPosts(req, res) {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';
    const sortOrder = req.query.sort === 'asc' ? 1 : -1;

    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 20;

    const skip = (page - 1) * limit;

    let filter = { published: true };

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

// ========== CREATE POST ==========
export async function createPostRequest(req, res) {
  try {
    const { title, author, authorEmail, content, published } = req.body;
    const isAdmin = req.user?.role === 'admin';

    if (req.file && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can upload images' });
    }

    const finalPublished = isAdmin ? (published || false) : false;
    const imageUrl = req.file ? req.file.path : '';

    const post = await Post.create({
      title,
      author,
      authorEmail,
      content,
      published: finalPublished,
      imageUrl: isAdmin ? imageUrl : '',
    });

    res.status(201).json(post);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
}

// ========== DELETE POST (with image deletion) ==========
export async function deletePostByAdmin(req, res) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 1. Find the post first
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // 2. Delete image from Cloudinary if exists
    if (post.imageUrl) {
      try {
        const publicId = extractPublicIdFromUrl(post.imageUrl);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
          console.log(`Deleted Cloudinary image: ${publicId}`);
        }
      } catch (cloudErr) {
        console.error('Cloudinary deletion error:', cloudErr);
        // Continue to delete post even if image deletion fails
      }
    }

    // 3. Delete post from DB
    await Post.findByIdAndDelete(req.params.id);

    res.json({ message: 'Post and associated image deleted successfully' });
  } catch (err) {
    console.error('deletePostByAdmin error:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
}

// ========== GET ALL POSTS FOR ADMIN (unpublished) ==========
export async function getAllPostForAdmin(req, res) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

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

// ========== APPROVE POST (publish) ==========
export async function approvePostByAdmin(req, res) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

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

// ========== EDIT POST (with image replacement & deletion) ==========
export async function editPostByAdmin(req, res) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const { title, content, published, removeImage } = req.body;

    // 1. Find existing post to get old image
    const existingPost = await Post.findById(id);
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // 2. Build update fields
    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (content !== undefined) updateFields.content = content;
    if (published !== undefined) updateFields.published = published;

    // 3. Handle image replacement
    let imageDeleted = false;
    if (req.file) {
      // New image uploaded – delete old one if it exists
      if (existingPost.imageUrl) {
        try {
          const publicId = extractPublicIdFromUrl(existingPost.imageUrl);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
            console.log(`Deleted old image: ${publicId}`);
            imageDeleted = true;
          }
        } catch (cloudErr) {
          console.error('Error deleting old image:', cloudErr);
        }
      }
      updateFields.imageUrl = req.file.path;
    } else if (removeImage === 'true') {
      // Remove image explicitly
      if (existingPost.imageUrl) {
        try {
          const publicId = extractPublicIdFromUrl(existingPost.imageUrl);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
            console.log(`Deleted image on removal: ${publicId}`);
            imageDeleted = true;
          }
        } catch (cloudErr) {
          console.error('Error deleting image on removal:', cloudErr);
        }
      }
      updateFields.imageUrl = '';
    }

    // 4. If no fields to update, return early
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // 5. Update post – also unset legacy 'image' field
    const updateOperation = { $set: updateFields, $unset: { image: 1 } };

    const updatedPost = await Post.findByIdAndUpdate(id, updateOperation, {
      new: true,
      runValidators: true,
    });

    res.json({ message: 'Post updated successfully', post: updatedPost });
  } catch (err) {
    console.error('editPostByAdmin error:', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
}

// ========== ARTICLE OTP (send) ==========
export const sendArticleOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();

    await Otp.findOneAndUpdate(
      {
        email: normalizedEmail,
        purpose: 'article-verify',
      },
      {
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      {
        upsert: true,
        new: true,
      }
    );

    const { data, error } = await resend.emails.send({
      from: `${process.env.RESEND_SENDER_NAME} <${process.env.RESEND_SENDER_EMAIL}>`,
      to: [normalizedEmail],
      subject: 'Article Submission OTP',

      text: `Your OTP for article verification is: ${otp}. It is valid for 10 minutes. Do not share this with anyone.`,
    });

    if (error) {
      console.error('Resend OTP error:', error);

      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to send OTP',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
    });

  } catch (error) {
    console.error('sendArticleOtp error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to send OTP',
    });
  }
};

// ========== VERIFY ARTICLE OTP ==========
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

    await Otp.deleteOne({ _id: record._id });

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

// ========== CHECK IF EMAIL IS VERIFIED ==========
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