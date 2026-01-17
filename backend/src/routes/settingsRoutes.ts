import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  getSettings,
  updateSettings,
  updateAvatar,
} from '../controllers/settingsController';

const router = express.Router();

// @desc    Get user settings
// @route   GET /api/settings
// @access  Private
router.get('/', protect, getSettings);

// @desc    Update notification preferences
// @route   PUT /api/settings
// @access  Private
router.put('/', protect, updateSettings);

// @desc    Update user avatar
// @route   PUT /api/settings/avatar
// @access  Private
router.put('/avatar', protect, updateAvatar);

export default router;
