/**
 * Root Stack Navigator
 * Controls animated splash screen, first-launch onboarding/setup wizard,
 * PIN security lock gate, screen transitions, and modal routes.
 */

import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { COLORS } from '../constants/theme';

import SplashScreen from '../screens/onboarding/SplashScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import SetupWizardScreen from '../screens/onboarding/SetupWizardScreen';
import PinLockScreen from '../screens/auth/PinLockScreen';
import TabNavigator from './TabNavigator';

// Product & Inventory screens
import ProductDetailScreen from '../screens/products/ProductDetailScreen';
import ProductFormScreen from '../screens/products/ProductFormScreen';
import StockAdjustmentScreen from '../screens/products/StockAdjustmentScreen';

// POS & Sales screens
import CheckoutScreen from '../screens/pos/CheckoutScreen';
import SalesHistoryScreen from '../screens/sales/SalesHistoryScreen';
import SaleDetailScreen from '../screens/sales/SaleDetailScreen';
import ReturnScreen from '../screens/sales/ReturnScreen';

// Purchases & Suppliers screens
import PurchaseFormScreen from '../screens/purchases/PurchaseFormScreen';
import PurchaseDetailScreen from '../screens/purchases/PurchaseDetailScreen';
import SupplierListScreen from '../screens/suppliers/SupplierListScreen';

// Customers & Expenses screens
import CustomerListScreen from '../screens/customers/CustomerListScreen';
import CustomerDetailScreen from '../screens/customers/CustomerDetailScreen';
import ExpenseListScreen from '../screens/expenses/ExpenseListScreen';

// Receipts & Settings screens
import ReceiptPreviewScreen from '../screens/receipts/ReceiptPreviewScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import BackupRestoreScreen from '../screens/settings/BackupRestoreScreen';
import PinSettingsScreen from '../screens/settings/PinSettingsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isLocked, isCheckingAuth } = useAuth();
  const { settings, isLoading: isAppLoading } = useApp();

  const [splashFinished, setSplashFinished] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState('carousel'); // 'carousel' | 'wizard' | 'done'

  // Show animated splash screen on app boot
  if (!splashFinished) {
    return <SplashScreen onFinish={() => setSplashFinished(true)} />;
  }

  if (isCheckingAuth || isAppLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // First-launch setup flow if store has not completed initial onboarding
  const isOnboardingDone = settings?.onboarding_completed === 'true' || onboardingStep === 'done';

  if (!isOnboardingDone) {
    if (onboardingStep === 'wizard') {
      return (
        <SetupWizardScreen
          onBack={() => setOnboardingStep('carousel')}
          onComplete={() => setOnboardingStep('done')}
        />
      );
    }
    return (
      <OnboardingScreen
        onGetStarted={() => setOnboardingStep('wizard')}
      />
    );
  }

  // Security gate
  if (isLocked) {
    return <PinLockScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="MainTabs" component={TabNavigator} />

        {/* Product Screens */}
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="ProductForm" component={ProductFormScreen} />
        <Stack.Screen name="StockAdjustment" component={StockAdjustmentScreen} />

        {/* Sales & POS Screens */}
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="SalesHistory" component={SalesHistoryScreen} />
        <Stack.Screen name="SaleDetail" component={SaleDetailScreen} />
        <Stack.Screen name="Return" component={ReturnScreen} />
        <Stack.Screen name="ReturnScreen" component={ReturnScreen} />

        {/* Purchases & Suppliers Screens */}
        <Stack.Screen name="PurchaseForm" component={PurchaseFormScreen} />
        <Stack.Screen name="PurchaseDetail" component={PurchaseDetailScreen} />
        <Stack.Screen name="SupplierList" component={SupplierListScreen} />

        {/* Customers & Expenses Screens */}
        <Stack.Screen name="CustomerList" component={CustomerListScreen} />
        <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
        <Stack.Screen name="ExpensesScreen" component={ExpenseListScreen} />

        {/* Receipts & Settings Screens */}
        <Stack.Screen name="ReceiptPreview" component={ReceiptPreviewScreen} />
        <Stack.Screen name="SettingsTab" component={SettingsScreen} />
        <Stack.Screen name="BackupRestore" component={BackupRestoreScreen} />
        <Stack.Screen name="PinSettings" component={PinSettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
