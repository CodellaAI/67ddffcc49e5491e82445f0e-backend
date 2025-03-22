
const Channel = require('../models/Channel');
const Guild = require('../models/Guild');
const Message = require('../models/Message');

// Create a new channel
exports.createChannel = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { name, type, category } = req.body;
    
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
    
    // Create the channel
    const channel = new Channel({
      name,
      type: type || 'text',
      guild: guildId,
      category: category || (type === 'voice' ? 'Voice Channels' : 'Text Channels')
    });
    
    await channel.save();
    
    // Add channel to guild
    guild.channels.push(channel._id);
    await guild.save();
    
    res.status(201).json(channel);
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all channels for a guild
exports.getGuildChannels = async (req, res) => {
  try {
    const { guildId } = req.params;
    
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
    
    const channels = await Channel.find({ guild: guildId }).sort('position');
    
    res.json(channels);
  } catch (error) {
    console.error('Get guild channels error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a specific channel
exports.getChannel = async (req, res) => {
  try {
    const { guildId, channelId } = req.params;
    
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
    
    const channel = await Channel.findOne({
      _id: channelId,
      guild: guildId
    });
    
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    res.json(channel);
  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a channel
exports.updateChannel = async (req, res) => {
  try {
    const { guildId, channelId } = req.params;
    const { name, topic, category, position } = req.body;
    
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
    
    // Find the channel
    const channel = await Channel.findOne({
      _id: channelId,
      guild: guildId
    });
    
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    // Update channel
    const updateData = {};
    if (name) updateData.name = name;
    if (topic !== undefined) updateData.topic = topic;
    if (category) updateData.category = category;
    if (position !== undefined) updateData.position = position;
    
    const updatedChannel = await Channel.findByIdAndUpdate(
      channelId,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json(updatedChannel);
  } catch (error) {
    console.error('Update channel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a channel
exports.deleteChannel = async (req, res) => {
  try {
    const { guildId, channelId } = req.params;
    
    // Check if guild exists
    const guild = await Guild.findById(guildId);
    if (!guild) {
      return res.status(404).json({ message: 'Guild not found' });
    }
    
    // Check if user is the guild owner
    if (guild.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the guild owner can delete channels' });
    }
    
    // Find the channel
    const channel = await Channel.findOne({
      _id: channelId,
      guild: guildId
    });
    
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    // Delete all messages in the channel
    await Message.deleteMany({ channel: channelId });
    
    // Delete the channel
    await Channel.findByIdAndDelete(channelId);
    
    // Remove channel from guild
    await Guild.findByIdAndUpdate(
      guildId,
      { $pull: { channels: channelId } }
    );
    
    res.json({ message: 'Channel deleted successfully' });
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get messages for a channel
exports.getChannelMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before;
    
    // Find the channel
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    // Check if user is a member of the guild
    const guild = await Guild.findById(channel.guild);
    const isMember = guild.members.some(member => member.user.toString() === req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this guild' });
    }
    
    // Build query
    const query = { channel: channelId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'username avatar discriminator status')
      .populate('mentions', 'username avatar discriminator');
    
    res.json(messages.reverse());
  } catch (error) {
    console.error('Get channel messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send a message to a channel
exports.sendChannelMessage = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content, attachments } = req.body;
    
    // Find the channel
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    // Check if user is a member of the guild
    const guild = await Guild.findById(channel.guild);
    const isMember = guild.members.some(member => member.user.toString() === req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this guild' });
    }
    
    // Create message
    const message = new Message({
      content,
      sender: req.user.id,
      channel: channelId,
      attachments: attachments || []
    });
    
    await message.save();
    
    // Populate message data for response
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar discriminator status')
      .populate('mentions', 'username avatar discriminator');
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`guild:${channel.guild}`).emit('message', populatedMessage);
    
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Send channel message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
