import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, CircularProgress, TextField, InputAdornment, IconButton,
  Avatar, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Typography
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Person as PersonIcon, Logout as LogoutIcon } from '@mui/icons-material';

import { setChats, setSelectedChat, addMessage, updateChatPreview, addChat } from '../redux/slices/chatSlice';
import { logout } from '../redux/slices/authSlice';
import { chatAPI, userAPI, authAPI } from '../services/api';
import { joinChat, leaveChat, onReceiveMessage, offReceiveMessage, onNewChat, offNewChat, disconnectSocket } from '../services/socket';

import ChatSidebar from '../components/ChatSidebar';
import ChatWindow from '../components/ChatWindow';
import CreateGroupModal from '../components/CreateGroupModal';
import SearchUsersModal from '../components/SearchUsersModal';

function ChatPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { chats, selectedChat, messages, loading } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [openGroupModal, setOpenGroupModal] = useState(false);
  const [openSearchModal, setOpenSearchModal] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

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
      dispatch(addChat(chat));   
      joinChat(chat.id);          
    };

    onNewChat(handleNewChat);

    return () => {
      offNewChat(handleNewChat);
    };
  }, [dispatch]);   


  useEffect(() => {
    const handleReceiveMessage = (data) => {

       if (!user) return;
      // sender_id se khud ka message skip karo
      if (data.sender_id === user.id) return;

      if (selectedChat && data.chat_id === selectedChat.id) {
        dispatch(addMessage(data));
      }
      dispatch(updateChatPreview(data)); 
    };

    onReceiveMessage(handleReceiveMessage);

    return () => {
      offReceiveMessage(handleReceiveMessage); 
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

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleGoToProfile = () => {
    handleMenuClose();
    navigate('/profile');
  };

  const handleLogout = async () => {
    handleMenuClose();
    try {
      await authAPI.logout();       
    } catch (error) {
      console.error('Logout API error:', error);
    }
    disconnectSocket();             // socket bhi cleanly disconnect karo
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f5f5f5' }}>
      <Box sx={{ width: '35%', bgcolor: 'white', borderRight: '1px solid #ddd', overflowY: 'auto' }}>
        {/* Header */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #ddd' }}>
          <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
            <Avatar src={user?.userprofile} alt={user?.username}>
              {user?.username?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 500 }} noWrap>
            {user?.username}
          </Typography>

          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem onClick={handleGoToProfile}>
              <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Profile</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Box>

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
