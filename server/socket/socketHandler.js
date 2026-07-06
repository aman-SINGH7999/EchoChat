const { User } = require('../models');

let onlineUsers = {};

const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User connects
    socket.on('user_connect', async (userId) => {
      onlineUsers[userId] = socket.id;
      
      const user = await User.findByPk(userId);
      if (user) {
        await user.update({ isOnline: true, lastSeen: new Date() });
      }

      // Broadcast user online status
      io.emit('user_online', { userId, isOnline: true });
    });

    // Join chat room
    socket.on('join_chat', (chatId) => {
      socket.join(`chat_${chatId}`);
      console.log(`Socket ${socket.id} joined chat_${chatId}`);
    });

    // Leave chat room
    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat_${chatId}`);
      console.log(`User left chat: ${chatId}`);
    });

    // Send message
    socket.on('send_message', (data) => {
      io.to(`chat_${data.chatId}`).emit('receive_message', data);
    });

    // Typing indicator
    socket.on('typing', (data) => {
      io.to(`chat_${data.chatId}`).emit('user_typing', {
        userId: data.userId,
        chatId: data.chatId,
        username: data.username
      });
    });

    // Stop typing
    socket.on('stop_typing', (data) => {
      io.to(`chat_${data.chatId}`).emit('user_stop_typing', {
        userId: data.userId,
        chatId: data.chatId
      });
    });

    // Read message
    socket.on('message_read', (data) => {
      console.log('Room members:', io.sockets.adapter.rooms.get(`chat_${data.chatId}`));
      io.to(`chat_${data.chatId}`).emit('message_read_receipt', {
        messageId: data.messageId,
        userId: data.userId
      });
    });

    // User disconnects
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      
      // Find user ID by socket ID
      const userId = Object.keys(onlineUsers).find(key => onlineUsers[key] === socket.id);
      if (userId) {
        if (onlineUsers[userId] === socket.id) {
          delete onlineUsers[userId];
        }
        
        const user = await User.findByPk(userId);
        if (user) {
          await user.update({ isOnline: false, lastSeen: new Date() });
        }

        io.emit('user_offline', { userId, isOnline: false });
      }
    });

    // Notify typing to others in chat
    socket.on('notify_typing', (data) => {
      socket.to(`chat_${data.chatId}`).emit('user_typing', {
        userId: data.userId,
        username: data.username,
        chatId: data.chatId
      });
    });

    // Update message status
    socket.on('update_message_status', (data) => {
      io.to(`chat_${data.chatId}`).emit('message_status_updated', data);
    });

    // User activity
    socket.on('user_activity', async (userId) => {
      const user = await User.findByPk(userId);
      if (user) {
        await user.update({ lastSeen: new Date() });
      }
    });
  });
};

const getOnlineUsers = () => {
  return onlineUsers;
};


const joinUserToRoom = (io, userId, chatId) => {
  const socketId = onlineUsers[userId];
  if (socketId) {
    const targetSocket = io.sockets.sockets.get(socketId);
    if (targetSocket) {
      targetSocket.join(`chat_${chatId}`);
      console.log(`Server force-joined user ${userId} to chat_${chatId}`);
    }
  }
};

module.exports = {
  initializeSocket,
  getOnlineUsers,
  joinUserToRoom
};
