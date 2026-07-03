import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  TextField,
  Button,
  Box,
  Typography,
  Card,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { authAPI } from '../services/api';

function ForgotPasswordPage() {
  const [step, setStep] = useState(0); // 0: email, 1: otp, 2: new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authAPI.forgotPassword(email);
      setSuccess('OTP sent to your email');
      setStep(1);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authAPI.verifyOTP(email, otp);
      setSuccess('OTP verified successfully');
      setStep(2);
    } catch (error) {
      setError(error.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await authAPI.resetPassword({
        email,
        password: newPassword,
        confirmPassword
      });
      setSuccess('Password reset successfully');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to reset password');
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
            Reset Password
          </Typography>

          <Stepper activeStep={step} sx={{ mb: 3 }}>
            <Step>
              <StepLabel>Email</StepLabel>
            </Step>
            <Step>
              <StepLabel>Verify OTP</StepLabel>
            </Step>
            <Step>
              <StepLabel>New Password</StepLabel>
            </Step>
          </Stepper>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {step === 0 && (
            <form onSubmit={handleSendOTP}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                sx={{ mt: 3 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Send OTP'}
              </Button>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={handleVerifyOTP}>
              <TextField
                fullWidth
                label="OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                margin="normal"
                required
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                sx={{ mt: 3 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Verify OTP'}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleResetPassword}>
              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                required
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                sx={{ mt: 3 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Reset Password'}
              </Button>
            </form>
          )}

          <Box textAlign="center" sx={{ mt: 2 }}>
            <Link to="/login" style={{ textDecoration: 'none', color: '#2196F3' }}>
              <Typography variant="body2">Back to Login</Typography>
            </Link>
          </Box>
        </Card>
      </Box>
    </Container>
  );
}

export default ForgotPasswordPage;
