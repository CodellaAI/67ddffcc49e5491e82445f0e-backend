
const express = require('express');
const router = express.Router();
const inviteController = require('../controllers/inviteController');
const { auth } = require('../middleware/auth');

// @route   GET /api/invites/:code
// @desc    Get an invite by code
// @access  Public
router.get('/:code', inviteController.getInvite);

// Apply auth middleware to protected routes
router.use(auth);

// @route   POST /api/invites/:code/accept
// @desc    Accept an invite
// @access  Private
router.post('/:code/accept', inviteController.acceptInvite);

// @route   DELETE /api/invites/:code
// @desc    Delete an invite
// @access  Private (Guild Owner or Invite Creator)
router.delete('/:code', inviteController.deleteInvite);

module.exports = router;
