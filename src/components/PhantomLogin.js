import React, { useState, useEffect, useCallback } from 'react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { 
  Button, 
  Snackbar,
  Alert
} from '@mui/material';

const PhantomLogin = () => {
  const [walletAdapter, setWalletAdapter] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const initializeWallet = useCallback(async () => {
    if ('solana' in window && window.solana.isPhantom) {
      try {
        const adapter = new PhantomWalletAdapter();
        setWalletAdapter(adapter);

        adapter.on('connect', (publicKey) => {
          console.log('Connected to wallet:', publicKey.toBase58());
          setConnected(true);
          setLoading(false);
        });

        adapter.on('disconnect', () => {
          console.log('Disconnected from wallet');
          setConnected(false);
          setLoading(false);
        });

        // Check if already connected
        if (adapter.connected) {
          setConnected(true);
        }
      } catch (error) {
        console.error('Failed to initialize wallet adapter:', error);
        setError('Failed to initialize wallet adapter');
      }
    } else {
      setError('Phantom wallet is not installed');
    }
  }, []);

  useEffect(() => {
    initializeWallet();
  }, [initializeWallet]);

  useEffect(() => {
    return () => {
      if (walletAdapter) {
        walletAdapter.removeAllListeners();
      }
    };
  }, [walletAdapter]);

  const handleConnect = async () => {
    if (walletAdapter && !connected) {
      setLoading(true);
      try {
        await walletAdapter.connect();
      } catch (error) {
        console.error('Failed to connect to Phantom wallet:', error);
        setError('Failed to connect to Phantom wallet');
        setLoading(false);
      }
    }
  };

  const handleDisconnect = async () => {
    if (walletAdapter && connected) {
      setLoading(true);
      try {
        await walletAdapter.disconnect();
      } catch (error) {
        console.error('Failed to disconnect from Phantom wallet:', error);
        setError('Failed to disconnect from Phantom wallet');
        setLoading(false);
      }
    }
  };

  const handleCloseError = () => {
    setError('');
  };

  return (
    <React.Fragment>
      <Button 
        variant="contained" 
        color={connected ? "secondary" : "primary"}
        onClick={connected ? handleDisconnect : handleConnect}
        disabled={loading}
      >
        {connected ? 'Disconnect' : 'Connect Wallet'}
      </Button>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseError}>
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </React.Fragment>
  );
};

export default PhantomLogin;