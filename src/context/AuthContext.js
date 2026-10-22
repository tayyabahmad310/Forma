/**
 * Local Authentication Context
 * Manages device PIN lock, app unlock state, and auto-lock on background resume.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { isPinEnabled, verifyPin, setupPin, disablePin } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [pinEnabled, setPinEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const checkPinStatus = useCallback(async () => {
    try {
      const enabled = await isPinEnabled();
      setPinEnabled(enabled);
      if (enabled) {
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    } catch (err) {
      console.warn('Error checking PIN status:', err);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkPinStatus();
  }, [checkPinStatus]);

  // Handle app state changes (background / active)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' && pinEnabled) {
        setIsLocked(true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [pinEnabled]);

  const unlock = async (enteredPin) => {
    const isValid = await verifyPin(enteredPin);
    if (isValid) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const lock = () => {
    if (pinEnabled) {
      setIsLocked(true);
    }
  };

  const enableNewPin = async (newPin) => {
    await setupPin(newPin);
    setPinEnabled(true);
    setIsLocked(false);
  };

  const disableCurrentPin = async (currentPin) => {
    await disablePin(currentPin);
    setPinEnabled(false);
    setIsLocked(false);
  };

  return (
    <AuthContext.Provider
      value={{
        pinEnabled,
        isLocked,
        isCheckingAuth,
        unlock,
        lock,
        enableNewPin,
        disableCurrentPin,
        refreshPinStatus: checkPinStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
