
const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channelController');
const { auth } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// @route   GET /api/channels/:channelId/messages
// @desc    Get messages for a channel
// @access  Private
router.get('/:channelId/messages', channelController.getChannelMessages);

// @route   POST /api/channels/:channelId/messages
// @desc    Send a message to a channel
// @access  Private
router.post('/:channelId/messages', channelController.sendChannelMessage);

module.exports = router;
