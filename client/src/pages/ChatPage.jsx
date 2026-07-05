import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Grid, CircularProgress, TextField, InputAdornment, IconButton,
  Avatar, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Typography
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Person as PersonIcon, Logout as LogoutIcon } from '@mui/icons-material';

import { setChats, setSelectedChat, addMessage, updateChatPreview, addChat, markMessagesAsRead } from '../redux/slices/chatSlice';
import { logout } from '../redux/slices/authSlice';
import { chatAPI, userAPI, authAPI } from '../services/api';
import { joinChat, leaveChat, onReceiveMessage, offReceiveMessage, onNewChat, offNewChat, disconnectSocket, onMessagesRead, offMessagesRead } from '../services/socket';



import ChatSidebar from '../components/ChatSidebar';
import ChatWindow from '../components/ChatWindow';
import CreateGroupModal from '../components/CreateGroupModal';
import SearchUsersModal from '../components/SearchUsersModal';

function ChatPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { chatId } = useParams(); 
  const { chats, selectedChat, messages, loading } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [openGroupModal, setOpenGroupModal] = useState(false);
  const [openSearchModal, setOpenSearchModal] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const selectedChatRef = useRef(selectedChat);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    loadChats();
  }, []);

  // NAYA — jab chats load ho jaayen (ya URL badle), URL wale chatId ko select karo
  useEffect(() => {
    if (!chatId) return;                              // URL me chatId nahi hai to kuch mat karo
    if (selectedChat?.id === parseInt(chatId)) return; // already sahi chat selected hai

    const chatFromList = chats.find(c => c.id === parseInt(chatId));
    if (chatFromList) {
      dispatch(setSelectedChat(chatFromList));
    } else if (chats.length > 0) {
      // chats load ho gaye hain par ye chatId list me nahi mila — server se fetch karo
      chatAPI.getChat(chatId)
        .then(res => dispatch(setSelectedChat(res.data.chat)))
        .catch(err => {
          console.error('Chat not found:', err);
          navigate('/chats'); // invalid/inaccessible chatId — clean URL pe bhej do
        });
    }
  }, [chatId, chats]);

  // useEffect(() => {
  //   if (selectedChat && !selectedChat.isTemp) {
  //     joinChat(selectedChat.id);
  //     return () => leaveChat(selectedChat.id);
  //   }
  // }, [selectedChat]);

  useEffect(() => {
    if (selectedChat && !selectedChat.isTemp) {
      joinChat(selectedChat.id);
      return () => leaveChat(selectedChat.id);
    }
  }, [selectedChat?.id, selectedChat?.isTemp]);

  useEffect(() => {
    const handleMessagesRead = ({ readerId, messageIds, chatId }) => {
      if (readerId === user.id) return;
      // FIX — ref.current se hamesha LATEST selectedChat milega, stale closure nahi
      if (selectedChatRef.current?.id !== chatId) return;
      dispatch(markMessagesAsRead({ messageIds }));
    };

    onMessagesRead(handleMessagesRead);
    return () => offMessagesRead(handleMessagesRead);
  }, [dispatch, user?.id]);


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
      if (data.sender_id === user.id) return;

      if (selectedChat && data.chat_id === selectedChat.id) {
        dispatch(addMessage(data));
        chatAPI.markMessagesRead(selectedChat.id).catch(() => {}); // NAYA — chat open hai to turant read
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
    navigate(`/chats/${chat.id}`);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setOpenSearchModal(true);
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


  // UPDATE — search se existing chat select ho to URL me daalo; naya (temp) chat ho to /chats pe hi raho
  const handleSelectSearchedUser = (selectedUser) => {
    const existingChat = chats.find(chat =>
      chat.chat_type === 'private' &&
      chat.members?.some(m => m.user_id === selectedUser.id)
    );

    if (existingChat) {
      dispatch(setSelectedChat(existingChat));
      navigate(`/chats/${existingChat.id}`);   // NAYA
    } else {
      const tempChat = {
        id: null,
        isTemp: true,
        chat_type: 'private',
        chat_name: null,
        room_image: null,
        members: [
          { user_id: user.id, user },
          { user_id: selectedUser.id, user: selectedUser }
        ],
        messages: []
      };
      dispatch(setSelectedChat(tempChat));
      navigate('/chats');   // temp chat ke liye koi id nahi, plain /chats
    }

    setOpenSearchModal(false);
    setSearchQuery('');
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
        onSelectUser={handleSelectSearchedUser}
      />
    </Box>
  );
}

export default ChatPage;
