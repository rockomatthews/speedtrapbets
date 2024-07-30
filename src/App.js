import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { CssBaseline, Container, ThemeProvider, createTheme } from '@mui/material';
import CustomToolbar from './components/CustomToolbar';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';

const theme = createTheme();

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <CustomToolbar />
        <Container maxWidth="sm" sx={{ marginTop: 4 }}>
          <Routes>
            <Route path="/" element={<SignUp />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </Container>
      </Router>
    </ThemeProvider>
  );
}

export default App;