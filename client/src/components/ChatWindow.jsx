import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Avatar,
  CircularProgress,
  IconButton,
  InputAdornment,
  AppBar,
  Toolbar,
  Badge
} from '@mui/material';
import { Send as SendIcon, AttachFile as AttachFileIcon } from '@mui/icons-material';
import moment from 'moment';

import { setMessages, addMessage, setLoading, updateChatPreview } from '../redux/slices/chatSlice';
import { chatAPI } from '../services/api';
import { notifyTyping, notifyStopTyping, sendMessage as emitSocketMessage } from '../services/socket';

import MessageBubble from './MessageBubble';

function ChatWindow({ chat }) {
  const dispatch = useDispatch();
  const { messages, loading } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (chat?.id) {
      loadMessages();
    }
  }, [chat?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    dispatch(setLoading(true));
    try {
      const response = await chatAPI.getMessages(chat.id);
      dispatch(setMessages(response.data.messages.reverse()));
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    try {
      const response = await chatAPI.sendMessage(chat.id, {
        message_text: messageText,
        message_type: 'text'
      });
      dispatch(addMessage(response.data.data));
      dispatch(updateChatPreview(response.data.data)); 
      // YE LINE MISSING THI — socket ko batao
      emitSocketMessage(chat.id, response.data.data);

      setMessageText('');
      notifyStopTyping(chat.id, user.id);
      setIsTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleInputChange = (e) => {
    setMessageText(e.target.value);

    // Notify typing
    if (!isTyping) {
      notifyTyping(chat.id, user.id, user.username);
      setIsTyping(true);
    }

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      notifyStopTyping(chat.id, user.id);
      setIsTyping(false);
    }, 1000);
  };

  const getChatName = () => {
    if (chat.chat_type === 'group') {
      return chat.chat_name;
    }
    return chat.members && chat.members.find(m => m.user_id !== user.id)?.user?.username;
  };

  const getChatAvatar = () => {
    if (chat.chat_type === 'group') {
      return chat.room_image;
    }
    return chat.members && chat.members.find(m => m.user_id !== user.id)?.user?.userprofile;
  };

  const getOnlineStatus = () => {
    if (chat.chat_type === 'group') {
      return null;
    }
    return chat.members && chat.members.find(m => m.user_id !== user.id)?.user?.isOnline;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            variant="dot"
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: getOnlineStatus() ? '#44b700' : '#bdbdbd'
              }
            }}
          >
            <Avatar src={getChatAvatar()} alt={getChatName()}>
              {getChatName()?.charAt(0).toUpperCase()}
            </Avatar>
          </Badge>
          <Typography variant="h6" sx={{ ml: 2, flex: 1 }}>
            {getChatName()}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {getOnlineStatus() ? 'Online' : 'Offline'}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          bgcolor: '#fafafa'
        }}
      >
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : messages && messages.length > 0 ? (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === user.id}
            />
          ))
        ) : (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="400px"
            color="#999"
          >
            No messages yet. Start the conversation!
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Paper sx={{ p: 2, borderTop: '1px solid #ddd' }}>
        <form onSubmit={handleSendMessage}>
          <Box display="flex" gap={1}>
            <TextField
              fullWidth
              placeholder="Type a message..."
              value={messageText}
              onChange={handleInputChange}
              size="small"
              multiline
              maxRows={3}
            />
            <IconButton color="primary">
              <AttachFileIcon />
            </IconButton>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={!messageText.trim()}
            >
              <SendIcon />
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

export default ChatWindow;
