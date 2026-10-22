/**
 * Luxury Fashion Bottom Tab Navigator
 * Floating pill-styled navigation bar with safe-area protection for Android & iOS.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../constants/theme';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ProductListScreen from '../screens/products/ProductListScreen';
import PosScreen from '../screens/pos/PosScreen';
import PurchaseListScreen from '../screens/purchases/PurchaseListScreen';
import FinancialReportsScreen from '../screens/reports/FinancialReportsScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 16);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 60 + bottomPadding,
            paddingBottom: bottomPadding,
          },
        ],
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={21} color={color} />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="ProductsTab"
        component={ProductListScreen}
        options={{
          tabBarLabel: 'Inventory',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons name={focused ? 'shirt' : 'shirt-outline'} size={21} color={color} />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="POSTab"
        component={PosScreen}
        options={{
          tabBarLabel: 'POS',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.posTabIcon, focused && styles.posTabIconActive]}>
              <Ionicons name="card" size={20} color={COLORS.textInverse} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="PurchasesTab"
        component={PurchaseListScreen}
        options={{
          tabBarLabel: 'Purchases',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons name={focused ? 'bag-handle' : 'bag-handle-outline'} size={21} color={color} />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="ReportsTab"
        component={FinancialReportsScreen}
        options={{
          tabBarLabel: 'Analytics',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} size={21} color={color} />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    ...SHADOWS.card,
  },
  tabItem: {
    paddingVertical: 2,
  },
  tabLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    marginTop: 2,
  },
  posTabIcon: {
    width: 42,
    height: 38,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.subtle,
  },
  posTabIconActive: {
    backgroundColor: COLORS.primary,
  },
});
