
const mongoose = require('mongoose');
const shortid = require('shortid');

const inviteSchema = new mongoose.Schema({
  code: {
    type: String,
    default: () => shortid.generate(),
    unique: true
  },
  guild: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guild',
    required: true
  },
  inviter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uses: {
    type: Number,
    default: 0
  },
  maxUses: {
    type: Number,
    default: 0
  },
  maxAge: {
    type: Number,
    default: 86400 // 24 hours in seconds
  },
  temporary: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function() {
      if (this.maxAge > 0) {
        return new Date(Date.now() + this.maxAge * 1000);
      }
      return null;
    }
  }
}, {
  timestamps: true
});

// Check if invite is expired
inviteSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return Date.now() > this.expiresAt;
};

// Check if invite has reached max uses
inviteSchema.methods.hasReachedMaxUses = function() {
  if (this.maxUses === 0) return false;
  return this.uses >= this.maxUses;
};

module.exports = mongoose.model('Invite', inviteSchema);
