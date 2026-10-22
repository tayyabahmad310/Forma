/**
 * PIN Lock Screen
 * Displayed on launch and resume when PIN protection is enabled.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import ScreenContainer from '../../components/common/ScreenContainer';

export default function PinLockScreen() {
  const { unlock } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleKeyPress = async (key) => {
    setError('');
    if (key === 'backspace') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    if (pin.length < 6) {
      const nextPin = pin + key;
      setPin(nextPin);

      if (nextPin.length >= 4) {
        const success = await unlock(nextPin);
        if (!success && nextPin.length === 6) {
          setError('Incorrect PIN. Please try again.');
          setPin('');
        }
      }
    }
  };

  const renderKey = (val, icon = null) => {
    return (
      <TouchableOpacity
        key={val}
        style={styles.keyButton}
        onPress={() => handleKeyPress(val)}
        activeOpacity={0.7}
      >
        {icon ? (
          <Ionicons name={icon} size={24} color={COLORS.textPrimary} />
        ) : (
          <Text style={styles.keyText}>{val}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.brandIconCircle}>
            <Ionicons name="lock-closed" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Clothio Security</Text>
          <Text style={styles.subtitle}>Enter boutique manager PIN to unlock</Text>

          {/* PIN Dots */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx < pin.length && styles.dotFilled,
                  error ? styles.dotError : null,
                ]}
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        {/* Numpad */}
        <View style={styles.keypad}>
          <View style={styles.keyRow}>
            {['1', '2', '3'].map((k) => renderKey(k))}
          </View>
          <View style={styles.keyRow}>
            {['4', '5', '6'].map((k) => renderKey(k))}
          </View>
          <View style={styles.keyRow}>
            {['7', '8', '9'].map((k) => renderKey(k))}
          </View>
          <View style={styles.keyRow}>
            <View style={styles.emptyKey} />
            {renderKey('0')}
            {renderKey('backspace', 'backspace-outline')}
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  brandIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: SPACING.md,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dotError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.danger,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  keypad: {
    marginBottom: SPACING.xl,
    gap: 14,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    gap: 14,
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.xs,
  },
  keyText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
  },
  emptyKey: {
    width: 72,
    height: 72,
  },
});
