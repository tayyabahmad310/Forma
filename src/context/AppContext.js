/**
 * App Settings & Global State Context
 * Provides active business settings, currency symbol, and data reload triggers.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAllSettings, updateMultipleSettings } from '../repositories/settingsRepository';
import { DEFAULT_SETTINGS } from '../constants/config';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);

  const loadSettings = useCallback(async () => {
    try {
      const stored = await getAllSettings();
      setSettings(stored);
    } catch (err) {
      console.warn('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Trigger reload across screens when data changes
  const notifyDataChanged = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);

  const saveSettings = useCallback(async (newSettings) => {
    const updated = await updateMultipleSettings(newSettings);
    setSettings(updated);
    notifyDataChanged();
  }, [notifyDataChanged]);

  return (
    <AppContext.Provider
      value={{
        settings,
        currencySymbol: settings.currency_symbol || 'Rs',
        currencyCode: settings.currency_code || 'PKR',
        businessName: settings.business_name || 'Clothio Apparel',
        isLoading,
        dataVersion,
        notifyDataChanged,
        refreshSettings: loadSettings,
        saveSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
