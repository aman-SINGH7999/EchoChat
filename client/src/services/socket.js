import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_REACT_APP_SOCKET_URL || 'http://localhost:5001';

let socket = null;

export const connectSocket = () => {
  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    connectSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const emitUserConnect = (userId) => {
  const socket = getSocket();
  socket.emit('user_connect', userId);
};

export const joinChat = (chatId) => {
  const socket = getSocket();
  socket.emit('join_chat', chatId);
};

export const leaveChat = (chatId) => {
  const socket = getSocket();
  socket.emit('leave_chat', chatId);
};

export const sendMessage = (chatId, messageData) => {
  const socket = getSocket();
  socket.emit('send_message', { chatId, ...messageData });
};

export const notifyTyping = (chatId, userId, username) => {
  const socket = getSocket();
  socket.emit('notify_typing', { chatId, userId, username });
};

export const notifyStopTyping = (chatId, userId) => {
  const socket = getSocket();
  socket.emit('stop_typing', { chatId, userId });
};

export const markMessageAsRead = (chatId, messageId, userId) => {
  const socket = getSocket();
  socket.emit('message_read', { chatId, messageId, userId });
};

export const onUserOnline = (callback) => {
  const socket = getSocket();
  socket.on('user_online', callback);
};

export const onUserOffline = (callback) => {
  const socket = getSocket();
  socket.on('user_offline', callback);
};

export const onReceiveMessage = (callback) => {
  const socket = getSocket();
  socket.on('receive_message', callback);
};

export const onUserTyping = (callback) => {
  const socket = getSocket();
  socket.on('user_typing', callback);
};

export const onUserStopTyping = (callback) => {
  const socket = getSocket();
  socket.on('user_stop_typing', callback);
};

export const onMessageReadReceipt = (callback) => {
  const socket = getSocket();
  socket.on('message_read_receipt', callback);
};

export const offReceiveMessage = (callback) => {
  const socket = getSocket();
  socket.off('receive_message', callback);
};

export const onNewChat = (callback) => {
  const socket = getSocket();
  socket.on('new_chat', callback);
};

export const offNewChat = (callback) => {
  const socket = getSocket();
  socket.off('new_chat', callback);
};