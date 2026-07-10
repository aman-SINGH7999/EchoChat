import React from 'react';
import { List, ListItem, ListItemButton, ListItemAvatar, ListItemText, Avatar, Box, Badge, Typography } from '@mui/material';
import moment from 'moment';
import { stripHtml } from '../utils/richText';

function ChatSidebar({ chats, selectedChat, onSelectChat, currentUserId }) {
  const formatTime = (date) => {
    return moment(date).fromNow();
  };

  const getPreviewText = (chat, lastMessage) => {
    if (!lastMessage) return 'No messages yet';
    if (lastMessage.is_deleted) return 'This message was deleted';

    let text;
    if (lastMessage.message_type === 'image') text = '📷 Photo';
    else if (lastMessage.message_type === 'video') text = '🎥 Video';
    else if (lastMessage.message_type === 'audio') text = '🎵 Audio';
    else if (lastMessage.message_type === 'file') text = `📎 ${lastMessage.file?.file_name || 'File'}`;
    else if (!lastMessage.message_text) return 'No messages yet';
    else text = stripHtml(lastMessage.message_text);

    if (chat.chat_type === 'group') {
      const senderName = lastMessage.sender?.username || 'Unknown';
      return `${senderName}: ${text}`;
    }
    return text;
  };

  return (
    <List sx={{ p: 0 }}>
      {chats && chats.length > 0 ? (
        chats.map((chat) => {
          const lastMessage = chat.messages && chat.messages[0];
          const otherMember = chat.members?.find(m => m.user_id !== currentUserId);

          const chatName = chat.chat_name || otherMember?.user?.username;
          const chatAvatar = chat.room_image || otherMember?.user?.userprofile;
          const isOnline = otherMember?.user?.isOnline;

          return (
            <ListItem
              key={chat.id}
              disablePadding
              sx={{
                bgcolor: selectedChat?.id === chat.id ? '#f0f0f0' : 'transparent',
                '&:hover': { bgcolor: '#f9f9f9' }
              }}
            >
              <ListItemButton onClick={() => onSelectChat(chat)}>
                <ListItemAvatar>
                  {chat.chat_type === 'group' ? (
                    <Avatar src={chatAvatar} alt={chatName}>
                      {chatName?.charAt(0).toUpperCase()}
                    </Avatar>
                  ) : (
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      variant="dot"
                      sx={{
                        '& .MuiBadge-badge': {
                          backgroundColor: isOnline ? '#44b700' : '#bdbdbd'
                        }
                      }}
                    >
                      <Avatar src={chatAvatar} alt={chatName}>
                        {chatName?.charAt(0).toUpperCase()}
                      </Avatar>
                    </Badge>
                  )}
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" noWrap>
                      {chatName}
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" noWrap color="textSecondary">
                        {getPreviewText(chat, lastMessage)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {lastMessage ? formatTime(lastMessage.createdAt) : ''}
                      </Typography>
                    </Box>
                  }
                />
              </ListItemButton>
            </ListItem>
          );
        })
      ) : (
        <ListItem>
          <ListItemText primary="No chats yet. Start a conversation!" />
        </ListItem>
      )}
    </List>
  );
}

export default ChatSidebar;