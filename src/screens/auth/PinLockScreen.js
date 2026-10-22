/**
 * PIN Lock Screen
 * Displayed on launch and resume when PIN protection is enabled.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';

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
        // Attempt unlock if 4 or more digits
        const success = await unlock(nextPin);
        if (!success && nextPin.length === 6) {
          setError('Incorrect PIN. Please try again.');
          setPin('');
        }
      }
    }
  };

  const handleManualUnlockAttempt = async () => {
    if (pin.length >= 4) {
      const success = await unlock(pin);
      if (!success) {
        setError('Incorrect PIN. Please try again.');
        setPin('');
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.brandIcon}>
          <Ionicons name="lock-closed-outline" size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Clothio Business Security</Text>
        <Text style={styles.subtitle}>Enter your secure PIN to access records</Text>

        {/* PIN Dots */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                pin.length > idx && styles.dotFilled,
                error && styles.dotError,
              ]}
            />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        <View style={styles.keyRow}>
          {renderKey('1')}
          {renderKey('2')}
          {renderKey('3')}
        </View>
        <View style={styles.keyRow}>
          {renderKey('4')}
          {renderKey('5')}
          {renderKey('6')}
        </View>
        <View style={styles.keyRow}>
          {renderKey('7')}
          {renderKey('8')}
          {renderKey('9')}
        </View>
        <View style={styles.keyRow}>
          <TouchableOpacity
            style={styles.keyButton}
            onPress={handleManualUnlockAttempt}
            disabled={pin.length < 4}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={26}
              color={pin.length >= 4 ? COLORS.success : COLORS.textTertiary}
            />
          </TouchableOpacity>
          {renderKey('0')}
          {renderKey('backspace', 'backspace-outline')}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.warningText}>
          Offline security: PIN is verified locally. Keep your PIN in a secure place.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.xxxl,
  },
  brandIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.borderDark,
    marginHorizontal: SPACING.sm,
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
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  keypad: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: SPACING.xl,
  },
  warningText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
});
