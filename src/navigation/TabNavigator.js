/**
 * Bottom Tab Navigator
 * Inspired by clothing store aesthetics with custom styled tab bar.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../constants/theme';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ProductListScreen from '../screens/products/ProductListScreen';
import PosScreen from '../screens/pos/PosScreen';
import PurchaseListScreen from '../screens/purchases/PurchaseListScreen';
import FinancialReportsScreen from '../screens/reports/FinancialReportsScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="ProductsTab"
        component={ProductListScreen}
        options={{
          tabBarLabel: 'Inventory',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'shirt' : 'shirt-outline'} size={22} color={color} />
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
              <Ionicons name="cash" size={22} color={COLORS.textInverse} />
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
            <Ionicons name={focused ? 'cart' : 'cart-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="ReportsTab"
        component={FinancialReportsScreen}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} size={22} color={color} />
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
    borderTopColor: COLORS.borderLight,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
  },
  tabLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  posTabIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  posTabIconActive: {
    backgroundColor: COLORS.accent,
  },
});
