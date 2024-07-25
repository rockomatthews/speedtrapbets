import React from 'react';
import { CssBaseline, Container, ThemeProvider, createTheme } from '@mui/material';
import CustomToolbar from './components/CustomToolbar';
import Search from './components/Search';

const theme = createTheme();

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CustomToolbar />
      <Container maxWidth="sm" sx={{ marginTop: 4 }}>
        <Search />
        {/* Other components */}
      </Container>
    </ThemeProvider>
  );
}

export default App;