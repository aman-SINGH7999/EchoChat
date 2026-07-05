import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  TextField,
  Button,
  Box,
  Typography,
  Card,
  Avatar,
  CircularProgress,
  Alert,
  Grid
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { logout, setUser } from '../redux/slices/authSlice';
import { userAPI, authAPI } from '../services/api';
import { disconnectSocket } from '../services/socket';

function ProfilePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  const [formData, setFormData] = useState({
    username: '',
    userphone: '',
    gender: '',
    country: '',
    state: '',
    city: '',
    pincode: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        userphone: user.userphone || '',
        gender: user.gender || '',
        country: user.country || '',
        state: user.state || '',
        city: user.city || '',
        pincode: user.pincode || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    setProfileImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Update profile
      const response = await userAPI.updateProfile(formData);
      dispatch(setUser(response.data.user));

      // Upload image if selected
      if (profileImage) {
        const formDataImage = new FormData();
        formDataImage.append('file', profileImage);
        const imageResponse = await userAPI.uploadProfilePicture(formDataImage);
        dispatch(setUser(imageResponse.data.user));
      }

      setSuccess('Profile updated successfully');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();       
    } catch (error) {
      console.error('Logout API error:', error);
    }
    disconnectSocket();             
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 2 }}>
        <Link to="/chats" style={{ textDecoration: 'none', color: '#2196F3', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowBackIcon fontSize="small" /> Back to Chats
        </Link>
      </Box>
      <Card sx={{ p: 4 }}>
        <Box textAlign="center" sx={{ mb: 4 }}>
          <Avatar
            src={user?.userprofile}
            sx={{ width: 120, height: 120, margin: '0 auto', mb: 2 }}
          />
          <Typography variant="h5">{user?.username}</Typography>
          <Typography variant="body2" color="textSecondary">{user?.email}</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={formData.username}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                name="userphone"
                value={formData.userphone}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Gender"
                name="gender"
                select
                SelectProps={{ native: true }}
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Country"
                name="country"
                value={formData.country}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="State"
                name="state"
                value={formData.state}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Pincode"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Profile Picture"
                type="file"
                inputProps={{ accept: 'image/*' }}
                onChange={handleImageChange}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Update Profile'}
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Box>
        </form>
      </Card>
    </Container>
  );
}

export default ProfilePage;
