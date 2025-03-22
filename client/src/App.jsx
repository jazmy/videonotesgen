import React, { Suspense } from 'react';
import PropTypes from 'prop-types';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { CircularProgress, Box } from '@mui/material';
import { AppProvider } from './context/AppContext';
import HomePage from './HomePage';

// Loading component
const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </div>
);

// Simple error boundary component
function ErrorBoundary({ children }) {
  const [hasError, setHasError] = React.useState(false);
  
  React.useEffect(() => {
    const errorHandler = (errorEvent) => {
      console.error('Error caught by error boundary:', errorEvent);
      setHasError(true);
    };
    
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);
  
  if (hasError) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Something went wrong.</h2>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginTop: '10px'
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }
  
  return children;
}

const App = () => {
  return (
    <Router>
      <ErrorBoundary>
        <SnackbarProvider maxSnack={3}>
          <AppProvider>
            <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="*" element={<HomePage />} />
                </Routes>
              </Suspense>
            </Box>
          </AppProvider>
        </SnackbarProvider>
      </ErrorBoundary>
    </Router>
  );
};

// PropTypes
ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired
};

export default App;
