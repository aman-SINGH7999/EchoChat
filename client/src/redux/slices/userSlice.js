import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  searchResults: [],
  contacts: [],
  loading: false,
  error: null
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setSearchResults: (state, action) => {
      state.searchResults = action.payload;
    },
    setContacts: (state, action) => {
      state.contacts = action.payload;
    },
    addContact: (state, action) => {
      if (!state.contacts.find(c => c.id === action.payload.id)) {
        state.contacts.push(action.payload);
      }
    },
    removeContact: (state, action) => {
      state.contacts = state.contacts.filter(c => c.id !== action.payload);
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  }
});

export const {
  setSearchResults,
  setContacts,
  addContact,
  removeContact,
  setLoading,
  setError,
  clearError
} = userSlice.actions;

export default userSlice.reducer;
