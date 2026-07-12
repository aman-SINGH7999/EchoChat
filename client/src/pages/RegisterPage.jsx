import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  TextField,
  Button,
  Box,
  Typography,
  Card,
  CircularProgress,
  Alert
} from '@mui/material';
import { setUser, setToken, setError } from '../redux/slices/authSlice';
import { authAPI } from '../services/api';
import { connectSocket, emitUserConnect } from '../services/socket';


function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setErrorMessage] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.register(formData);
      const { token, user } = response.data;

      dispatch(setToken(token));
      dispatch(setUser(user));

      navigate('/chats');
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      setErrorMessage(message);
      dispatch(setError(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
      >
        <Card sx={{ width: '100%', p: 4, boxShadow: 3 }}>
          <Box sx={{display:'flex', justifyContent:'center', alignItems:"center", gap:2 }}>
            <Box
              component="img"
              src="/logo.png"
              alt="Charcha"
              sx={{
                width: 50,
                height: 'auto',
              }}
            />
            <Typography variant="h4" component="h1" gutterBottom textAlign="center"sx={{ mt: 2 }}>
              Create Account
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              margin="normal"
              required
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Register'}
            </Button>

            <Box textAlign="center">
              <Typography variant="body2">
                Already have an account?{' '}
                <Link to="/login" style={{ textDecoration: 'none', color: '#2196F3' }}>
                  Login
                </Link>
              </Typography>
            </Box>
          </form>
        </Card>
      </Box>
    </Container>
  );
}

export default RegisterPage;