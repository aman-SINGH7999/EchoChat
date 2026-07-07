import React, { useRef } from 'react';
import {
  Box, IconButton, Avatar, Typography, Divider, List, ListItem, ListItemAvatar,
  ListItemText, Chip, Button, Menu, MenuItem
} from '@mui/material';
import { Close as CloseIcon, AdminPanelSettings as AdminIcon, CameraAlt as CameraIcon, PersonAdd as PersonAddIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import moment from 'moment';
import { groupAPI } from '../services/api';
import { replaceChat } from '../redux/slices/chatSlice';

function ChatDetailsPanel({ open, onClose, chat, currentUserId, onOpenAddMembers }) {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [menuAnchor, setMenuAnchor] = React.useState(null);
  const [menuMemberId, setMenuMemberId] = React.useState(null);

  if (!open || !chat) return null;

  const isGroup = chat.chat_type === 'group';
  const otherMember = !isGroup ? chat.members?.find(m => m.user_id !== currentUserId) : null;

  const myMembership = isGroup ? chat.members?.find(m => m.user_id === currentUserId) : null;
  const isAdmin = myMembership?.role === 'admin';

  const displayName = isGroup ? chat.chat_name : otherMember?.user?.username;
  const displayAvatar = isGroup ? chat.room_image : otherMember?.user?.userprofile;
  const isOnline = !isGroup && otherMember?.user?.isOnline;

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await groupAPI.updateGroupImage(chat.id, formData);
      dispatch(replaceChat(res.data.chat));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update group photo');
    }
  };

  const handleMenuOpen = (e, memberId) => {
    setMenuAnchor(e.currentTarget);
    setMenuMemberId(memberId);
  };
  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuMemberId(null);
  };

  const handlePromote = async () => {
    try {
      const res = await groupAPI.promoteToAdmin(chat.id, menuMemberId);
      dispatch(replaceChat(res.data.chat));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to promote member');
    }
    handleMenuClose();
  };

  const handleDeactivate = async () => {
    try {
      const res = await groupAPI.deactivateMember(chat.id, menuMemberId);
      dispatch(replaceChat(res.data.chat));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to deactivate member');
    }
    handleMenuClose();
  };

  const handleReactivate = async (memberId) => {
    try {
      const res = await groupAPI.reactivateMember(chat.id, memberId);
      dispatch(replaceChat(res.data.chat));
      handleMenuClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reactivate member');
    }
  };

  const targetMember = chat.members?.find(m => m.user_id === menuMemberId);

  return (
    <Box sx={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: { xs: '100%', sm: 320 }, bgcolor: 'white', borderLeft: '1px solid #ddd', boxShadow: '-2px 0 8px rgba(0,0,0,0.15)', zIndex: 10, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: '1px solid #eee' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {isGroup ? 'Group Info' : 'Contact Info'}
        </Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
        <Box sx={{ position: 'relative' }}>
          <Avatar src={displayAvatar} sx={{ width: 96, height: 96, mb: 2, fontSize: 36 }}>
            {displayName?.charAt(0).toUpperCase()}
          </Avatar>
          {/* NAYA — sirf group admin ko camera icon dikhega */}
          {isGroup && isAdmin && (
            <>
              <IconButton
                size="small"
                onClick={() => fileInputRef.current?.click()}
                sx={{ position: 'absolute', bottom: 8, right: -4, bgcolor: 'white', boxShadow: 1, '&:hover': { bgcolor: '#f0f0f0' } }}
              >
                <CameraIcon fontSize="small" />
              </IconButton>
              <input type="file" hidden accept="image/*" ref={fileInputRef} onChange={handleImageChange} />
            </>
          )}
        </Box>
        <Typography variant="h6" textAlign="center">{displayName}</Typography>

        {!isGroup && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
            {isOnline ? 'Online' : otherMember?.user?.lastSeen ? `Last seen ${moment(otherMember.user.lastSeen).fromNow()}` : 'Offline'}
          </Typography>
        )}
      </Box>

      <Divider />

      {isGroup ? (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Created by <b>{chat.creator?.username || 'Unknown'}</b>
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">
              {chat.members?.filter(m => m.is_active !== false).length || 0} Members
            </Typography>
            {/* NAYA — sirf admin ko "Add members" dikhega */}
            {isAdmin && (
              <Button size="small" startIcon={<PersonAddIcon />} onClick={onOpenAddMembers}>
                Add
              </Button>
            )}
          </Box>

          <List dense>
            {chat.members?.map((m) => (
              <ListItem
                key={m.id}
                disablePadding
                sx={{ py: 0.5, opacity: m.is_active === false ? 0.5 : 1 }}
              >
                <ListItemAvatar>
                  <Avatar src={m.user?.userprofile} sx={{ width: 36, height: 36 }}>
                    {m.user?.username?.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {m.user?.username}
                      {m.user_id === currentUserId && (
                        <Typography component="span" variant="caption" color="textSecondary">(You)</Typography>
                      )}
                      {m.is_active === false && (
                        <Chip size="small" label="Inactive" color="default" variant="outlined" />
                      )}
                    </Box>
                  }
                />
                {m.role === 'admin' && (
                  <Chip size="small" icon={<AdminIcon fontSize="small" />} label="Admin" variant="outlined" sx={{ mr: 1 }} />
                )}

               
                {isAdmin &&
                  m.user_id !== currentUserId &&
                  m.role !== 'admin' && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, m.user_id)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                )}
              </ListItem>
            ))}
          </List>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
          >
             {!targetMember ? null : targetMember.is_active === false ? (
              <MenuItem
                onClick={() => {
                  handleReactivate(targetMember.user_id);
                  handleMenuClose();
                }}
              >
                Reactivate
              </MenuItem>
            ) : (
              <>
                <MenuItem onClick={handlePromote}>
                  Make Admin
                </MenuItem>

                <MenuItem
                  onClick={handleDeactivate}
                  sx={{ color: 'error.main' }}
                >
                  Deactivate
                </MenuItem>
              </>
            )}
          </Menu>
        </Box>
      ) : (
        <Box sx={{ p: 2 }}>
          {otherMember?.user?.email && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="textSecondary">Email</Typography>
              <Typography variant="body2">{otherMember.user.email}</Typography>
            </Box>
          )}
          {otherMember?.user?.userphone && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="textSecondary">Phone</Typography>
              <Typography variant="body2">{otherMember.user.userphone}</Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

export default ChatDetailsPanel; 