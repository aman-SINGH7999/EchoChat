import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TextField, Box, Chip, Typography, List, ListItem, ListItemButton, ListItemText, Checkbox, CircularProgress } from '@mui/material';

import { addChat } from '../redux/slices/chatSlice';
import { chatAPI, userAPI } from '../services/api';
import CommonModal from './CommonModal';   

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
  const [hasSearched, setHasSearched] = useState(false);   

  const handleSearch = async (query) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setSearching(true);
    try {
      const response = await userAPI.searchUsers(query);
      setSearchResults(response.data.users.filter(u => u.id !== user.id));
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
      setHasSearched(true);   // NAYA
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

  const resetState = () => {
    setGroupName('');
    setSelectedMembers([]);
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
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
      resetState();
      onClose();
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CommonModal
      open={open}
      onClose={() => { resetState(); onClose(); }}
      title="Create Group Chat"
      onAction={handleCreateGroup}
      actionLabel="Create"
      actionLoading={loading}
      actionDisabled={!groupName.trim() || selectedMembers.length === 0}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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

        {searching ? (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={24} />
          </Box>
        ) : searchResults.length > 0 ? (
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
                    <ListItemText primary={member.username} secondary={member.email} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        ) : hasSearched ? (
          <Box display="flex" justifyContent="center" py={2}>
            <Typography color="textSecondary">No users found</Typography>
          </Box>
        ) : null}
      </Box>
    </CommonModal>
  );
}

export default CreateGroupModal;