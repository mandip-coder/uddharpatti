import { Response } from 'express';
import User from '../models/User';
import Debt from '../models/Debt';
import mongoose from 'mongoose';
import { emitIfAllowed } from '../utils/notificationService';

// @desc    Request Udhaar (Borrow Money)
// @route   POST /api/debt/request
// @access  Private
export const requestUdhaar = async (req: any, res: Response): Promise<void> => {
  const { lenderId, amount, interestRate } = req.body;

  if (amount <= 0) {
    res.status(400).json({ message: 'Amount must be greater than 0' });
    return;
  }

  if (interestRate < 0 || interestRate > 10) {
    res.status(400).json({ message: 'Interest rate must be between 0 and 10%' });
    return;
  }

  try {
    // Check if total debt of borrower exceeds 1000
    // We sum up 'active' debts where user is borrower
    const activeDebts = await Debt.find({ borrower: req.user.id, status: 'active' });
    const currentDebtTotal = activeDebts.reduce((acc, debt) => acc + debt.amount, 0);

    if (currentDebtTotal + amount > 1000) {
      res.status(400).json({ message: 'Debt limit reached (Max 1000 coins)' });
      return;
    }

    const debt = await Debt.create({
      lender: lenderId,
      borrower: req.user.id,
      amount,
      interestRate,
      status: 'pending',
    });

    // Notify Lender (if enabled)
    const io = req.app.get('io');
    const borrower = await User.findById(req.user.id);
    if (io) {
      await emitIfAllowed(io, lenderId, 'udhaar_request_received', {
        requestId: debt.id,
        borrower: { username: borrower?.username, trustScore: 100 }, // Mock score
        amount,
        interestRate,
        timestamp: new Date()
      }, 'debt.udhaarRequest');
    }

    res.status(201).json(debt);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Approve Udhaar (Lend Money)
// @route   POST /api/debt/approve/:id
// @access  Private
// This involves a transaction: deducting from lender, creating active debt.
// Note: Borrower balance is added ONLY when request is approved?
// Or does borrower get money immediately?
// Usually: Lender approves -> Transfer money Lender to Borrower -> Debt Active.
export const approveUdhaar = async (req: any, res: Response): Promise<void> => {
  try {
    const debt = await Debt.findById(req.params.id);

    if (!debt) {
      res.status(404).json({ message: 'Debt request not found' });
      return;
    }

    if (debt.lender.toString() !== req.user.id) {
      res.status(401).json({ message: 'Not authorized to approve this request' });
      return;
    }

    if (debt.status !== 'pending') {
      res.status(400).json({ message: 'Request already processed' });
      return;
    }

    const lender = await User.findById(req.user.id);
    const borrower = await User.findById(debt.borrower);

    if (!lender || !borrower) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (lender.walletBalance < debt.amount) {
      res.status(400).json({ message: 'Insufficient balance to lend' });
      return;
    }

    // Transfer coins
    lender.walletBalance -= debt.amount;
    borrower.walletBalance += debt.amount;

    await lender.save();
    await borrower.save();

    // Activate debt
    debt.status = 'active';
    await debt.save();

    // Notify Borrower (if enabled)
    const io = req.app.get('io');
    if (io) {
      await emitIfAllowed(io, debt.borrower.toString(), 'udhaar_approved', {
        lender: lender.username,
        amount: debt.amount,
        newBalance: borrower.walletBalance
      }, 'debt.udhaarResponse');
    }

    res.json({ message: 'Udhaar approved and coins transferred', debt });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Repay Udhaar
// @route   POST /api/debt/repay/:id
// @access  Private
export const repayUdhaar = async (req: any, res: Response): Promise<void> => {
  try {
    const debt = await Debt.findById(req.params.id);

    if (!debt) {
      res.status(404).json({ message: 'Debt not found' });
      return;
    }

    if (debt.borrower.toString() !== req.user.id) {
      res.status(401).json({ message: 'Not authorized to repay this debt' });
      return;
    }

    if (debt.status !== 'active') {
      res.status(400).json({ message: 'Debt is not active' });
      return;
    }

    // Calculate total repayment with simple interest
    const interestAmount = (debt.amount * debt.interestRate) / 100;
    const totalRepayment = debt.amount + interestAmount;

    const borrower = await User.findById(req.user.id);
    const lender = await User.findById(debt.lender);

    if (!borrower || !lender) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (borrower.walletBalance < totalRepayment) {
      res.status(400).json({ message: 'Insufficient balance to repay' });
      return;
    }

    // Transfer back
    borrower.walletBalance -= totalRepayment;
    lender.walletBalance += totalRepayment;

    await borrower.save();
    await lender.save();

    debt.status = 'repaid';
    debt.repaymentDate = new Date();
    await debt.save();

    // Notify Lender (if enabled)
    const io = req.app.get('io');
    if (io) {
      await emitIfAllowed(io, debt.lender.toString(), 'debt_repayment_received', {
        borrower: borrower.username,
        amountRepaid: totalRepayment,
        timestamp: new Date()
      }, 'debt.repaymentReminder'); // Using repaymentReminder as a close proxy or create new type
    }

    res.json({ message: 'Debt repaid successfully', totalPaid: totalRepayment });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get my debts (as borrower or lender)
// @route   GET /api/debt/my-debts
// @access  Private
export const getMyDebts = async (req: any, res: Response) => {
  try {
    const debts = await Debt.find({
      $or: [{ borrower: req.user.id }, { lender: req.user.id }]
    }).populate('lender', 'username').populate('borrower', 'username');
    res.json(debts);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
