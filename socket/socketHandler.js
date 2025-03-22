
const User = require('../models/User');

exports.handleSocketConnection = (io, socket) => {
  const userId = socket.user.id;
  
  console.log(`User connected: ${userId}`);
  
  // Join user's personal room
  socket.join(`user:${userId}`);
  
  // Update user status to online
  updateUserStatus(userId, 'online');
  
  // Join guild rooms
  joinUserGuilds(socket, userId);
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${userId}`);
    updateUserStatus(userId, 'offline');
  });
  
  // Handle typing indicators
  socket.on('typing', (data) => {
    if (data.channelId) {
      socket.to(`channel:${data.channelId}`).emit('typing', {
        userId,
        channelId: data.channelId,
        isTyping: data.isTyping
      });
    } else if (data.recipientId) {
      socket.to(`user:${data.recipientId}`).emit('typing', {
        userId,
        isTyping: data.isTyping
      });
    }
  });
  
  // Handle status updates
  socket.on('updateStatus', (status) => {
    updateUserStatus(userId, status);
  });
};

// Update user status in database
async function updateUserStatus(userId, status) {
  try {
    await User.findByIdAndUpdate(userId, { status });
  } catch (error) {
    console.error('Error updating user status:', error);
  }
}

// Join user to all their guild rooms
async function joinUserGuilds(socket, userId) {
  try {
    const user = await User.findById(userId).populate('guilds');
    
    if (user && user.guilds) {
      user.guilds.forEach(guild => {
        socket.join(`guild:${guild._id}`);
      });
    }
  } catch (error) {
    console.error('Error joining guild rooms:', error);
  }
}
