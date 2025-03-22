
const express = require('express');
const router = express.Router();
const guildController = require('../controllers/guildController');
const channelController = require('../controllers/channelController');
const inviteController = require('../controllers/inviteController');
const { auth } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// @route   POST /api/guilds
// @desc    Create a new guild
// @access  Private
router.post('/', guildController.createGuild);

// @route   GET /api/guilds
// @desc    Get all guilds for current user
// @access  Private
router.get('/', guildController.getUserGuilds);

// @route   GET /api/guilds/:guildId
// @desc    Get a specific guild
// @access  Private
router.get('/:guildId', guildController.getGuild);

// @route   PUT /api/guilds/:guildId
// @desc    Update a guild
// @access  Private (Guild Owner)
router.put('/:guildId', guildController.updateGuild);

// @route   DELETE /api/guilds/:guildId
// @desc    Delete a guild
// @access  Private (Guild Owner)
router.delete('/:guildId', guildController.deleteGuild);

// @route   POST /api/guilds/:guildId/members
// @desc    Add a member to a guild
// @access  Private
router.post('/:guildId/members', guildController.addMember);

// @route   DELETE /api/guilds/:guildId/members/:userId
// @desc    Remove a member from a guild
// @access  Private (Guild Owner or Self)
router.delete('/:guildId/members/:userId', guildController.removeMember);

// Channel routes
// @route   POST /api/guilds/:guildId/channels
// @desc    Create a new channel in a guild
// @access  Private
router.post('/:guildId/channels', channelController.createChannel);

// @route   GET /api/guilds/:guildId/channels
// @desc    Get all channels for a guild
// @access  Private
router.get('/:guildId/channels', channelController.getGuildChannels);

// @route   GET /api/guilds/:guildId/channels/:channelId
// @desc    Get a specific channel
// @access  Private
router.get('/:guildId/channels/:channelId', channelController.getChannel);

// @route   PUT /api/guilds/:guildId/channels/:channelId
// @desc    Update a channel
// @access  Private
router.put('/:guildId/channels/:channelId', channelController.updateChannel);

// @route   DELETE /api/guilds/:guildId/channels/:channelId
// @desc    Delete a channel
// @access  Private (Guild Owner)
router.delete('/:guildId/channels/:channelId', channelController.deleteChannel);

// Invite routes
// @route   POST /api/guilds/:guildId/invites
// @desc    Create a new invite for a guild
// @access  Private
router.post('/:guildId/invites', inviteController.createInvite);

module.exports = router;
