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
  const [username, setUsername] = useState('');
  const [iRacingName, setIRacingName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        console.log('User signed in:', session.user);
        await ensureUserInDatabase(session.user);
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

  const validateUsername = (username) => {
    const re = /^[a-zA-Z0-9]+$/;
    return re.test(username);
  };

  const ensureUserInDatabase = async (user) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking user:', error);
        throw error;
      }

      if (!data) {
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            { 
              id: user.id,
              email: user.email,
              username: user.user_metadata.username || user.email.split('@')[0], 
              iRacing_name: user.user_metadata.iRacing_name || null 
            }
          ]);

        if (insertError) {
          console.error('Error inserting user:', insertError);
          throw insertError;
        }
      }
    } catch (error) {
      console.error('Error in ensureUserInDatabase:', error);
      setError('An error occurred while setting up your account. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!validateUsername(username)) {
      setError('Username must contain only letters and numbers, with no spaces.');
      return;
    }

    try {
      // Check if username is unique
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingUser) {
        setError('This username is already taken.');
        return;
      }

      // Sign up the user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username,
            iRacing_name: iRacingName
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        await ensureUserInDatabase({
          ...data.user,
          email: email,
          user_metadata: {
            username: username,
            iRacing_name: iRacingName
          }
        });
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
          redirectTo: window.location.origin + '/dashboard'
        }
      });

      if (error) throw error;

      // The user data will be handled in the onAuthStateChange listener in useEffect
    } catch (error) {
      console.error('Google sign in error:', error);
      setError(error.message || 'An error occurred during Google sign in. Please try again.');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Sign Up
        </Typography>
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
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            margin="normal"
            fullWidth
            id="iRacingName"
            label="iRacing Name (optional)"
            name="iRacingName"
            value={iRacingName}
            onChange={(e) => setIRacingName(e.target.value)}
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
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {successMessage && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {successMessage}
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Sign Up
          </Button>
          <Divider sx={{ my: 2 }}>OR</Divider>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleGmailSignUp}
            startIcon={<Google />}
            sx={{ mt: 1, mb: 2 }}
          >
            Sign up with Google
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default SignUp;