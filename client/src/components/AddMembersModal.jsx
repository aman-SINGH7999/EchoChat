import React, { useState, useEffect } from 'react';
import { List, ListItem, ListItemButton, ListItemText, Checkbox, CircularProgress, Box, TextField, Typography } from '@mui/material';
import { userAPI, groupAPI } from '../services/api';
import { useDispatch } from 'react-redux';
import { replaceChat } from '../redux/slices/chatSlice';
import CommonModal from './CommonModal';   

function AddMembersModal({ open, onClose, chat }) {
  const dispatch = useDispatch();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await userAPI.searchUsers(query);
        const existingIds = chat.members.map(m => m.user_id);
        setResults(res.data.users.filter(u => !existingIds.includes(u.id)));
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setSearching(false);
        setHasSearched(true);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, chat]);

  const toggle = (u) => {
    setSelected(prev => prev.find(x => x.id === u.id) ? prev.filter(x => x.id !== u.id) : [...prev, u]);
  };

  const resetState = () => {
    setQuery('');
    setResults([]);
    setSelected([]);
    setHasSearched(false);
  };

  const handleAdd = async () => {
    setLoading(true);
    try {
      const res = await groupAPI.addMembers(chat.id, selected.map(u => u.id));
      dispatch(replaceChat(res.data.chat));
      resetState();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add members');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CommonModal
      open={open}
      onClose={() => { resetState(); onClose(); }}
      title="Add Members"
      onAction={handleAdd}
      actionLabel="Add"
      actionLoading={loading}
      actionDisabled={selected.length === 0}
    >
      <TextField
        fullWidth
        placeholder="Search users..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 2 }}
      />

      {searching ? (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress size={24} />
        </Box>
      ) : results.length > 0 ? (
        <List>
          {results.map(u => (
            <ListItem key={u.id} disablePadding secondaryAction={<Checkbox checked={selected.some(x => x.id === u.id)} onChange={() => toggle(u)} />}>
              <ListItemButton onClick={() => toggle(u)}>
                <ListItemText primary={u.username} secondary={u.email} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      ) : hasSearched ? (
        <Box display="flex" justifyContent="center" py={3}>
          <Typography color="textSecondary">No users found</Typography>
        </Box>
      ) : (
        <Box display="flex" justifyContent="center" py={3}>
          <Typography color="textSecondary">Enter at least 2 characters to search</Typography>
        </Box>
      )}
    </CommonModal>
  );
}

export default AddMembersModal;