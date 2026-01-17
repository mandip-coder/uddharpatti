import mongoose, { Document, Schema } from 'mongoose';

export interface IMatchHistory extends Document {
  roomId: string; // The game session ID
  tableType: string; // e.g., 'STARTER', 'VIP'
  participants: mongoose.Types.ObjectId[]; // All players engaged in the round
  winners: mongoose.Types.ObjectId[]; // The winner(s) of the pot
  potAmount: number;
  endedAt: Date;
}

const MatchHistorySchema: Schema = new Schema(
  {
    roomId: {
      type: String,
      required: true,
    },
    tableType: {
      type: String,
      required: true,
      default: 'STANDARD',
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    winners: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    potAmount: {
      type: Number,
      required: true,
    },
    endedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt, updatedAt automatically
  }
);

// Indexes for fast lookup of player history
MatchHistorySchema.index({ participants: 1, endedAt: -1 });

export default mongoose.model<IMatchHistory>('MatchHistory', MatchHistorySchema);
