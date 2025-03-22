
const Guild = require('../models/Guild');
const User = require('../models/User');
const Channel = require('../models/Channel');
const Role = require('../models/Role');

// Create a new guild
exports.createGuild = async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    
    // Create the guild
    const guild = new Guild({
      name,
      description: description || '',
      icon: icon || '',
      owner: req.user.id,
      members: [{ user: req.user.id }]
    });
    
    await guild.save();
    
    // Create default roles
    const everyoneRole = new Role({
      name: '@everyone',
      guild: guild._id,
      position: 0,
      permissions: 0 // Basic permissions
    });
    
    await everyoneRole.save();
    
    // Create default channels
    const generalChannel = new Channel({
      name: 'general',
      type: 'text',
      guild: guild._id,
      category: 'Text Channels'
    });
    
    const generalVoice = new Channel({
      name: 'General',
      type: 'voice',
      guild: guild._id,
      category: 'Voice Channels'
    });
    
    await Promise.all([generalChannel.save(), generalVoice.save()]);
    
    // Update guild with channels and roles
    guild.channels = [generalChannel._id, generalVoice._id];
    guild.roles = [everyoneRole._id];
    await guild.save();
    
    // Add guild to user's guilds
    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { guilds: guild._id } }
    );
    
    // Populate response data
    const populatedGuild = await Guild.findById(guild._id)
      .populate('owner', 'username avatar discriminator')
      .populate({
        path: 'members.user',
        select: 'username avatar discriminator status'
      })
      .populate('channels')
      .populate('roles');
    
    res.status(201).json(populatedGuild);
  } catch (error) {
    console.error('Create guild error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all guilds for current user
exports.getUserGuilds = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'guilds',
      populate: {
        path: 'owner',
        select: 'username avatar discriminator'
      }
    });
    
    res.json(user.guilds);
  } catch (error) {
    console.error('Get user guilds error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a specific guild
exports.getGuild = async (req, res) => {
  try {
    const { guildId } = req.params;
    
    // Check if user is a member of the guild
    const user = await User.findById(req.user.id);
    if (!user.guilds.includes(guildId)) {
      return res.status(403).json({ message: 'Not a member of this guild' });
    }
    
    const guild = await Guild.findById(guildId)
      .populate('owner', 'username avatar discriminator')
      .populate({
        path: 'members.user',
        select: 'username avatar discriminator status'
      })
      .populate('channels')
      .populate('roles');
    
    if (!guild) {
      return res.status(404).json({ message: 'Guild not found' });
    }
    
    res.json(guild);
  } catch (error) {
    console.error('Get guild error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a guild
exports.updateGuild = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { name, description, icon } = req.body;
    
    // Check if guild exists
    const guild = await Guild.findById(guildId);
    if (!guild) {
      return res.status(404).json({ message: 'Guild not found' });
    }
    
    // Check if user is the owner
    if (guild.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the guild owner can update the guild' });
    }
    
    // Update guild
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    
    const updatedGuild = await Guild.findByIdAndUpdate(
      guildId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('owner', 'username avatar discriminator')
      .populate({
        path: 'members.user',
        select: 'username avatar discriminator status'
      })
      .populate('channels')
      .populate('roles');
    
    res.json(updatedGuild);
  } catch (error) {
    console.error('Update guild error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a guild
exports.deleteGuild = async (req, res) => {
  try {
    const { guildId } = req.params;
    
    // Check if guild exists
    const guild = await Guild.findById(guildId);
    if (!guild) {
      return res.status(404).json({ message: 'Guild not found' });
    }
    
    // Check if user is the owner
    if (guild.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the guild owner can delete the guild' });
    }
    
    // Delete all associated channels
    await Channel.deleteMany({ guild: guildId });
    
    // Delete all associated roles
    await Role.deleteMany({ guild: guildId });
    
    // Remove guild from all members' guilds array
    await User.updateMany(
      { guilds: guildId },
      { $pull: { guilds: guildId } }
    );
    
    // Delete the guild
    await Guild.findByIdAndDelete(guildId);
    
    res.json({ message: 'Guild deleted successfully' });
  } catch (error) {
    console.error('Delete guild error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a member to a guild
exports.addMember = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { userId } = req.body;
    
    // Check if guild exists
    const guild = await Guild.findById(guildId);
    if (!guild) {
      return res.status(404).json({ message: 'Guild not found' });
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is already a member
    const isMember = guild.members.some(member => member.user.toString() === userId);
    if (isMember) {
      return res.status(400).json({ message: 'User is already a member of this guild' });
    }
    
    // Add user to guild members
    guild.members.push({ user: userId });
    await guild.save();
    
    // Add guild to user's guilds
    user.guilds.push(guildId);
    await user.save();
    
    res.json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove a member from a guild
exports.removeMember = async (req, res) => {
  try {
    const { guildId, userId } = req.params;
    
    // Check if guild exists
    const guild = await Guild.findById(guildId);
    if (!guild) {
      return res.status(404).json({ message: 'Guild not found' });
    }
    
    // Check if user is the owner or removing themselves
    if (guild.owner.toString() !== req.user.id && req.user.id !== userId) {
      return res.status(403).json({ message: 'Not authorized to remove this member' });
    }
    
    // Check if trying to remove the owner
    if (guild.owner.toString() === userId) {
      return res.status(400).json({ message: 'Cannot remove the guild owner' });
    }
    
    // Remove user from guild members
    await Guild.findByIdAndUpdate(
      guildId,
      { $pull: { members: { user: userId } } }
    );
    
    // Remove guild from user's guilds
    await User.findByIdAndUpdate(
      userId,
      { $pull: { guilds: guildId } }
    );
    
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
