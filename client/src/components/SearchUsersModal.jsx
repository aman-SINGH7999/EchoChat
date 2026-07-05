import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  CircularProgress,
  Box,
  Typography
} from '@mui/material';

import { userAPI } from '../services/api';

function SearchUsersModal({ open, onClose, query, onSelectUser }) {
  const { user: currentUser } = useSelector(state => state.auth);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && query && query.trim().length >= 2) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [open, query]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      console.log("[v0] Searching for users with query:", query);
      const response = await userAPI.searchUsers(query);
      console.log("[v0] Search response:", response.data);
      
      // Filter out the current user from results (backend also does this)
      const filteredUsers = response.data.users.filter(u => u.id !== currentUser.id);
      setSearchResults(filteredUsers);
    } catch (error) {
      console.error('[v0] Error searching users:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    onSelectUser(user);
    setSearchResults([]);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Search Users</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
          </Box>
        ) : searchResults.length > 0 ? (
          <List>
            {searchResults.map((user) => (
              <ListItem key={user.id} disablePadding>
                <ListItemButton onClick={() => handleSelectUser(user)}>
                  <ListItemAvatar>
                    <Avatar src={user.userprofile} alt={user.username}>
                      {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.username}
                    secondary={user.email}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <Typography color="textSecondary">
              {query && query.trim().length >= 2 ? 'No users found' : 'Enter at least 2 characters to search'}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default SearchUsersModal;
