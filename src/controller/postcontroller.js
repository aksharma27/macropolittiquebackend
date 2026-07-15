import { Post } from '../models/Post.js';

export async function getAllPosts(req, res) {
  try {
    // Default values
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;

    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 10; // optional max limit

    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find({ published: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Post.countDocuments({ published: true }),
    ]);

    res.json({
      posts,
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
    const post = await Post.create(req.body);
    res.status(201).json(post);
  } catch(err) {
    res.status(500).json({ error: 'Failed to create post'});
    console.log("Error creating post:", err);

  }
}


export async function deletePostByAdmin(req, res) {
  try {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
        console.log('User not logged in');
      }
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ message: 'Post deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete post' });
  }
}

export async function getAllPostForAdmin(req, res) {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const posts = await Post.find({
        published: false
      })
      .sort({ publishedOn: -1, createdAt: -1 })
      .select('-__v'); // exclude version key

    res.json(posts);
  } catch (err) {
    console.error('getAllPostForAdmin error:', err);
    res.status(500).json({ error: 'Failed to fetch posts for admin' });
  }
}

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

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ message: 'Post approved successfully', post});
  } catch (err) {
    console.error('approvePostByAdmin error:', err);
    res.status(500).json({ error: 'Failed to approve post' });
  }
}

// Edit (update) a post by admin
export async function editPostByAdmin(req, res) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const { title, content, published } = req.body;

    // Build update object dynamically
    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (content !== undefined) updateFields.content = content;
    if (published !== undefined) updateFields.published = published;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const post = await Post.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ message: 'Post updated successfully', post });
  } catch (err) {
    console.error('editPostByAdmin error:', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
}