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
import { Send as SendIcon, AttachFile as AttachFileIcon, Close as CloseIcon, TextFormat as RichToggleIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import moment from 'moment';

import { chatAPI, fileAPI } from '../services/api';
import { setMessages, addMessage, setLoading, updateChatPreview, addChat, setSelectedChat, replaceMessage, markMessageFailed, updateMessage, updateChatPreviewOnEdit, prependOlderMessages, setHasMoreMessages, setLoadingMoreMessages } from '../redux/slices/chatSlice';
import { notifyTyping, notifyStopTyping, sendMessage as emitSocketMessage, joinChat, onMessageEdited, offMessageEdited, onMessageDeleted, offMessageDeleted } from '../services/socket';
import { onUserTyping, onUserStopTyping, offUserTyping, offUserStopTyping, onReactionUpdated, offReactionUpdated } from '../services/socket';

import RichTextEditor from './RichTextEditor';                        
import { isHtmlEmpty, stripHtml } from '../utils/richText';  
import FileViewerModal from './FileViewerModal';


import MessageBubble from './MessageBubble';
import ChatDetailsPanel from './ChatDetailsPanel';
import AddMembersModal from './AddMembersModal';

function ChatWindow({ chat, onBack }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { messages, loading, hasMoreMessages, loadingMoreMessages } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);

  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [content, setContent] = useState('');         
  const [showToolbar, setShowToolbar] = useState(false); 
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);       
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState('');

  const editorRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingClearTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);   
  const prevScrollHeightRef = useRef(0);       
  const isPrependingRef = useRef(false);

  const canSend = !isHtmlEmpty(content);

  useEffect(() => {
    if (chat?.id) {
      dispatch(setHasMoreMessages(true));
      loadMessages();
    }else {
      dispatch(setMessages([])); 
    }

    setContent('');
    if (editorRef.current) {
      editorRef.current.clear();
    }
    setReplyingTo(null);
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

  const handleFileSelected = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';   
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPendingFile(file);
    setPendingPreviewUrl(previewUrl);
  };

  // Preview modal ka 
  const handleConfirmSendFile = async () => {
    if (!pendingFile) return;
    const file = pendingFile;

    setUploadingFile(true);
    const tempId = `temp-${Date.now()}`;

    let localType = 'file';
    if (file.type.startsWith('image/')) localType = 'image';
    else if (file.type.startsWith('video/')) localType = 'video';
    else if (file.type.startsWith('audio/')) localType = 'audio';

    dispatch(addMessage({
      id: tempId,
      chat_id: chat.id,
      sender_id: user.id,
      sender: { id: user.id, username: user.username, userprofile: user.userprofile },
      message_text: null,
      message_type: localType,
      file: { file_url: pendingPreviewUrl, file_name: file.name, file_type: file.type },
      createdAt: new Date().toISOString(),
      status: 'pending',
      reactions: []
    }));

    // modal close, state clear 
    setPendingFile(null);
    const urlToRevokeLater = pendingPreviewUrl;
    setPendingPreviewUrl('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fileAPI.upload(formData);
      const { file: uploadedFile, message_type } = uploadRes.data;

      let payload;
      if (chat.isTemp) {
        const otherMember = chat.members.find(m => m.user_id !== user.id);
        payload = { otherUserId: otherMember.user_id, message_text: null, message_type, file_id: uploadedFile.id, reply_to: replyingTo?.id || null };
      } else {
        payload = { chatId: chat.id, message_text: null, message_type, file_id: uploadedFile.id, reply_to: replyingTo?.id || null };
      }

      const response = chat.isTemp
        ? await chatAPI.sendMessageUnified(payload)
        : await chatAPI.sendMessage(chat.id, { message_text: null, message_type, file_id: uploadedFile.id, reply_to: replyingTo?.id || null });

      const newMessage = { ...response.data.data, status: 'sent' };

      if (chat.isTemp && response.data.chat) {
        dispatch(addChat(response.data.chat));
        dispatch(setSelectedChat(response.data.chat));
        joinChat(response.data.chat.id);
        navigate(`/chats/${response.data.chat.id}`, { replace: true });
      }

      const finalChatId = response.data.chat?.id || chat.id;

      dispatch(replaceMessage({ tempId, message: newMessage }));
      dispatch(updateChatPreview(newMessage));
      emitSocketMessage(finalChatId, newMessage);
      setReplyingTo(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      dispatch(markMessageFailed(tempId));
    } finally {
      setUploadingFile(false);
      URL.revokeObjectURL(urlToRevokeLater);
    }
  };

  // Preview modal close
  const handleCancelFilePreview = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl('');
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
    if (!canSend) return;

    const tempId = `temp-${Date.now()}`;
    const textToSend = content;


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

    setContent('');
    editorRef.current?.clear();

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

  const handleContentChange = (html) => {
    setContent(html);
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
          {onBack && (
            <IconButton onClick={onBack} sx={{ mr: 1 }} edge="start">
              <ArrowBackIcon />
            </IconButton>
          )}
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
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>  

        {/* background logo layer */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/logo.png)',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundSize: 'contain',
            opacity: 0.05,
            pointerEvents: 'none',   
            zIndex: 0
          }}
        />

        <Box
          ref={messagesContainerRef}
          onScroll={handleScroll}
          sx={{
            position: 'absolute',   
            inset: 0,
            overflowY: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            bgcolor: 'transparent',   
            zIndex: 1                 
          }}
        >
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
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px" color="#999">
              No messages yet. Start the conversation!
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>
      </Box>


      {replyingTo && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f0f0f0', borderRadius: 1, p: 1, mb: 1 }}>
          <Box sx={{ borderLeft: '3px solid #2196F3', pl: 1 }}>
            <Typography variant="caption" fontWeight={600}>{replyingTo.sender?.username}</Typography>
            <Typography variant="body2" noWrap sx={{ maxWidth: 400 }}>{stripHtml(replyingTo.message_text)}</Typography>
          </Box>
          <IconButton size="small" onClick={() => setReplyingTo(null)}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      )}
      {/* Input — rich editor, toolbar toggle */}
      <Paper sx={{ p: 2, borderTop: '1px solid #ddd' }}>
        <Box display="flex" gap={1} alignItems="flex-end">
          <IconButton onClick={() => setShowToolbar(prev => !prev)} title="Formatting options">
            <RichToggleIcon color={showToolbar ? 'primary' : 'inherit'} />
          </IconButton>

          <Box sx={{ flex: 1 }}>
            <RichTextEditor
              ref={editorRef}
              content={content}
              onChange={handleContentChange}
              onSubmit={handleSendMessage}
              showToolbar={showToolbar}
              placeholder="Type a message..."
            />
          </Box>

          {/* NAYA — label pattern */}
          <label htmlFor="chat-file-input">
            <input
              id="chat-file-input"
              type="file"
              hidden
              onChange={handleFileSelected}
            />
            <IconButton
              color="primary"
              component="span"      
              disabled={uploadingFile}
            >
              {uploadingFile ? <CircularProgress size={20} /> : <AttachFileIcon />}
            </IconButton>
          </label>

          <Button variant="contained" color="primary" onClick={handleSendMessage} disabled={!canSend}>
            <SendIcon />
          </Button>
        </Box>
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

      <FileViewerModal
        open={!!pendingFile}
        onClose={handleCancelFilePreview}
        fileUrl={pendingPreviewUrl}
        fileName={pendingFile?.name}
        fileType={pendingFile?.type}
        mode="preview"
        onSend={handleConfirmSendFile}
        sending={uploadingFile}
      />
    </Box>
  );
}

export default ChatWindow;
