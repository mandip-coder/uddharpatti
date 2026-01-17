import { Request, Response } from 'express';
import User from '../models/User';
import Debt from '../models/Debt';
import { isValidAvatarId } from '../utils/avatarValidator';

// Helper to get debt summary
const getDebtSummary = async (userId: string) => {
  const activeDebts = await Debt.find({
    borrower: userId,
    status: 'active'
  });

  const totalDebt = activeDebts.reduce((acc, debt) => acc + debt.amount, 0);

  return {
    activeCount: activeDebts.length,
    totalAmount: totalDebt
  };
};

/**
 * @desc    Get current user profile (full details)
 * @route   GET /api/users/me
 * @access  Private
 */
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Get detailed debt stats
    const debtSummary = await getDebtSummary(userId);

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      walletBalance: user.walletBalance,
      avatarId: user.avatarId,
      stats: user.stats || { wins: 0, losses: 0, gamesPlayed: 0 },
      debtSummary: {
        activeCount: debtSummary.activeCount,
        totalAmount: debtSummary.totalAmount, // Detailed amount allowed for self
        hasActiveDebt: debtSummary.activeCount > 0
      },
      friends: user.friends,
      createdAt: (user as any).createdAt
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get public user profile (limited stats)
 * @route   GET /api/users/:id/public-profile
 * @access  Private (Logged in users can see others)
 */
export const getPublicProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('-password -email -walletBalance -blockedUsers -settings');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Get sanitized debt stats
    const debtSummary = await getDebtSummary(user._id.toString());

    res.json({
      _id: user._id,
      username: user.username,
      avatarId: user.avatarId,
      stats: user.stats || { wins: 0, losses: 0, gamesPlayed: 0 },
      debtSummary: {
        activeCount: debtSummary.activeCount,
        // Hiding exact amount for public, maybe just range or 'High/Low' if requested, but for now just count
        hasActiveDebt: debtSummary.activeCount > 0
      },
      joinedAt: (user as any).createdAt
    });
  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Update user avatar
 * @route   PUT /api/users/avatar
 * @access  Private
 */
export const updateUserAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { avatarId } = req.body;

    // Basic validation
    if (!avatarId || !avatarId.startsWith('avatar_')) {
      res.status(400).json({ message: 'Invalid avatar ID' });
      return;
    }

    const user = await User.findById((req as any).user._id);

    if (user) {
      user.avatarId = avatarId;
      await user.save();

      res.json({
        _id: user._id,
        avatarId: user.avatarId,
        message: 'Avatar updated'
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
