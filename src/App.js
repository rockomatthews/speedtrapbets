import React from 'react';
import { CssBaseline, Container, ThemeProvider, createTheme } from '@mui/material';
import CustomToolbar from './components/CustomToolbar';
import SignUp from './components/SignUp'; // Import the new SignUp component

const theme = createTheme();

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CustomToolbar />
      <Container maxWidth="sm" sx={{ marginTop: 4 }}>
        <SignUp /> {/* Add the SignUp component here */}
        {/* Other components can be added here or conditionally rendered based on auth state */}
      </Container>
    </ThemeProvider>
  );
}

export default App;