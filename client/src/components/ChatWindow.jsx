import React, { useState, useEffect, useRef, useLayoutEffect } from 'react'; 
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
import { Send as SendIcon, AttachFile as AttachFileIcon, Close as CloseIcon } from '@mui/icons-material';
import moment from 'moment';

import { chatAPI } from '../services/api';
import { setMessages, addMessage, setLoading, updateChatPreview, addChat, setSelectedChat, replaceMessage, markMessageFailed, updateMessage, updateChatPreviewOnEdit, prependOlderMessages, setHasMoreMessages, setLoadingMoreMessages } from '../redux/slices/chatSlice';
import { notifyTyping, notifyStopTyping, sendMessage as emitSocketMessage, joinChat, onMessageEdited, offMessageEdited, onMessageDeleted, offMessageDeleted } from '../services/socket';
import { onUserTyping, onUserStopTyping, offUserTyping, offUserStopTyping, onReactionUpdated, offReactionUpdated } from '../services/socket';



import MessageBubble from './MessageBubble';
import ChatDetailsPanel from './ChatDetailsPanel';
import AddMembersModal from './AddMembersModal';

function ChatWindow({ chat }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { messages, loading, hasMoreMessages, loadingMoreMessages } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingClearTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);   
  const prevScrollHeightRef = useRef(0);       
  const isPrependingRef = useRef(false);


  useEffect(() => {
    if (chat?.id) {
      dispatch(setHasMoreMessages(true));
      loadMessages();
    }else {
      dispatch(setMessages([])); 
    }
  }, [chat?.id]);


  useEffect(() => {
    if (!chat?.id) return;

    const handleUserTyping = ({ userId, username, chatId }) => {
      if (userId === user.id) return;        
      if (chatId !== chat.id) return;         
      setTypingUser(username);

      if (typingClearTimeoutRef.current) clearTimeout(typingClearTimeoutRef.current);
      typingClearTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
    };

    const handleUserStopTyping = ({ userId, chatId }) => {
      if (userId === user.id) return;
      if (chatId !== chat.id) return;
      setTypingUser(null);
      if (typingClearTimeoutRef.current) clearTimeout(typingClearTimeoutRef.current);
    };

    onUserTyping(handleUserTyping);
    onUserStopTyping(handleUserStopTyping);

    return () => {
      offUserTyping(handleUserTyping);
      offUserStopTyping(handleUserStopTyping);
      setTypingUser(null);
    };
  }, [chat?.id, user.id]);


  // edit use effect
  useEffect(() => {
    if (!chat?.id) return;

    const handleEdited = (updatedMsg) => {
      if (updatedMsg.chat_id === chat.id) {
        dispatch(updateMessage(updatedMsg));
        dispatch(updateChatPreviewOnEdit(updatedMsg));
      }
    };

    const handleDeleted = ({ messageId, chatId }) => {
      if (chatId === chat.id) {
        dispatch(updateMessage({ id: messageId, message_text: null, is_deleted: true }));
        dispatch(updateChatPreviewOnEdit({ id: messageId, message_text: null, is_deleted: true }));
      }
    };

    const handleReaction = ({ messageId, chatId, reactions }) => { // NAYA
      if (chatId === chat.id) {
        dispatch(updateMessage({ id: messageId, reactions }));
      }
    };

    onMessageEdited(handleEdited);
    onMessageDeleted(handleDeleted);
    onReactionUpdated(handleReaction);

    return () => {
      offMessageEdited(handleEdited);
      offMessageDeleted(handleDeleted);
      offReactionUpdated(handleReaction);
    };
  }, [chat?.id, dispatch]);

  // jab purane messages upar jud jaayein, scroll ko wahin rakho jahan user tha (jump na ho)
  useLayoutEffect(() => {
    if (isPrependingRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
    }
  }, [messages]);

  // Purana wala scrollToBottom effect — ab prepend ke case me skip karo
  useEffect(() => {
    if (isPrependingRef.current) {
      isPrependingRef.current = false;  // flag reset, agli baar ke liye
      return;                            // bottom scroll SKIP karo
    }
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // message status decide
  const computeStatus = (message, currentUserId) => {
    if (message.sender_id !== currentUserId) return undefined;
    const otherStatus = message.statuses?.find(s => s.user_id !== currentUserId);
    return otherStatus?.status === 'read' ? 'read' : 'sent';
  };

  const loadMessages = async () => {
    dispatch(setLoading(true));
    try {
      const response = await chatAPI.getMessages(chat.id, { limit: 30 }); 
      const withStatus = response.data.messages.reverse().map(m => ({
        ...m,
        status: computeStatus(m, user.id)
      }));
      dispatch(setMessages(withStatus));
      dispatch(setHasMoreMessages(response.data.hasMore)); 

      chatAPI.markMessagesRead(chat.id).catch(() => {});
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  // this is used to load older message
  const loadOlderMessages = async () => {
    if (!hasMoreMessages || loadingMoreMessages || messages.length === 0) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    dispatch(setLoadingMoreMessages(true));
    prevScrollHeightRef.current = container.scrollHeight; 
    isPrependingRef.current = true;

    try {
      const oldestId = messages[0].id; 
      const response = await chatAPI.getMessages(chat.id, { limit: 30, before: oldestId });

      const older = response.data.messages.reverse().map(m => ({
        ...m,
        status: computeStatus(m, user.id)
      }));

      dispatch(prependOlderMessages(older));
      dispatch(setHasMoreMessages(response.data.hasMore));
    } catch (error) {
      console.error('Error loading older messages:', error);
      isPrependingRef.current = false;
    } finally {
      dispatch(setLoadingMoreMessages(false));
    }
  };

  const handleScroll = (e) => {
    if (e.target.scrollTop < 80) {   
      loadOlderMessages();
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const textToSend = messageText;


    dispatch(addMessage({
      id: tempId,
      chat_id: chat.id,
      sender_id: user.id,
      sender: { id: user.id, username: user.username, userprofile: user.userprofile },
      message_text: textToSend,
      message_type: 'text',
      createdAt: new Date().toISOString(),
      status: 'pending',   
      reactions: []
    }));
    setMessageText('');

    try {
      let payload;
      if (chat.isTemp) {
        const otherMember = chat.members.find(m => m.user_id !== user.id);
        payload = { otherUserId: otherMember.user_id, message_text: textToSend, message_type: 'text', reply_to: replyingTo?.id || null };
      } else {
        payload = { chatId: chat.id, message_text: textToSend, message_type: 'text', reply_to: replyingTo?.id || null };
      }

      const response = chat.isTemp
        ? await chatAPI.sendMessageUnified(payload)
        : await chatAPI.sendMessage(chat.id, { message_text: textToSend, message_type: 'text', reply_to: replyingTo?.id || null });

      const newMessage = { ...response.data.data, status: 'sent' }; // SINGLE TICK

      if (chat.isTemp && response.data.chat) {
        dispatch(addChat(response.data.chat));
        dispatch(setSelectedChat(response.data.chat));
        joinChat(response.data.chat.id);
        navigate(`/chats/${response.data.chat.id}`, { replace: true });
      }

      const finalChatId = response.data.chat?.id || chat.id;

      dispatch(replaceMessage({ tempId, message: newMessage })); // pending -> sent
      dispatch(updateChatPreview(newMessage));
      emitSocketMessage(finalChatId, newMessage);

      notifyStopTyping(finalChatId, user.id);
      setIsTyping(false);
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch(markMessageFailed(tempId)); 
    }
  };

  const handleInputChange = (e) => {
    setMessageText(e.target.value);

    if (!chat?.id) return; 

    if (!isTyping) {
      notifyTyping(chat.id, user.id, user.username);
      setIsTyping(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

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
          <Box
            onClick={() => setDetailsOpen(true)} 
            sx={{ display: 'flex', alignItems: 'center', flex: 1, cursor: 'pointer' }}
          >
            {chat.chat_type === 'group' ? (
              <Avatar src={getChatAvatar()} alt={getChatName()}>
                {getChatName()?.charAt(0).toUpperCase()}
              </Avatar>
            ) : (
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
            )}
            <Typography variant="h6" sx={{ ml: 2, flex: 1 }}>
              {getChatName()}
            </Typography>
          </Box>
          <Typography variant="caption" color="textSecondary">
            {typingUser
              ? `${typingUser} is typing...`
              : chat.chat_type === 'group'
                ? ''                          
                : (getOnlineStatus() ? 'Online' : 'Offline')}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Messages */}
      <Box
        ref={messagesContainerRef}          
        onScroll={handleScroll} 
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
        {/* NAYA — top par chhota loader jab purane messages fetch ho rahe hon */}
        {loadingMoreMessages && (
          <Box display="flex" justifyContent="center" py={1}>
            <CircularProgress size={22} />
          </Box>
        )}

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
              onReply={setReplyingTo}
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


      {replyingTo && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f0f0f0', borderRadius: 1, p: 1, mb: 1 }}>
          <Box sx={{ borderLeft: '3px solid #2196F3', pl: 1 }}>
            <Typography variant="caption" fontWeight={600}>{replyingTo.sender?.username}</Typography>
            <Typography variant="body2" noWrap sx={{ maxWidth: 400 }}>{replyingTo.message_text}</Typography>
          </Box>
          <IconButton size="small" onClick={() => setReplyingTo(null)}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      )}
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

      <ChatDetailsPanel
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        chat={chat}
        currentUserId={user.id}
        onOpenAddMembers={() => setAddMembersOpen(true)}   
      />
      <AddMembersModal
        open={addMembersOpen}
        onClose={() => setAddMembersOpen(false)}
        chat={chat}
      />
    </Box>
  );
}

export default ChatWindow;
