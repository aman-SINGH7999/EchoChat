import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress, Box } from '@mui/material';

import { setUser, setToken } from './redux/slices/authSlice';
import { userAPI } from './services/api';
import { connectSocket, disconnectSocket, emitUserConnect } from './services/socket';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSelector(state => state.auth);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#2196F3'
    },
    secondary: {
      main: '#f50057'
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff'
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
  }
});

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, token } = useSelector(state => state.auth);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        dispatch(setToken(token));
        try {
          const response = await userAPI.getProfile();
          dispatch(setUser(response.data.user));
          
          // Connect socket
          connectSocket();
          emitUserConnect(response.data.user.id);
        } catch (error) {
          console.error('Error fetching profile:', error);
          localStorage.removeItem('token');
          dispatch(setToken(null));
        }
      }
    };

    checkAuth();

    return () => {
      disconnectSocket();
    };
  }, [dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected Routes */}
          <Route
            path="/chats"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Redirect to chats if authenticated, otherwise to login */}
          <Route path="/" element={isAuthenticated ? <Navigate to="/chats" /> : <Navigate to="/login" />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
