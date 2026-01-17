import express from 'express';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  getFriends,
  searchUsers,
  blockUser,
  unblockUser,
  getBlockedUsers,
  getFriendStats,
  getChatHistory,
  getHeadToHeadStats,
} from '../controllers/friendController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/request', protect, sendFriendRequest);
router.post('/accept/:id', protect, acceptFriendRequest);
router.post('/reject/:id', protect, rejectFriendRequest);
router.get('/requests', protect, getFriendRequests);
router.get('/search', protect, searchUsers);
router.post('/block/:userId', protect, blockUser);
router.post('/unblock/:userId', protect, unblockUser);
router.get('/blocked', protect, getBlockedUsers);
router.get('/stats/:friendId', protect, getFriendStats);
router.get('/stats/vs/:opponentId', protect, getHeadToHeadStats);
router.get('/chat/:friendId', protect, getChatHistory);
router.get('/', protect, getFriends);

export default router;
