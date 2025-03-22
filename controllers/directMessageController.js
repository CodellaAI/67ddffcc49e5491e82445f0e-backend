
const User = require('../models/User');
const Message = require('../models/Message');
const DirectMessage = require('../models/DirectMessage');

// Get all direct message conversations
exports.getDirectMessages = async (req, res) => {
  try {
    // Find all direct message conversations where the user is a participant
    const directMessages = await DirectMessage.find({
      participants: req.user.id
    })
    .populate('participants', 'username avatar discriminator status')
    .sort({ updatedAt: -1 });
    
    // For each conversation, get the last message
    const conversationsWithLastMessage = await Promise.all(
      directMessages.map(async (dm) => {
        const lastMessage = await Message.findOne({
          $or: [
            { sender: req.user.id, recipient: { $in: dm.participants } },
            { recipient: req.user.id, sender: { $in: dm.participants } }
          ]
        })
        .sort({ createdAt: -1 })
        .populate('sender', 'username avatar discriminator')
        .populate('recipient', 'username avatar discriminator');
        
        return {
          ...dm.toObject(),
          lastMessage
        };
      })
    );
    
    res.json(conversationsWithLastMessage);
  } catch (error) {
    console.error('Get direct messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get messages between two users
exports.getMessagesBetweenUsers = async (req, res) => {
  try {
    const { dmId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before;
    
    // Find the direct message conversation
    const dm = await DirectMessage.findById(dmId);
    if (!dm) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    // Check if the current user is a participant
    if (!dm.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to view these messages' });
    }
    
    // Get the other participant
    const otherUserId = dm.participants.find(id => id.toString() !== req.user.id);
    
    // Build query
    const query = {
      $or: [
        { sender: req.user.id, recipient: otherUserId },
        { sender: otherUserId, recipient: req.user.id }
      ]
    };
    
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'username avatar discriminator status')
      .populate('recipient', 'username avatar discriminator status');
    
    res.json(messages.reverse());
  } catch (error) {
    console.error('Get messages between users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send a direct message
exports.sendDirectMessage = async (req, res) => {
  try {
    const { content, recipientId } = req.body;
    
    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
    
    // Create message
    const message = new Message({
      content,
      sender: req.user.id,
      recipient: recipientId
    });
    
    await message.save();
    
    // Find or create direct message conversation
    let directMessage = await DirectMessage.findOne({
      participants: { $all: [req.user.id, recipientId] }
    });
    
    if (!directMessage) {
      directMessage = new DirectMessage({
        participants: [req.user.id, recipientId],
        messages: [message._id]
      });
    } else {
      directMessage.messages.push(message._id);
      directMessage.updatedAt = Date.now();
    }
    
    await directMessage.save();
    
    // Populate message data for response
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar discriminator status')
      .populate('recipient', 'username avatar discriminator status');
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`user:${recipientId}`).emit('directMessage', populatedMessage);
    io.to(`user:${req.user.id}`).emit('directMessage', populatedMessage);
    
    res.status(201).json({
      message: populatedMessage,
      conversationId: directMessage._id
    });
  } catch (error) {
    console.error('Send direct message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a direct message
exports.deleteDirectMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user is the sender
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }
    
    // Delete the message
    await Message.findByIdAndDelete(messageId);
    
    // Update the direct message conversation
    await DirectMessage.updateOne(
      { messages: messageId },
      { $pull: { messages: messageId } }
    );
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`user:${message.recipient}`).emit('directMessageDeleted', {
      messageId,
      senderId: req.user.id
    });
    
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete direct message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
