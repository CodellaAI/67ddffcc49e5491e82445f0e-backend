
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const authRoutes = require('./routes/auth');
const guildRoutes = require('./routes/guilds');
const channelRoutes = require('./routes/channels');
const messageRoutes = require('./routes/messages');
const inviteRoutes = require('./routes/invites');
const friendRoutes = require('./routes/friends');
const directMessageRoutes = require('./routes/directMessages');
const { verifySocketToken } = require('./middleware/auth');
const { handleSocketConnection } = require('./socket/socketHandler');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(morgan('dev'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Socket.io middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    const user = verifySocketToken(token);
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.io connection handler
io.on('connection', (socket) => handleSocketConnection(io, socket));

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/guilds', guildRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/direct-messages', directMessageRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('Harmony Hub API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
