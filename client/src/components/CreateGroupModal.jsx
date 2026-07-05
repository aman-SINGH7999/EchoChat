import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Chip,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Checkbox,
  CircularProgress
} from '@mui/material';

import { addChat } from '../redux/slices/chatSlice';
import { chatAPI, userAPI } from '../services/api';

function CreateGroupModal({ open, onClose }) {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (query) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    try {
      const response = await userAPI.searchUsers(query);

      setSearchResults(
        response.data.users.filter(u => u.id !== user.id)
      );
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    handleSearch(debouncedQuery);
  }, [debouncedQuery]);

  const handleToggleMember = (member) => {
    setSelectedMembers(prev =>
      prev.find(m => m.id === member.id)
        ? prev.filter(m => m.id !== member.id)
        : [...prev, member]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert('Group name is required');
      return;
    }

    if (selectedMembers.length === 0) {
      alert('Select at least one member');
      return;
    }

    setLoading(true);
    try {
      const response = await chatAPI.createGroupChat({
        chat_name: groupName,
        members: selectedMembers.map(m => m.id)
      });

      dispatch(addChat(response.data.chat));
      onClose();
      setGroupName('');
      setSelectedMembers([]);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Group Chat</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
          />

          <TextField
            fullWidth
            label="Add Members"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
          />

          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {selectedMembers.map((member) => (
                <Chip
                  key={member.id}
                  label={member.username}
                  onDelete={() => handleToggleMember(member)}
                />
              ))}
            </Box>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <Box>
              <Typography variant="subtitle2">Results</Typography>
              <List sx={{ bgcolor: '#f5f5f5', borderRadius: 1 }}>
                {searchResults.map((member) => (
                  <ListItem
                    key={member.id}
                    disablePadding
                    secondaryAction={
                      <Checkbox
                        checked={selectedMembers.some(m => m.id === member.id)}
                        onChange={() => handleToggleMember(member)}
                      />
                    }
                  >
                    <ListItemButton onClick={() => handleToggleMember(member)}>
                      <ListItemText
                        primary={member.username}
                        secondary={member.email}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {searching && <CircularProgress size={24} />}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleCreateGroup}
          variant="contained"
          color="primary"
          disabled={loading || !groupName.trim() || selectedMembers.length === 0}
        >
          {loading ? <CircularProgress size={24} /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateGroupModal;
