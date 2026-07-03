import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Grid, CircularProgress, TextField, InputAdornment, IconButton } from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';

import { setChats, setSelectedChat, addMessage, updateChatPreview, addChat  } from '../redux/slices/chatSlice';
import { chatAPI, userAPI } from '../services/api';
import { joinChat, leaveChat, onReceiveMessage, offReceiveMessage, onNewChat, offNewChat } from '../services/socket';

import ChatSidebar from '../components/ChatSidebar';
import ChatWindow from '../components/ChatWindow';
import CreateGroupModal from '../components/CreateGroupModal';
import SearchUsersModal from '../components/SearchUsersModal';

function ChatPage() {
  const dispatch = useDispatch();
  const { chats, selectedChat, messages, loading } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [openGroupModal, setOpenGroupModal] = useState(false);
  const [openSearchModal, setOpenSearchModal] = useState(false);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      joinChat(selectedChat.id);
      return () => {
        leaveChat(selectedChat.id);
      };
    }
  }, [selectedChat]);


  useEffect(() => {
    const handleNewChat = (chat) => {
      dispatch(addChat(chat));   // dedupe ab reducer khud sambhal lega
      joinChat(chat.id);          // client-side bhi join karo, safety ke liye (server already kar chuka hoga)
    };

    onNewChat(handleNewChat);

    return () => {
      offNewChat(handleNewChat);
    };
  }, [dispatch]);   // ab sirf ek baar mount pe register hoga, koi churn nahi


  useEffect(() => {
    const handleReceiveMessage = (data) => {

       if (!user) return;
      // sender_id se khud ka message skip karo
      if (data.sender_id === user.id) return;

      if (selectedChat && data.chat_id === selectedChat.id) {
        dispatch(addMessage(data));
      }
      dispatch(updateChatPreview(data)); // sidebar bhi live update ho
    };

    onReceiveMessage(handleReceiveMessage);

    return () => {
      offReceiveMessage(handleReceiveMessage); // cleanup — warna leak
    };
  }, [selectedChat, dispatch, user?.id]);


  const loadChats = async () => {
    try {
      const response = await chatAPI.getChats();
      dispatch(setChats(response.data.chats));
      response.data.chats.forEach(chat => joinChat(chat.id));
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const handleSelectChat = async (chat) => {
    dispatch(setSelectedChat(chat));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setOpenSearchModal(true);
    }
  };

  const handleCreatePrivateChat = async (userId) => {
    try {
      const response = await chatAPI.createPrivateChat(userId);
      const newChat = response.data.chat;
      dispatch(setChats([newChat, ...chats]));
      dispatch(setSelectedChat(newChat));
      setOpenSearchModal(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f5f5f5' }}>
      <Box sx={{ width: '35%', bgcolor: 'white', borderRight: '1px solid #ddd', overflowY: 'auto' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid #ddd', display: 'flex', gap: 1 }}>
          <TextField
            placeholder="Search chats..."
            size="small"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            // onKeyPress={handleSearch}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleSearch}>
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <IconButton color="primary" onClick={() => setOpenGroupModal(true)}>
            <AddIcon />
          </IconButton>
        </Box>

        {/* Chats List */}
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : (
          <ChatSidebar
            chats={chats}
            selectedChat={selectedChat}
            onSelectChat={handleSelectChat}
            currentUserId={user?.id}
          />
        )}
      </Box>

      <Box sx={{ width: '65%', display: 'flex', flexDirection: 'column' }}>
        {selectedChat ? (
          <ChatWindow chat={selectedChat} />
        ) : (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            width="100%"
            height="100%"
            flexDirection="column"
            color="#999"
          >
            Select a chat to start messaging
          </Box>
        )}
      </Box>

      {/* Modals */}
      <CreateGroupModal open={openGroupModal} onClose={() => setOpenGroupModal(false)} />
      <SearchUsersModal
        open={openSearchModal}
        onClose={() => setOpenSearchModal(false)}
        query={searchQuery}
        onSelectUser={handleCreatePrivateChat}
      />
    </Box>
  );
}

export default ChatPage;
