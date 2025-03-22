
const Invite = require('../models/Invite');
const Guild = require('../models/Guild');
const User = require('../models/User');

// Create a new invite
exports.createInvite = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { maxUses, maxAge, temporary } = req.body;
    
    // Check if guild exists
    const guild = await Guild.findById(guildId);
    if (!guild) {
      return res.status(404).json({ message: 'Guild not found' });
    }
    
    // Check if user is a member of the guild
    const isMember = guild.members.some(member => member.user.toString() === req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this guild' });
    }
    
    // Create invite
    const invite = new Invite({
      guild: guildId,
      inviter: req.user.id,
      maxUses: maxUses || 0,
      maxAge: maxAge || 86400, // Default to 24 hours
      temporary: temporary || false
    });
    
    await invite.save();
    
    res.status(201).json(invite);
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get an invite by code
exports.getInvite = async (req, res) => {
  try {
    const { code } = req.params;
    
    const invite = await Invite.findOne({ code })
      .populate('guild', 'name icon')
      .populate('inviter', 'username avatar discriminator');
    
    if (!invite) {
      return res.status(404).json({ message: 'Invite not found' });
    }
    
    // Check if invite is expired
    if (invite.isExpired()) {
      return res.status(410).json({ message: 'Invite has expired' });
    }
    
    // Check if invite has reached max uses
    if (invite.hasReachedMaxUses()) {
      return res.status(410).json({ message: 'Invite has reached maximum uses' });
    }
    
    // Get member count for the guild
    const guild = await Guild.findById(invite.guild._id);
    const memberCount = guild.members.length;
    
    // Return invite with additional guild info
    res.json({
      ...invite.toObject(),
      guild: {
        ...invite.guild.toObject(),
        memberCount
      }
    });
  } catch (error) {
    console.error('Get invite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Accept an invite
exports.acceptInvite = async (req, res) => {
  try {
    const { code } = req.params;
    
    const invite = await Invite.findOne({ code });
    if (!invite) {
      return res.status(404).json({ message: 'Invite not found' });
    }
    
    // Check if invite is expired
    if (invite.isExpired()) {
      return res.status(410).json({ message: 'Invite has expired' });
    }
    
    // Check if invite has reached max uses
    if (invite.hasReachedMaxUses()) {
      return res.status(410).json({ message: 'Invite has reached maximum uses' });
    }
    
    // Check if user is already a member of the guild
    const guild = await Guild.findById(invite.guild);
    const isMember = guild.members.some(member => member.user.toString() === req.user.id);
    if (isMember) {
      return res.status(400).json({ message: 'You are already a member of this guild' });
    }
    
    // Add user to guild members
    guild.members.push({ user: req.user.id });
    await guild.save();
    
    // Add guild to user's guilds
    await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { guilds: invite.guild } }
    );
    
    // Increment invite uses
    invite.uses += 1;
    await invite.save();
    
    res.json({ message: 'Successfully joined the guild' });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete an invite
exports.deleteInvite = async (req, res) => {
  try {
    const { code } = req.params;
    
    const invite = await Invite.findOne({ code });
    if (!invite) {
      return res.status(404).json({ message: 'Invite not found' });
    }
    
    // Check if user is the guild owner or the invite creator
    const guild = await Guild.findById(invite.guild);
    if (guild.owner.toString() !== req.user.id && invite.inviter.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this invite' });
    }
    
    await Invite.findByIdAndDelete(invite._id);
    
    res.json({ message: 'Invite deleted successfully' });
  } catch (error) {
    console.error('Delete invite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
