import React, { useState, useEffect } from 'react';
import { 
  TextField, 
  Button, 
  Typography, 
  Container, 
  Box, 
  Alert,
  IconButton,
  InputAdornment,
  Divider
} from '@mui/material';
import { Visibility, VisibilityOff, Google } from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        console.log('User signed in:', session.user);
        navigate('/dashboard');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: `${process.env.REACT_APP_URL}/dashboard`
        }
      });

      if (error) throw error;

      if (data.user) {
        setSuccessMessage('Sign up successful! Please check your email to verify your account.');
      }

    } catch (error) {
      console.error('Sign up error:', error);
      setError(error.message || 'An error occurred during sign up. Please try again.');
    }
  };

  const handleGmailSignUp = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.REACT_APP_URL}/dashboard`
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Google sign in error:', error);
      setError(error.message || 'An error occurred during Google sign in. Please try again.');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">Sign Up</Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {successMessage && <Alert severity="success" sx={{ mt: 2 }}>{successMessage}</Alert>}
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>Sign Up</Button>
          <Divider sx={{ my: 2 }}>OR</Divider>
          <Button fullWidth variant="outlined" onClick={handleGmailSignUp} startIcon={<Google />} sx={{ mt: 1, mb: 2 }}>
            Sign up with Google
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default SignUp;