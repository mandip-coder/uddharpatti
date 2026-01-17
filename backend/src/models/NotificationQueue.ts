import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationQueue extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  data: any;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttempt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}

const NotificationQueueSchema: Schema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
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
    enum: ['pending', 'delivered', 'failed'],
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
