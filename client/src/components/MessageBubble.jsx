import React from 'react';
import { Box, Paper, Typography, Avatar, Menu, MenuItem, IconButton } from '@mui/material';
import { MoreVert as MoreVertIcon, AccessTime as PendingIcon, Done as SentIcon, DoneAll as ReadIcon } from '@mui/icons-material';
import moment from 'moment';

function MessageBubble({ message, isOwn }) {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        mb: 1,
        alignItems: 'flex-end'
      }}
    >
      {!isOwn && (
        <Avatar
          src={message.sender?.userprofile}
          alt={message.sender?.username}
          sx={{ mr: 1, width: 32, height: 32 }}
        >
          {message.sender?.username?.charAt(0).toUpperCase()}
        </Avatar>
      )}

      <Paper
        sx={{
          p: 1.5,
          maxWidth: '60%',
          bgcolor: isOwn ? '#2196F3' : '#e0e0e0',
          color: isOwn ? 'white' : 'black',
          borderRadius: 2,
          wordWrap: 'break-word',
          position: 'relative',
          '&:hover .message-menu': {
            opacity: 1
          }
        }}
      >
        {!isOwn && (
          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
            {message.sender?.username}
          </Typography>
        )}

        <Typography variant="body2">{message.message_text}</Typography>

        <Typography
          variant="caption"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.5, opacity: 0.7, fontSize: '0.7rem' }}
        >
          {moment(message.createdAt).format('HH:mm')}

          {isOwn && message.status === 'pending' && <PendingIcon sx={{ fontSize: 13 }} />}
          {isOwn && message.status === 'sent' && <SentIcon sx={{ fontSize: 14 }} />}
          {isOwn && message.status === 'read' && <ReadIcon sx={{ fontSize: 14, color: '#4fc3f7' }} />}
          {isOwn && message.status === 'failed' && <Typography component="span" sx={{ color: 'red', fontSize: '0.65rem' }}>failed</Typography>}
        </Typography>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5 }}>
            {message.reactions.map((reaction) => (
              <Typography key={reaction.id} variant="caption" sx={{ fontSize: '1rem' }}>
                {reaction.emoji}
              </Typography>
            ))}
          </Box>
        )}
      </Paper>

      {isOwn && (
        <Box
          className="message-menu"
          sx={{
            ml: 1,
            opacity: 0,
            transition: 'opacity 0.2s'
          }}
        >
          <IconButton
            size="small"
            onClick={handleClick}
            sx={{ p: 0.5 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
            <MenuItem onClick={handleClose}>Copy</MenuItem>
            <MenuItem onClick={handleClose}>Reply</MenuItem>
            <MenuItem onClick={handleClose}>Delete</MenuItem>
          </Menu>
        </Box>
      )}
    </Box>
  );
}

export default MessageBubble;
