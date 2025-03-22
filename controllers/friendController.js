
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

// Get all friends and friend requests
exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'friends.user',
        select: 'username avatar discriminator status'
      });
    
    // Get pending friend requests
    const pendingRequests = await FriendRequest.find({
      $or: [
        { sender: req.user.id, status: 'pending' },
        { recipient: req.user.id, status: 'pending' }
      ]
    })
    .populate('sender', 'username avatar discriminator status')
    .populate('recipient', 'username avatar discriminator status');
    
    // Format requests to match friend structure
    const formattedRequests = pendingRequests.map(request => {
      const isSender = request.sender._id.toString() === req.user.id;
      return {
        _id: request._id,
        username: isSender ? request.recipient.username : request.sender.username,
        avatar: isSender ? request.recipient.avatar : request.sender.avatar,
        discriminator: isSender ? request.recipient.discriminator : request.sender.discriminator,
        status: isSender ? request.recipient.status : request.sender.status,
        sender: request.sender,
        recipient: request.recipient,
        status: 'pending'
      };
    });
    
    // Format accepted friends
    const acceptedFriends = user.friends
      .filter(friend => friend.status === 'accepted')
      .map(friend => ({
        ...friend.user.toObject(),
        status: 'accepted'
      }));
    
    // Combine both lists
    const allFriends = [...acceptedFriends, ...formattedRequests];
    
    res.json(allFriends);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send a friend request
exports.sendFriendRequest = async (req, res) => {
  try {
    const { username } = req.body;
    
    // Find the recipient by username
    const recipient = await User.findOne({ username });
    if (!recipient) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if recipient is the current user
    if (recipient._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot add yourself as a friend' });
    }
    
    // Check if a friend request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: req.user.id, recipient: recipient._id },
        { sender: recipient._id, recipient: req.user.id }
      ]
    });
    
    if (existingRequest) {
      return res.status(400).json({ message: 'A friend request already exists between you and this user' });
    }
    
    // Check if they are already friends
    const user = await User.findById(req.user.id);
    const alreadyFriends = user.friends.some(
      friend => friend.user.toString() === recipient._id.toString() && friend.status === 'accepted'
    );
    
    if (alreadyFriends) {
      return res.status(400).json({ message: 'You are already friends with this user' });
    }
    
    // Create friend request
    const friendRequest = new FriendRequest({
      sender: req.user.id,
      recipient: recipient._id
    });
    
    await friendRequest.save();
    
    // Notify recipient via socket
    const io = req.app.get('io');
    io.to(`user:${recipient._id}`).emit('friendRequest', {
      _id: friendRequest._id,
      sender: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        discriminator: user.discriminator
      }
    });
    
    res.status(201).json(friendRequest);
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Accept a friend request
exports.acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Find the friend request
    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    
    // Check if current user is the recipient
    if (friendRequest.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to accept this friend request' });
    }
    
    // Check if request is already accepted or rejected
    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ message: `Friend request is already ${friendRequest.status}` });
    }
    
    // Update friend request status
    friendRequest.status = 'accepted';
    await friendRequest.save();
    
    // Add each user to the other's friends list
    await User.findByIdAndUpdate(
      friendRequest.sender,
      { 
        $push: { 
          friends: { 
            user: friendRequest.recipient, 
            status: 'accepted' 
          } 
        } 
      }
    );
    
    await User.findByIdAndUpdate(
      friendRequest.recipient,
      { 
        $push: { 
          friends: { 
            user: friendRequest.sender, 
            status: 'accepted' 
          } 
        } 
      }
    );
    
    // Notify sender via socket
    const io = req.app.get('io');
    io.to(`user:${friendRequest.sender}`).emit('friendRequestAccepted', {
      requestId: friendRequest._id,
      userId: req.user.id
    });
    
    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject a friend request
exports.rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Find the friend request
    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    
    // Check if current user is the recipient
    if (friendRequest.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to reject this friend request' });
    }
    
    // Check if request is already accepted or rejected
    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ message: `Friend request is already ${friendRequest.status}` });
    }
    
    // Update friend request status
    friendRequest.status = 'rejected';
    await friendRequest.save();
    
    // Notify sender via socket
    const io = req.app.get('io');
    io.to(`user:${friendRequest.sender}`).emit('friendRequestRejected', {
      requestId: friendRequest._id,
      userId: req.user.id
    });
    
    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove a friend
exports.removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    
    // Check if friend exists
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove friend from current user's friends list
    await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { friends: { user: friendId } } }
    );
    
    // Remove current user from friend's friends list
    await User.findByIdAndUpdate(
      friendId,
      { $pull: { friends: { user: req.user.id } } }
    );
    
    // Notify friend via socket
    const io = req.app.get('io');
    io.to(`user:${friendId}`).emit('friendRemoved', {
      userId: req.user.id
    });
    
    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
