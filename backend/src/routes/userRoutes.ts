import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  getUserProfile,
  getPublicProfile,
  updateUserAvatar
} from '../controllers/userController';

const router = express.Router();

// @desc    Get current user profile (full details)
// @route   GET /api/users/me
// @access  Private
router.get('/me', protect, getUserProfile);

// @desc    Get public user profile
// @route   GET /api/users/:id/public-profile
// @access  Private
router.get('/:id/public-profile', protect, getPublicProfile);

// @desc    Update user avatar
// @route   PUT /api/users/avatar
// @access  Private
router.put('/avatar', protect, updateUserAvatar);

export default router;
