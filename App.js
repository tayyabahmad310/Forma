/**
 * Clothio - Offline Clothing Inventory, POS & Business Profit Manager
 * Root Application Entry Point
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from './src/database/connection';
import { AppProvider } from './src/context/AppContext';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS, TYPOGRAPHY } from './src/constants/theme';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        setDbReady(true);
      } catch (err) {
        console.error('Fatal: SQLite Database Initialization Error:', err);
        setInitError(err.message || 'Database could not be initialized.');
      }
    })();
  }, []);

  if (initError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Database Initialization Failed</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Initializing Local Offline Database...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </AuthProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  errorTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.danger,
    marginBottom: 8,
  },
  errorMessage: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
