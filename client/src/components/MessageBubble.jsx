import React, { useState } from 'react';
import {
  Box, Paper, Typography, Avatar, Menu, MenuItem, IconButton, TextField,
  Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, Divider
} from '@mui/material';
import {
  MoreVert as MoreVertIcon, AccessTime as PendingIcon, Done as SentIcon,
  DoneAll as ReadIcon, Edit as EditIcon, Check as CheckIcon, Close as CloseIcon
} from '@mui/icons-material';
import { Popover } from '@mui/material';
import { EmojiEmotions as EmojiIcon } from '@mui/icons-material';
import moment from 'moment';
import { useDispatch } from 'react-redux';
import { messageAPI } from '../services/api';
import { updateMessage, updateChatPreviewOnEdit } from '../redux/slices/chatSlice';




const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function MessageBubble({ message, isOwn, onReply }) {
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.message_text || '');
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [reactionAnchor, setReactionAnchor] = useState(null);

  const open = Boolean(anchorEl);
  const isDeleted = message.is_deleted || !!message.deleted_at;

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleCopy = () => {
    if (message.message_text) navigator.clipboard.writeText(message.message_text);
    handleMenuClose();
  };

  const startEdit = () => {
    setEditText(message.message_text || '');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditText(message.message_text || '');
  };

  const handlePickReaction = async (emoji) => {
    setReactionAnchor(null);
    try {
      const res = await messageAPI.toggleReaction(message.id, emoji);
      dispatch(updateMessage({ id: message.id, reactions: res.data.reactions }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to react');
    }
  };

  const saveEdit = async () => {
    if (!editText.trim() || editText.trim() === message.message_text) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await messageAPI.editMessage(message.id, editText.trim());
      dispatch(updateMessage(res.data.data));
      dispatch(updateChatPreviewOnEdit(res.data.data));
      setIsEditing(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to edit message');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    handleMenuClose();
    if (!window.confirm('Delete this message?')) return;
    try {
      await messageAPI.deleteMessage(message.id);
      dispatch(updateMessage({ id: message.id, message_text: null, is_deleted: true }));
      dispatch(updateChatPreviewOnEdit({ id: message.id, message_text: null, is_deleted: true }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete message');
    }
  };

  const handleViewHistory = async () => {
    handleMenuClose();
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await messageAPI.getMessageHistory(message.id);
      setHistory(res.data.history);
    } catch (err) {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        mb: 1,
        alignItems: 'flex-end',
        '&:hover .message-menu': { opacity: isEditing ? 0 : 1 } // NAYA — poore row par hover se icons dikhenge
      }}
    >
      {!isOwn && (
        <Avatar src={message.sender?.userprofile} alt={message.sender?.username} sx={{ mr: 1, width: 32, height: 32 }}>
          {message.sender?.username?.charAt(0).toUpperCase()}
        </Avatar>
      )}

      {/* NAYA — sirf apne, non-deleted, text messages par pencil icon */}
      {isOwn && !isDeleted && !isEditing && message.message_type === 'text' && (
        <Box className="message-menu" sx={{ mr: 0.5, opacity: 0, transition: 'opacity 0.2s', alignSelf: 'center' }}>
          <IconButton size="small" onClick={startEdit} sx={{ p: 0.5 }}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      <Paper
        sx={{
          p: 1.5,
          maxWidth: '60%',
          minWidth: isEditing ? 260 : 'auto',
          bgcolor: isDeleted ? '#f0f0f0' : (isOwn ? '#2196F3' : '#e0e0e0'),
          color: isDeleted ? 'text.secondary' : (isOwn ? 'white' : 'black'),
          borderRadius: 2,
          wordWrap: 'break-word',
          position: 'relative',
          fontStyle: isDeleted ? 'italic' : 'normal'
        }}
      >
        {!isOwn && !isDeleted && (
          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
            {message.sender?.username}
          </Typography>
        )}

        {!isDeleted && message.repliedMessage && (
          <Box
            sx={{
              borderLeft: '3px solid', borderColor: isOwn ? 'rgba(255,255,255,0.7)' : '#2196F3',
              bgcolor: isOwn ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
              borderRadius: 1, p: 0.7, mb: 0.7
            }}
          >
            <Typography variant="caption" fontWeight={600} sx={{ display: 'block' }}>
              {message.repliedMessage.sender?.username}
            </Typography>
            <Typography variant="caption" noWrap sx={{ display: 'block', opacity: 0.85 }}>
              {message.repliedMessage.deleted_at ? '🚫 Original message deleted' : message.repliedMessage.message_text}
            </Typography>
          </Box>
        )}

        {isDeleted ? (
          <Typography variant="body2">🚫 This message was deleted</Typography>
        ) : isEditing ? (
          <Box>
            <TextField
              fullWidth
              multiline
              size="small"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
              sx={{ bgcolor: 'white', borderRadius: 1 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                if (e.key === 'Escape') cancelEdit();
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 0.5 }}>
              <IconButton size="small" onClick={cancelEdit} disabled={saving}>
                <CloseIcon fontSize="small" sx={{ color: isOwn ? 'white' : 'inherit' }} />
              </IconButton>
              <IconButton size="small" onClick={saveEdit} disabled={saving}>
                <CheckIcon fontSize="small" sx={{ color: isOwn ? 'white' : 'inherit' }} />
              </IconButton>
            </Box>
          </Box>
        ) : (
          <Typography variant="body2">{message.message_text}</Typography>
        )}

        {!isDeleted && !isEditing && (
          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.5, opacity: 0.7, fontSize: '0.7rem' }}>
            {moment(message.createdAt).format('HH:mm')}

            {/* NAYA — "edited" tag, click karke purane versions dikhte hain */}
            {message.is_edited && (
              <Typography
                component="span"
                variant="caption"
                onClick={handleViewHistory}
                sx={{ fontSize: '0.65rem', cursor: 'pointer', textDecoration: 'underline', ml: 0.3 }}
              >
                edited
              </Typography>
            )}

            {isOwn && message.status === 'pending' && <PendingIcon sx={{ fontSize: 13 }} />}
            {isOwn && message.status === 'sent' && <SentIcon sx={{ fontSize: 14 }} />}
            {isOwn && message.status === 'read' && <ReadIcon sx={{ fontSize: 14, color: '#4fc3f7' }} />}
            {isOwn && message.status === 'failed' && <Typography component="span" sx={{ color: 'red', fontSize: '0.65rem' }}>failed</Typography>}
          </Typography>
        )}

        {message.reactions && message.reactions.length > 0 && (
          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {Object.entries(
              message.reactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {})
            ).map(([emoji, count]) => (
              <Box key={emoji} sx={{ bgcolor: 'rgba(0,0,0,0.08)', borderRadius: 10, px: 0.8, display: 'flex', alignItems: 'center', gap: 0.3 }}>
                <Typography sx={{ fontSize: '0.85rem' }}>{emoji}</Typography>
                {count > 1 && <Typography variant="caption">{count}</Typography>}
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* NAYA — 3-dot menu: Copy / Reply / History / Delete */}
      {!isDeleted && !isEditing && (
        <Box className="message-menu" sx={{ ml: 1, opacity: 0, transition: 'opacity 0.2s', display: 'flex' }}>
          <IconButton size="small" onClick={(e) => setReactionAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
            <EmojiIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleMenuOpen} sx={{ p: 0.5 }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
            <MenuItem onClick={handleCopy}>Copy</MenuItem>
            <MenuItem onClick={() => { onReply?.(message); handleMenuClose(); }}>Reply</MenuItem>
            {message.is_edited && <MenuItem onClick={handleViewHistory}>View edit history</MenuItem>}
            {isOwn && <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>Delete</MenuItem>}
          </Menu>

          <Popover
            open={Boolean(reactionAnchor)}
            anchorEl={reactionAnchor}
            onClose={() => setReactionAnchor(null)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Box sx={{ display: 'flex', p: 0.5 }}>
              {REACTION_EMOJIS.map((emoji) => (
                <IconButton key={emoji} size="small" onClick={() => handlePickReaction(emoji)}>
                  <Typography sx={{ fontSize: '1.2rem' }}>{emoji}</Typography>
                </IconButton>
              ))}
            </Box>
          </Popover>
        </Box>
      )}

      {/* NAYA — edit history modal */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit History</DialogTitle>
        <DialogContent dividers>
          {historyLoading ? (
            <Typography>Loading...</Typography>
          ) : history.length > 0 ? (
            <List>
              {history.map((h, idx) => (
                <React.Fragment key={h.id}>
                  <ListItem>
                    <ListItemText primary={h.previous_text} secondary={moment(h.createdAt).format('DD MMM YYYY, HH:mm')} />
                  </ListItem>
                  {idx < history.length - 1 && <Divider />}
                </React.Fragment>
              ))}
              <Divider />
              <ListItem>
                <ListItemText primary={message.message_text} secondary="Current version" />
              </ListItem>
            </List>
          ) : (
            <Typography color="textSecondary">No history found</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default MessageBubble;