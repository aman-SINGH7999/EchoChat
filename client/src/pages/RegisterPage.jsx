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
import { Stepper, Step, StepLabel } from '@mui/material';
import { setUser, setToken, setError } from '../redux/slices/authSlice';
import { authAPI } from '../services/api';
import { connectSocket, emitUserConnect } from '../services/socket';


function RegisterPage() {
  const [step, setStep] = useState(0);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState('');
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
      await authAPI.register(formData);
      setStep(1); 
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      setErrorMessage(message);
      dispatch(setError(message));
    } finally {
      setLoading(false);
    }
  };

  
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setOtpLoading(true);
    setErrorMessage('');

    try {
      const response = await authAPI.verifyRegistrationOTP({
        email: formData.email,
        otp,
        username: formData.username,
        password: formData.password
      });
      const { token, user } = response.data;

      dispatch(setToken(token));
      dispatch(setUser(user));

      navigate('/chats');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    setErrorMessage('');
    setOtpSuccess('');
    try {
      await authAPI.resendRegistrationOTP(formData.email, formData.username);
      setOtpSuccess('OTP resent to your email');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
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

          {otpSuccess && <Alert severity="success" sx={{ mb: 2 }}>{otpSuccess}</Alert>}

          <Stepper activeStep={step} sx={{ mb: 3 }}>
            <Step><StepLabel>Details</StepLabel></Step>
            <Step><StepLabel>Verify Email</StepLabel></Step>
          </Stepper>

          
          {step === 0 && (
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
                {loading ? <CircularProgress size={24} /> : 'Send OTP'}
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
          )}
         {step === 1 && (
           <form onSubmit={handleVerifyOTP}>
             <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
               We've sent a verification code to <b>{formData.email}</b>
             </Typography>
             <TextField fullWidth label="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} margin="normal" required />
             <Button type="submit" fullWidth variant="contained" color="primary" sx={{ mt: 3, mb: 2 }} disabled={otpLoading}>
               {otpLoading ? <CircularProgress size={24} /> : 'Verify & Continue'}
             </Button>
             <Box textAlign="center">
               <Button size="small" onClick={handleResendOTP} disabled={resending}>
                 {resending ? 'Resending...' : "Didn't get the code? Resend OTP"}
               </Button>
             </Box>
           </form>
         )}
        </Card>
      </Box>
    </Container>
  );
}

export default RegisterPage;
