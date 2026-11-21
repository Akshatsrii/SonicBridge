import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    gamerTag: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 24,
    },
    password: {
      type: String,
      required: true,
      minlength: 4,
    },
    team: {
      type: String,
      enum: ['BLUE', 'RED', 'NEON', 'SOLO'],
      default: 'SOLO',
    },
    avatar: {
      type: String,
      default: '⚡',
    },
    stats: {
      messagesSent: { type: Number, default: 0 },
      filesTransferred: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Format user object for client response (exclude password)
userSchema.methods.toClientJSON = function () {
  return {
    id: this._id,
    gamerTag: this.gamerTag,
    team: this.team,
    avatar: this.avatar,
    stats: this.stats,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);
