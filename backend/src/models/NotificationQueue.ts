import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationQueue extends Document {
  notificationId: string;
  userId: mongoose.Types.ObjectId;
  type: string;
  sourceUserId?: string;
  data: any;
  status: 'pending' | 'delivered' | 'failed' | 'accepted' | 'rejected' | 'dismissed';
  attempts: number;
  lastAttempt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}

const NotificationQueueSchema: Schema = new Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sourceUserId: {
    type: String
  },
  type: {
    type: String,
    required: true
  },
  data: {
    type: Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'failed', 'accepted', 'rejected', 'dismissed'],
    default: 'pending',
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastAttempt: Date,
  deliveredAt: Date
}, {
  timestamps: true
});

// Auto-delete delivered notifications after 7 days
NotificationQueueSchema.index(
  { deliveredAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 }
);

// Index for efficient querying of pending notifications
NotificationQueueSchema.index({ userId: 1, status: 1 });

export default mongoose.model<INotificationQueue>('NotificationQueue', NotificationQueueSchema);
