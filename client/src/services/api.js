import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  resetPassword: (data) => api.post('/auth/reset-password', data)
};

// User endpoints
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadProfilePicture: (formData) => api.post('/users/profile/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  searchUsers: (query) => api.get('/users/search', { params: { query } }),
  getUserById: (userId) => api.get(`/users/${userId}`)
};

// Chat endpoints
export const chatAPI = {
  createPrivateChat: (otherUserId) => api.post('/chats/private-chat', { otherUserId }),
  createGroupChat: (data) => api.post('/chats/group-chat', data),
  sendMessageUnified: (data) => api.post('/chats/messages', data),
  getChats: () => api.get('/chats'),
  getChat: (chatId) => api.get(`/chats/${chatId}`),
  getMessages: (chatId, params = {}) => api.get(`/chats/${chatId}/messages`, { params }),
  sendMessage: (chatId, data) => api.post(`/chats/${chatId}/messages`, data),
  markMessagesRead: (chatId) => api.put(`/chats/${chatId}/messages/read`)
};

// Group endpoints
export const groupAPI = {
  updateGroupImage: (chatId, formData) => api.put(`/groups/${chatId}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  addMembers: (chatId, memberIds) => api.post(`/groups/${chatId}/members`, { memberIds }),
  promoteToAdmin: (chatId, memberId) => api.put(`/groups/${chatId}/members/${memberId}/promote`),
  deactivateMember: (chatId, memberId) => api.put(`/groups/${chatId}/members/${memberId}/deactivate`),
  reactivateMember: (chatId, memberId) => api.put(`/groups/${chatId}/members/${memberId}/reactivate`)
};

export const messageAPI = {
  editMessage: (messageId, message_text) => api.put(`/messages/${messageId}`, { message_text }),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
  getMessageHistory: (messageId) => api.get(`/messages/${messageId}/history`),
  toggleReaction: (messageId, emoji) => api.post(`/messages/${messageId}/reactions`, { emoji })
};

export const fileAPI = {
  upload: (formData, onUploadProgress) => api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress
  })
};



export default api;
