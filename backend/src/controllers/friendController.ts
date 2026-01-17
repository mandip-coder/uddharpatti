import { Request, Response } from 'express';
import User from '../models/User';
import FriendRequest from '../models/FriendRequest';
import Message from '../models/Message';
import Debt from '../models/Debt';
import MatchHistory from '../models/MatchHistory';
import { emitIfAllowed } from '../utils/notificationService';

// @desc    Send a friend request
// @route   POST /api/friends/request
// @access  Private
export const sendFriendRequest = async (req: any, res: Response): Promise<void> => {
  const { toUserId, recipientUsername } = req.body;

  // Support both toUserId and recipientUsername
  let targetUserId = toUserId;

  // If username provided, look up the user
  if (recipientUsername && !toUserId) {
    const targetUser = await User.findOne({ username: recipientUsername });
    if (!targetUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    targetUserId = targetUser._id.toString();
  }

  if (!targetUserId) {
    res.status(400).json({ message: 'Please provide toUserId or recipientUsername' });
    return;
  }

  if (targetUserId === req.user.id) {
    res.status(400).json({ message: 'You cannot add yourself as a friend' });
    return;
  }

  try {
    // Check if sender has blocked the recipient
    const senderBlockedRecipient = await User.findOne({
      _id: req.user.id,
      blockedUsers: targetUserId
    });

    if (senderBlockedRecipient) {
      res.status(400).json({ message: 'Cannot send friend request to blocked user' });
      return;
    }

    // Check if recipient has blocked the sender
    const recipientBlockedSender = await User.findOne({
      _id: targetUserId,
      blockedUsers: req.user.id
    });

    if (recipientBlockedSender) {
      res.status(400).json({ message: 'Cannot send friend request to this user' });
      return;
    }

    const existingRequest = await FriendRequest.findOne({
      from: req.user.id,
      to: targetUserId,
      status: 'pending',
    });

    if (existingRequest) {
      res.status(400).json({ message: 'Friend request already sent' });
      return;
    }

    const alreadyFriends = await User.findOne({
      _id: req.user.id,
      friends: targetUserId
    });

    if (alreadyFriends) {
      res.status(400).json({ message: 'You are already friends' });
      return;
    }

    const request = await FriendRequest.create({
      from: req.user.id,
      to: targetUserId,
    });

    // Notify recipient (if enabled)
    const io = req.app.get('io');
    if (io) {
      await emitIfAllowed(io, targetUserId, 'friend_request', {
        id: request._id,
        from: {
          _id: req.user.id,
          username: req.user.username, // Assuming username is available in req.user
          avatarId: req.user.avatarId
        }
      }, 'social.friendRequest');
    }

    res.status(201).json(request);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

// @desc    Accept a friend request
// @route   POST /api/friends/accept/:id
// @access  Private
// param id is the FriendRequest ID
export const acceptFriendRequest = async (req: any, res: Response): Promise<void> => {
  try {
    const request = await FriendRequest.findById(req.params.id);

    if (!request) {
      res.status(404).json({ message: 'Friend request not found' });
      return;
    }

    if (request.to.toString() !== req.user.id) {
      res.status(401).json({ message: 'Not authorized to accept this request' });
      return;
    }

    if (request.status !== 'pending') {
      res.status(400).json({ message: 'Request already handled' });
      return;
    }

    request.status = 'accepted';
    await request.save();

    // Add to friends list for both users
    await User.findByIdAndUpdate(request.from, {
      $addToSet: { friends: request.to },
    });
    await User.findByIdAndUpdate(request.to, {
      $addToSet: { friends: request.from },
    });

    // Notify sender that request was accepted (if enabled)
    const io = req.app.get('io');
    if (io) {
      await emitIfAllowed(io, request.from.toString(), 'friend_request_accepted', {
        friendId: request.to,
        username: req.user.username,
        avatarId: req.user.avatarId
      }, 'social.friendAccepted');
    }

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

// @desc    Reject a friend request
// @route   POST /api/friends/reject/:id
// @access  Private
export const rejectFriendRequest = async (req: any, res: Response): Promise<void> => {
  try {
    const request = await FriendRequest.findById(req.params.id);

    if (!request) {
      res.status(404).json({ message: 'Friend request not found' });
      return;
    }

    if (request.to.toString() !== req.user.id) {
      res.status(401).json({ message: 'Not authorized to reject this request' });
      return;
    }

    request.status = 'rejected';
    await request.save();

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

// @desc    Get pending friend requests
// @route   GET /api/friends/requests
// @access  Private
export const getFriendRequests = async (req: any, res: Response) => {
  try {
    const requests = await FriendRequest.find({
      to: req.user.id,
      status: 'pending',
    }).populate('from', 'username email');

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get all friends
// @route   GET /api/friends
// @access  Private
export const getFriends = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'username avatarId');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Import online status manager
    const { onlineStatusManager } = require('../utils/onlineStatusManager');

    // Enrich with online status
    const friendsWithStatus = user.friends.map((friend: any) => {
      const statusInfo = onlineStatusManager.getUserStatus(friend._id.toString());
      const gameInfo = onlineStatusManager.getUserGameInfo(friend._id.toString());

      console.log(`[getFriends] Friend ${friend.username} status:`, statusInfo);

      return {
        _id: friend._id,
        username: friend.username,
        avatarId: friend.avatarId,
        status: statusInfo.status, // Extract the status string from the object
        gameInfo: statusInfo.inGame ? {
          roomId: gameInfo.roomId,
          gameState: gameInfo.gameState
        } : undefined
      };
    });

    console.log('[getFriends] Returning friends:', friendsWithStatus);
    res.json({ friends: friendsWithStatus });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Search for users by username
// @route   GET /api/friends/search?q=<query>
// @access  Private
export const searchUsers = async (req: any, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;

    // Validate query
    if (!query || query.trim().length < 2) {
      res.status(400).json({ message: 'Search query must be at least 2 characters' });
      return;
    }

    if (query.length > 50) {
      res.status(400).json({ message: 'Search query must be less than 50 characters' });
      return;
    }

    const currentUserId = req.user.id;

    // Get current user to access their blocked users list
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Find users who have blocked the current user
    const usersWhoBlockedMe = await User.find({
      blockedUsers: currentUserId
    }).select('_id');

    const blockedByIds = usersWhoBlockedMe.map(u => u._id.toString());

    // Search for users, excluding:
    // 1. Current user
    // 2. Users blocked by current user
    // 3. Users who blocked current user
    const users = await User.find({
      username: { $regex: query, $options: 'i' },
      _id: {
        $ne: currentUserId,
        $nin: [...currentUser.blockedUsers, ...blockedByIds]
      }
    })
      .select('username email avatarId')
      .limit(20);

    // Get friendship status for each user
    const results = await Promise.all(users.map(async (user) => {
      const userId = user._id.toString();

      // Check if already friends
      const isFriend = currentUser.friends.some(
        friendId => friendId.toString() === userId
      );

      if (isFriend) {
        return {
          _id: user._id,
          username: user.username,
          email: user.email,
          avatarId: user.avatarId,
          friendshipStatus: 'friends'
        };
      }

      // Check for pending friend request (either direction)
      const pendingRequest = await FriendRequest.findOne({
        $or: [
          { from: currentUserId, to: userId, status: 'pending' },
          { from: userId, to: currentUserId, status: 'pending' }
        ]
      });

      if (pendingRequest) {
        return {
          _id: user._id,
          username: user.username,
          email: user.email,
          avatarId: user.avatarId,
          friendshipStatus: 'pending'
        };
      }

      return {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatarId: user.avatarId,
        friendshipStatus: 'none'
      };
    }));

    res.json({
      results,
      count: results.length
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Block a user
// @route   POST /api/friends/block/:userId
// @access  Private
export const blockUser = async (req: any, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Prevent self-blocking
    if (userId === currentUserId) {
      res.status(400).json({ message: 'You cannot block yourself' });
      return;
    }

    // Check if user to block exists
    const userToBlock = await User.findById(userId);
    if (!userToBlock) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Add to blocked users list (addToSet prevents duplicates)
    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { blockedUsers: userId }
    });

    // Remove from friends list if they are friends
    await User.findByIdAndUpdate(currentUserId, {
      $pull: { friends: userId }
    });
    await User.findByIdAndUpdate(userId, {
      $pull: { friends: currentUserId }
    });

    // Cancel any pending friend requests between the two users
    await FriendRequest.updateMany(
      {
        $or: [
          { from: currentUserId, to: userId, status: 'pending' },
          { from: userId, to: currentUserId, status: 'pending' }
        ]
      },
      { status: 'rejected' }
    );

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Unblock a user
// @route   POST /api/friends/unblock/:userId
// @access  Private
export const unblockUser = async (req: any, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Remove from blocked users list
    await User.findByIdAndUpdate(currentUserId, {
      $pull: { blockedUsers: userId }
    });

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get blocked users
// @route   GET /api/friends/blocked
// @access  Private
export const getBlockedUsers = async (req: any, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user.id).populate('blockedUsers', 'username email avatarId');
    res.json(user?.blockedUsers || []);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get friend stats (public summary)
// @route   GET /api/friends/stats/:friendId
// @access  Private
export const getFriendStats = async (req: any, res: Response): Promise<void> => {
  try {
    const { friendId } = req.params;
    const currentUserId = req.user.id;

    // Verify friendship
    const currentUser = await User.findById(currentUserId);
    if (!currentUser || !currentUser.friends.includes(friendId)) {
      res.status(403).json({ message: 'Not authorized to view stats (must be friends)' });
      return;
    }

    const friend = await User.findById(friendId);
    if (!friend) {
      res.status(404).json({ message: 'Friend not found' });
      return;
    }

    // Calculate Debt Stats (Summary Only)
    // 1. Total Active Debts (as borrower)
    // 2. Total Outstanding Udhaar (as borrower)
    const activeDebts = await Debt.find({
      borrower: friendId,
      status: 'active'
    });

    const totalActiveDebts = activeDebts.length;
    const totalOutstandingAmount = activeDebts.reduce((sum, debt) => sum + debt.amount, 0);

    // Calculate Trust Score (Mock logic for now, or based on repayment history)
    // For now, let's just return a placeholder or calculate based on repaid vs total
    const repaidDebtsCount = await Debt.countDocuments({ borrower: friendId, status: 'repaid' });
    const totalDebtsCount = await Debt.countDocuments({ borrower: friendId });

    // Simple trust logic:
    // < 5 debts = 'New'
    // > 80% repayment = 'Trustworthy'
    // < 50% repayment = 'High Risk'
    // else 'Neutral'
    let trustLabel = 'New';
    if (totalDebtsCount >= 5) {
      const repaymentRate = repaidDebtsCount / totalDebtsCount;
      if (repaymentRate >= 0.8) trustLabel = 'Trustworthy';
      else if (repaymentRate < 0.5) trustLabel = 'High Risk';
      else trustLabel = 'Neutral';
    }

    const stats = {
      username: friend.username,
      avatarId: friend.avatarId,
      gamesPlayed: friend.stats.gamesPlayed,
      wins: friend.stats.wins,
      losses: friend.stats.losses,
      winPercentage: friend.stats.gamesPlayed > 0
        ? Math.round((friend.stats.wins / friend.stats.gamesPlayed) * 100)
        : 0,
      debtSummary: {
        totalActiveDebts,
        // Round to nearest 10 for privacy if needed, but exact is fine for summary as per requirements
        totalOutstandingAmount: Math.round(totalOutstandingAmount),
        trustLabel
      }
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get chat history with a friend
// @route   GET /api/friends/chat/:friendId
// @access  Private
export const getChatHistory = async (req: any, res: Response): Promise<void> => {
  try {
    const { friendId } = req.params;
    const currentUserId = req.user.id;

    // Verify friendship (optional, but good for privacy)
    // Actually, even if un-friended, history might be relevant, but for now strict to friends
    const currentUser = await User.findById(currentUserId);
    if (!currentUser || !currentUser.friends.includes(friendId)) {
      // Allow checking history if they WERE friends? For now strict.
      // res.status(403).json({ message: 'Must be friends to chat' });
      // return;
    }

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: friendId },
        { sender: friendId, recipient: currentUserId }
      ]
    })
      .sort({ createdAt: 1 }) // Oldest first
      .limit(50); // Limit to last 50 messages for now

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};


// @desc    Get head-to-head stats with opponent
// @route   GET /api/friends/stats/vs/:opponentId
// @access  Private
export const getHeadToHeadStats = async (req: any, res: Response): Promise<void> => {
  try {
    const { opponentId } = req.params;
    const currentUserId = req.user.id;

    if (!opponentId) {
      res.status(400).json({ message: 'Opponent ID required' });
      return;
    }

    // 1. Find all matches involving BOTH players
    const matches = await MatchHistory.find({
      participants: { $all: [currentUserId, opponentId] }
    }).sort({ endedAt: -1 });

    const totalMatches = matches.length;
    let wins = 0;
    let losses = 0;
    let draws = 0;

    matches.forEach(match => {
      // Check if current user is in winners list
      const isWinner = match.winners.some(id => id.toString() === currentUserId);

      // Check if opponent is in winners list
      const isOpponentWinner = match.winners.some(id => id.toString() === opponentId);

      if (isWinner) {
        wins++;
      } else if (isOpponentWinner) {
        losses++;
      } else {
        draws++;
      }
    });

    const winRatio = totalMatches > 0
      ? Math.round((wins / totalMatches) * 100)
      : 0;

    // Optional: Get last match result
    let lastMatchResult = null;
    if (matches.length > 0) {
      const lastMatch = matches[0];
      const amIWinner = lastMatch.winners.some(id => id.toString() === currentUserId);
      const isOpponentWinner = lastMatch.winners.some(id => id.toString() === opponentId);

      if (amIWinner) lastMatchResult = 'WON';
      else if (isOpponentWinner) lastMatchResult = 'LOST';
      else lastMatchResult = 'DRAW';
    }

    res.json({
      totalMatches,
      wins,
      losses,
      draws,
      winRatio,
      lastMatchResult
    });

  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
