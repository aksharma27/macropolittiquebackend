import express from 'express';
import {
  getAllPosts,
  createPostRequest,
  deletePostByAdmin,
  getAllPostForAdmin,
  editPostByAdmin,
  approvePostByAdmin
} from '../controller/postcontroller.js';
import {requireAuth, requireAdmin} from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllPosts);
router.post('/', createPostRequest);

// Protected/admin routes (you’ll add auth middleware later)
router.patch('/:id', requireAdmin, editPostByAdmin);
router.post('/:id/approve', approvePostByAdmin);
router.delete('/:id', requireAdmin, deletePostByAdmin);
router.get('/all-posts',  requireAdmin, getAllPostForAdmin);
router.delete('/:id', requireAuth, deletePostByAdmin);


export default router;