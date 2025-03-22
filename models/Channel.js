
const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  type: {
    type: String,
    enum: ['text', 'voice', 'category'],
    default: 'text'
  },
  topic: {
    type: String,
    default: '',
    maxlength: 1024
  },
  guild: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guild',
    required: true
  },
  category: {
    type: String,
    default: 'general'
  },
  position: {
    type: Number,
    default: 0
  },
  permissionOverwrites: [{
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'permissionOverwrites.type'
    },
    type: {
      type: String,
      enum: ['Role', 'User'],
      required: true
    },
    allow: {
      type: Number,
      default: 0
    },
    deny: {
      type: Number,
      default: 0
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Channel', channelSchema);
