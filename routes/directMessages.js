
const express = require('express');
const router = express.Router();
const directMessageController = require('../controllers/directMessageController');
const { auth } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// @route   GET /api/direct-messages
// @desc    Get all direct message conversations
// @access  Private
router.get('/', directMessageController.getDirectMessages);

// @route   GET /api/direct-messages/:dmId
// @desc    Get messages between two users
// @access  Private
router.get('/:dmId', directMessageController.getMessagesBetweenUsers);

// @route   POST /api/direct-messages
// @desc    Send a direct message
// @access  Private
router.post('/', directMessageController.sendDirectMessage);

// @route   DELETE /api/direct-messages/:messageId
// @desc    Delete a direct message
// @access  Private
router.delete('/:messageId', directMessageController.deleteDirectMessage);

module.exports = router;
