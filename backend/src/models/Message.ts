import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  content: string;
  read: boolean;
  type: 'TEXT' | 'SYSTEM' | 'GAME_INVITE' | 'IMAGE';
  metadata?: {
    inviteTableId?: string;
    inviteBetAmount?: number;
    systemEventType?: string;
  };
  reactions: Map<string, string>; // userId -> emoji
  status: 'SENT' | 'DELIVERED' | 'SEEN';
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    read: {
      type: Boolean,
      default: false,
    },
    // New Fields
    type: {
      type: String,
      enum: ['TEXT', 'SYSTEM', 'GAME_INVITE', 'IMAGE'],
      default: 'TEXT',
    },
    metadata: {
      inviteTableId: String,
      inviteBetAmount: Number,
      systemEventType: String,
    },
    reactions: {
      type: Map,
      of: String,
      default: {},
    },
    status: {
      type: String,
      enum: ['SENT', 'DELIVERED', 'SEEN'],
      default: 'SENT',
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying of conversation history
MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
MessageSchema.index({ recipient: 1, sender: 1, createdAt: -1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
