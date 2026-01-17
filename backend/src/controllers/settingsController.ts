import { Request, Response } from 'express';
import User from '../models/User';
import UserSettings from '../models/UserSettings';
import { isValidAvatarId } from '../utils/avatarValidator';
import { invalidateSettingsCache } from '../utils/notificationService';

/**
 * @desc    Get user settings
 * @route   GET /api/settings
 * @access  Private
 */
export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;

    // Find or create settings for user
    let settings = await UserSettings.findOne({ userId });

    if (!settings) {
      // Create default settings
      settings = await UserSettings.create({ userId });
    }

    res.json({
      notifications: settings.notifications,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Update notification preferences
 * @route   PUT /api/settings
 * @access  Private
 */
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { notifications } = req.body;

    if (!notifications) {
      res.status(400).json({ message: 'Notification preferences required' });
      return;
    }

    // Validate notification structure
    if (typeof notifications !== 'object') {
      res.status(400).json({ message: 'Invalid notification format' });
      return;
    }

    // Find or create settings
    let settings = await UserSettings.findOne({ userId });

    if (!settings) {
      settings = await UserSettings.create({ userId, notifications });
    } else {
      // Update only provided fields (partial update)
      if (notifications.game) {
        settings.notifications.game = {
          ...settings.notifications.game,
          ...notifications.game,
        };
      }
      if (notifications.social) {
        settings.notifications.social = {
          ...settings.notifications.social,
          ...notifications.social,
        };
      }
      if (notifications.debt) {
        settings.notifications.debt = {
          ...settings.notifications.debt,
          ...notifications.debt,
        };
      }

      await settings.save();
    }

    // Invalidate cache
    invalidateSettingsCache(userId.toString());

    res.json({
      message: 'Settings updated successfully',
      notifications: settings.notifications,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Update user avatar
 * @route   PUT /api/settings/avatar
 * @access  Private
 */
export const updateAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { avatarId } = req.body;

    // Validate avatar ID
    if (!avatarId || !isValidAvatarId(avatarId)) {
      res.status(400).json({
        message: 'Invalid avatar ID. Must be avatar_1 through avatar_10'
      });
      return;
    }

    // Update user avatar
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const oldAvatarId = user.avatarId;
    user.avatarId = avatarId;
    await user.save();

    // Get io instance from app
    const io = (req as any).app.get('io');

    if (io) {
      // Broadcast avatar change to all connected clients
      // This will update avatar in game rooms, friend lists, etc.
      io.emit('avatar_changed', {
        userId: userId.toString(),
        avatarId,
      });
    }

    res.json({
      message: 'Avatar updated successfully',
      avatarId: user.avatarId,
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
