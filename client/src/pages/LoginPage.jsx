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


function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
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

    try {
      const response = await authAPI.login(formData);
      const { token, user } = response.data;

      dispatch(setToken(token));
      dispatch(setUser(user));

      navigate('/chats');
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
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
          <Typography variant="h4" component="h1" gutterBottom textAlign="center" sx={{ mb: 3 }}>
            Chat App
          </Typography>

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
              label="Password"
              name="password"
              type="password"
              value={formData.password}
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
              {loading ? <CircularProgress size={24} /> : 'Login'}
            </Button>

            <Box textAlign="center">
              <Link to="/forgot-password" style={{ textDecoration: 'none', color: '#2196F3' }}>
                <Typography variant="body2">Forgot Password?</Typography>
              </Link>
            </Box>

            <Box textAlign="center" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Don&apos;t have an account?{' '}
                <Link to="/register" style={{ textDecoration: 'none', color: '#2196F3' }}>
                  Register
                </Link>
              </Typography>
            </Box>
          </form>
        </Card>
      </Box>
    </Container>
  );
}

export default LoginPage;
