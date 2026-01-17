import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import UserSettings from '../models/UserSettings';
import { getDebtSummary } from '../utils/userStats';

// Generate JWT
const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

const buildAuthResponse = async (user: any, token?: string) => {
  const debt = await getDebtSummary(user._id);
  const response: any = {
    _id: user.id,
    username: user.username,
    email: user.email,
    walletBalance: user.walletBalance,
    avatarId: user.avatarId,
    friends: user.friends,
    stats: user.stats || { wins: 0, losses: 0, gamesPlayed: 0 },
    debtSummary: {
      activeCount: debt.activeCount,
      totalAmount: debt.totalAmount,
      hasActiveDebt: debt.activeCount > 0
    }
  };
  if (token) response.token = token;
  return response;
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const user = await User.create({
      username,
      email,
      password,
      stats: { wins: 0, losses: 0, gamesPlayed: 0 }
    });

    if (user) {
      // Create default settings for new user
      await UserSettings.create({
        userId: user.id
      });

      const response = await buildAuthResponse(user, generateToken(user.id));
      res.status(201).json(response);
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      const response = await buildAuthResponse(user, generateToken(user.id));
      res.json(response);
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
// (Middleware will attach user to req)
export const getMe = async (req: any, res: Response) => {
  const user = await User.findById(req.user.id);
  if (user) {
    const response = await buildAuthResponse(user);
    res.status(200).json(response);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};
