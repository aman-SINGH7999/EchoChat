import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  chats: [],
  selectedChat: null,
  messages: [],
  loading: false,
  error: null,
  onlineUsers: []
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setChats: (state, action) => {
      state.chats = action.payload;
    },
    addChat: (state, action) => {
      const chat = action.payload;
      const exists = state.chats.some(c => c.id === chat.id);
      if (!exists) {
        state.chats.unshift(chat);
      }
    },
    setSelectedChat: (state, action) => {
      const newChat = action.payload;
      // sirf tab clear karo jab genuinely alag chat select ho
      if (!newChat || !state.selectedChat || state.selectedChat.id !== newChat.id) {
        state.messages = [];
      }
      state.selectedChat = newChat;
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    prependMessage: (state, action) => {
      state.messages.unshift(action.payload);
    },
    updateMessage: (state, action) => {
      const index = state.messages.findIndex(msg => msg.id === action.payload.id);
      if (index !== -1) {
        state.messages[index] = { ...state.messages[index], ...action.payload };
      }
    },
    deleteMessage: (state, action) => {
      state.messages = state.messages.filter(msg => msg.id !== action.payload);
    },
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    addOnlineUser: (state, action) => {
      if (!state.onlineUsers.includes(action.payload)) {
        state.onlineUsers.push(action.payload);
      }
    },
    removeOnlineUser: (state, action) => {
      state.onlineUsers = state.onlineUsers.filter(id => id !== action.payload);
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateChatPreview: (state, action) => {
      const msg = action.payload;
      const idx = state.chats.findIndex(c => c.id === msg.chat_id);
      if (idx !== -1) {
        const [chat] = state.chats.splice(idx, 1);
        chat.messages = [msg];
        state.chats.unshift(chat);
      }
    },
    replaceMessage: (state, action) => {
      const { tempId, message } = action.payload;
      const index = state.messages.findIndex(m => m.id === tempId);
      if (index !== -1) {
        state.messages[index] = message;
      } else {
        state.messages.push(message);
      }
    },
    markMessagesAsRead: (state, action) => {
      const { messageIds } = action.payload;
      state.messages.forEach(m => {
        if (messageIds.includes(m.id)) {
          m.status = 'read';
        }
      });
    },
    markMessageFailed: (state, action) => {
      const index = state.messages.findIndex(m => m.id === action.payload);
      if (index !== -1) {
        state.messages[index].status = 'failed';
      }
    },
    replaceChat: (state, action) => {
      const updated = action.payload;
      const idx = state.chats.findIndex(c => c.id === updated.id);
      if (idx !== -1) state.chats[idx] = { ...state.chats[idx], ...updated };
      if (state.selectedChat?.id === updated.id) {
        state.selectedChat = { ...state.selectedChat, ...updated };
      }
    }

  }
});

export const {
  setChats,
  addChat,
  setSelectedChat,
  setMessages,
  addMessage,
  prependMessage,
  updateMessage,
  deleteMessage,
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser,
  setLoading,
  setError,
  clearError,
  updateChatPreview,
  replaceMessage, 
  markMessagesAsRead, 
  markMessageFailed,
  replaceChat
} = chatSlice.actions;

export default chatSlice.reducer;
