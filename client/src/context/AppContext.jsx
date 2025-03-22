import React, { createContext, useContext, useState, useCallback } from 'react';
import { useSnackbar } from 'notistack';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [isProcessing, setIsProcessing] = useState(false);

  const showNotification = useCallback(
    (message, options = {}) => {
      enqueueSnackbar(message, {
        variant: 'info',
        autoHideDuration: 3000,
        ...options,
      });
    },
    [enqueueSnackbar]
  );

  const showError = useCallback(
    (error) => {
      const message = error.message || 'An error occurred';
      enqueueSnackbar(message, {
        variant: 'error',
        autoHideDuration: 5000,
      });
    },
    [enqueueSnackbar]
  );

  const showSuccess = useCallback(
    (message) => {
      enqueueSnackbar(message, {
        variant: 'success',
        autoHideDuration: 3000,
      });
    },
    [enqueueSnackbar]
  );

  const value = {
    isProcessing,
    setIsProcessing,
    showNotification,
    showError,
    showSuccess,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
