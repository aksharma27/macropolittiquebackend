import express from 'express';
import {
  getAllPosts,
  createPostRequest,
  deletePostByAdmin,
  getAllPostForAdmin,
  editPostByAdmin,
  approvePostByAdmin,
  sendArticleOtp,
  verifyArticleOtp, 
  checkEmailVerified
} from '../controller/postcontroller.js';
import { upload } from '../config/cloudinary.js';
import {requireAuth, requireAdmin} from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllPosts);
router.post('/', upload.single('image'), createPostRequest);

// OTP routes for article verification (public)
router.post('/send-otp', sendArticleOtp);
router.post('/verify-otp', verifyArticleOtp);
router.post('/check-email', checkEmailVerified);

// Protected/admin routes (you’ll add auth middleware later)
router.patch('/:id', requireAdmin, upload.single('image'), editPostByAdmin);
router.post('/:id/approve', approvePostByAdmin);
router.delete('/:id', requireAdmin, deletePostByAdmin);
router.get('/all-posts',  requireAdmin, getAllPostForAdmin);


export default router;