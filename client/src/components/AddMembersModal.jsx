import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, List, ListItem, ListItemButton, ListItemText, Checkbox, CircularProgress, Box } from '@mui/material';
import { userAPI, groupAPI } from '../services/api';
import { useDispatch } from 'react-redux';
import { replaceChat } from '../redux/slices/chatSlice';

function AddMembersModal({ open, onClose, chat }) {
  const dispatch = useDispatch();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) { setResults([]); return; }
      const res = await userAPI.searchUsers(query);
      const existingIds = chat.members.map(m => m.user_id);
      setResults(res.data.users.filter(u => !existingIds.includes(u.id)));
    }, 400);
    return () => clearTimeout(timer);
  }, [query, chat]);

  const toggle = (u) => {
    setSelected(prev => prev.find(x => x.id === u.id) ? prev.filter(x => x.id !== u.id) : [...prev, u]);
  };

  const handleAdd = async () => {
    setLoading(true);
    try {
      const res = await groupAPI.addMembers(chat.id, selected.map(u => u.id));
      dispatch(replaceChat(res.data.chat));
      setSelected([]);
      setQuery('');
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add members');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Members</DialogTitle>
      <DialogContent>
        <TextField fullWidth placeholder="Search users..." value={query} onChange={(e) => setQuery(e.target.value)} sx={{ mb: 2 }} />
        <List>
          {results.map(u => (
            <ListItem key={u.id} disablePadding secondaryAction={<Checkbox checked={selected.some(x => x.id === u.id)} onChange={() => toggle(u)} />}>
              <ListItemButton onClick={() => toggle(u)}>
                <ListItemText primary={u.username} secondary={u.email} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={selected.length === 0 || loading} onClick={handleAdd}>
          {loading ? <CircularProgress size={20} /> : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddMembersModal;