import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId;
  notifications: {
    game: {
      turnTimerWarning: boolean;
      yourTurn: boolean;
      roundResult: boolean;
      opponentLeft: boolean;
      sideShowRequest: boolean;
    };
    social: {
      friendRequest: boolean;
      friendAccepted: boolean;
      userBlocked: boolean;
    };
    debt: {
      udhaarRequest: boolean;
      udhaarResponse: boolean;
      interestApplied: boolean;
      repaymentReminder: boolean;
      overdueWarning: boolean;
    };
  };
}

const UserSettingsSchema: Schema<IUserSettings> = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    notifications: {
      game: {
        turnTimerWarning: {
          type: Boolean,
          default: true,
        },
        yourTurn: {
          type: Boolean,
          default: true,
        },
        roundResult: {
          type: Boolean,
          default: true,
        },
        opponentLeft: {
          type: Boolean,
          default: true,
        },
        sideShowRequest: {
          type: Boolean,
          default: true,
        },
      },
      social: {
        friendRequest: {
          type: Boolean,
          default: true,
        },
        friendAccepted: {
          type: Boolean,
          default: true,
        },
        userBlocked: {
          type: Boolean,
          default: true,
        },
      },
      debt: {
        udhaarRequest: {
          type: Boolean,
          default: true,
        },
        udhaarResponse: {
          type: Boolean,
          default: true,
        },
        interestApplied: {
          type: Boolean,
          default: true,
        },
        repaymentReminder: {
          type: Boolean,
          default: true,
        },
        overdueWarning: {
          type: Boolean,
          default: true,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);
