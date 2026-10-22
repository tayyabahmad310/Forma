/**
 * Universal Safe Screen Container
 * Ensures Android edge-to-edge does not clip status bar notifications or bottom navigation buttons.
 */

import React from 'react';
import { View, StyleSheet, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';

export default function ScreenContainer({
  children,
  style,
  topSafe = true,
  bottomSafe = true,
  backgroundColor = COLORS.background,
  statusBarStyle = 'dark-content',
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          paddingTop: topSafe ? insets.top : 0,
          paddingBottom: bottomSafe ? insets.bottom : 0,
        },
        style,
      ]}
    >
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={Platform.OS === 'android' ? 'transparent' : undefined}
        translucent={Platform.OS === 'android'}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
