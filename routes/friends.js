
const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const { auth } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// @route   GET /api/friends
// @desc    Get all friends and friend requests
// @access  Private
router.get('/', friendController.getFriends);

// @route   POST /api/friends/requests
// @desc    Send a friend request
// @access  Private
router.post('/requests', friendController.sendFriendRequest);

// @route   POST /api/friends/requests/:requestId/accept
// @desc    Accept a friend request
// @access  Private
router.post('/requests/:requestId/accept', friendController.acceptFriendRequest);

// @route   POST /api/friends/requests/:requestId/reject
// @desc    Reject a friend request
// @access  Private
router.post('/requests/:requestId/reject', friendController.rejectFriendRequest);

// @route   DELETE /api/friends/:friendId
// @desc    Remove a friend
// @access  Private
router.delete('/:friendId', friendController.removeFriend);

module.exports = router;
