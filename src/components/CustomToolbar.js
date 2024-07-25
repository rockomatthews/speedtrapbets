import React from 'react';
import { AppBar, Toolbar, Typography } from '@mui/material';
import PhantomLogin from './PhantomLogin';

const CustomToolbar = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Speed Trap Bets
        </Typography>
        <PhantomLogin />
      </Toolbar>
    </AppBar>
  );
};

export default CustomToolbar;