import express from 'express';
import {
  requestUdhaar,
  approveUdhaar,
  repayUdhaar,
  getMyDebts,
} from '../controllers/debtController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/request', protect, requestUdhaar);
router.post('/approve/:id', protect, approveUdhaar);
router.post('/reject/:id', protect, async (req: any, res: any) => {
  try {
    const Debt = require('../models/Debt').default;
    const debt = await Debt.findById(req.params.id);

    if (!debt) {
      return res.status(404).json({ message: 'Debt request not found' });
    }

    if (debt.lender.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (debt.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }

    debt.status = 'rejected';
    await debt.save();

    // Notify borrower
    const io = req.app.get('io');
    const { guaranteedNotificationService } = require('../utils/guaranteedNotificationService');
    const User = require('../models/User').default;
    const lender = await User.findById(req.user.id);

    if (io && lender) {
      await guaranteedNotificationService.sendNotification(io, debt.borrower.toString(), {
        type: 'udhaar_rejected',
        data: {
          lender: lender.username,
          amount: debt.amount,
          timestamp: new Date()
        }
      });
    }

    res.json({ message: 'Request rejected', debt });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});
router.post('/repay/:id', protect, repayUdhaar);
router.get('/my-debts', protect, getMyDebts);

export default router;

