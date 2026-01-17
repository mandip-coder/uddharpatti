import mongoose, { Document, Schema } from 'mongoose';

export interface IDebt extends Document {
  lender: mongoose.Types.ObjectId;
  borrower: mongoose.Types.ObjectId;
  amount: number;
  interestRate: number; // Percentage (0-10)
  status: 'pending' | 'active' | 'repaid' | 'rejected';
  dueDate?: Date;
  repaymentDate?: Date;
  // totalRepaid amount?
}

const DebtSchema: Schema = new Schema(
  {
    lender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    borrower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    interestRate: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'repaid', 'rejected'],
      default: 'pending',
    },
    dueDate: {
      type: Date,
    },
    repaymentDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IDebt>('Debt', DebtSchema);
