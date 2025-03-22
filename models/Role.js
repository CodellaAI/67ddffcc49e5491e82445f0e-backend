
const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  color: {
    type: String,
    default: '#99AAB5'
  },
  hoist: {
    type: Boolean,
    default: false
  },
  position: {
    type: Number,
    default: 0
  },
  permissions: {
    type: Number,
    default: 0
  },
  mentionable: {
    type: Boolean,
    default: false
  },
  guild: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guild',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Role', roleSchema);
