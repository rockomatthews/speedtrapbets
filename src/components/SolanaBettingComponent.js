import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { initializeBetting, placeBet } from '../solana/betting';
import { 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Paper, 
  Alert,
  CircularProgress
} from '@mui/material';

const SolanaBettingComponent = () => {
  const wallet = useWallet();
  const [betAccount, setBetAccount] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const initBetting = async () => {
      if (wallet.connected && !betAccount) {
        setLoading(true);
        try {
          const account = await initializeBetting(wallet);
          setBetAccount(account);
        } catch (err) {
          setError('Failed to initialize betting account. Please try again.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };

    initBetting();
  }, [wallet.connected, betAccount]);

  const handlePlaceBet = async () => {
    if (betAccount && betAmount) {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        await placeBet(wallet, betAccount, parseInt(betAmount));
        setSuccess('Bet placed successfully!');
        setBetAmount('');
      } catch (err) {
        setError('Error placing bet. Please try again.');
        console.error('Error placing bet:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!wallet.connected) {
    return (
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Solana Betting
        </Typography>
        <Alert severity="info">Please connect your Solana wallet to place bets.</Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Place a Bet
      </Typography>
      <Box component="form" noValidate sx={{ mt: 1 }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="betAmount"
          label="Bet Amount"
          name="betAmount"
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(e.target.value)}
          disabled={loading}
        />
        <Button
          fullWidth
          variant="contained"
          onClick={handlePlaceBet}
          disabled={loading || !betAmount}
          sx={{ mt: 3, mb: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Place Bet'}
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
    </Paper>
  );
};

export default SolanaBettingComponent;