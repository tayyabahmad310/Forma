/**
 * Reusable Card Component
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';

export default function Card({
  children,
  onPress = null,
  style = null,
  elevated = true,
}) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[
        styles.card,
        elevated ? SHADOWS.card : styles.outline,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  outline: {
    borderColor: COLORS.border,
    elevation: 0,
    shadowOpacity: 0,
  },
});
