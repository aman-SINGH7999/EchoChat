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
  Grid,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { RiImageAddFill } from "react-icons/ri";
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { logout, setUser } from '../redux/slices/authSlice';
import { userAPI, authAPI } from '../services/api';
import { disconnectSocket } from '../services/socket';
import CommonModal from '../components/CommonModal';

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
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

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

  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }

    setProfileImage(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  const handleUploadProfileImage = async () => {
    try {
      setImageUploading(true);

      const formDataImage = new FormData();
      formDataImage.append('file', profileImage);

      const response = await userAPI.uploadProfilePicture(formDataImage);

      dispatch(setUser(response.data.user));

      setImageModalOpen(false);
      setProfileImage(null);
      setPreviewImage('');

      setSuccess('Profile image updated successfully');
    } catch (error) {
      setError(
        error.response?.data?.message ||
        'Failed to upload image'
      );
    } finally {
      setImageUploading(false);
    }
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
        <Box
          sx={{
            mb: 4,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: { xs: 'center', md: 'start' },
            gap: 3,
            textAlign: { xs: 'center', md: 'left' }
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={user?.userprofile}
              sx={{
                width: 120,
                height: 120
              }}
            >
              {user?.username?.charAt(0)?.toUpperCase()}
            </Avatar>

            <IconButton
              onClick={() => setImageModalOpen(true)}
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                bgcolor: 'rgba(255,255,255,0.4)',
                boxShadow: 2,
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,.6)',
                }
              }}
            >
              <CameraAltIcon />
            </IconButton>
          </Box>

          <Box>
            <Typography variant="h5">
              {user?.username}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
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
                select
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <MenuItem value=""> Select Gender </MenuItem>
                <MenuItem value="male"> Male </MenuItem>
                <MenuItem value="female"> Female </MenuItem>
                <MenuItem value="other"> Other </MenuItem>
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

      {/* image upload and preview */}
      <CommonModal
        open={imageModalOpen}
        onClose={() => {
          setImageModalOpen(false);
          setProfileImage(null);
          setPreviewImage('');
          setError('');
        }}
        title="Change Profile Picture"
        onAction={handleUploadProfileImage}
        actionLabel="Save"
        actionDisabled={!profileImage}
        actionLoading={imageUploading}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Avatar
            src={previewImage || user?.userprofile}
            sx={{
              width: 150,
              height: 150
            }}
          >
            {user?.username?.charAt(0)?.toUpperCase()}
          </Avatar>

          <Button
            variant="outlined"
            component="label"
          >
            {profileImage ? profileImage.name : 'Choose Image'}

            <input
              hidden
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </Button>
        </Box>
      </CommonModal>
    </Container>
  );
}

export default ProfilePage;
