/**
 * Luxury Fashion Input Component
 * Elegant boutique form input with soft warm surface, label, error state, and icon slots.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error = null,
  helperText = null,
  leftIcon = null,
  rightIcon = null,
  onRightIconPress = null,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  editable = true,
  style,
  inputStyle,
  rounded = false,
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          rounded && styles.roundedContainer,
          multiline && styles.multilineContainer,
          isFocused && styles.focusedContainer,
          error && styles.errorContainer,
          !editable && styles.disabledContainer,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={isFocused ? COLORS.primary : COLORS.textTertiary}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          style={[
            styles.input,
            multiline && styles.multilineInput,
            !editable && styles.disabledInput,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textTertiary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.rightIcon}
          >
            <Ionicons
              name={rightIcon}
              size={18}
              color={error ? COLORS.danger : COLORS.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: SPACING.lg,
    minHeight: 48,
  },
  roundedContainer: {
    borderRadius: RADIUS.pill,
  },
  multilineContainer: {
    alignItems: 'flex-start',
    paddingVertical: SPACING.md,
    minHeight: 90,
  },
  focusedContainer: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  errorContainer: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
  },
  disabledContainer: {
    opacity: 0.6,
  },
  leftIcon: {
    marginRight: SPACING.md,
  },
  rightIcon: {
    marginLeft: SPACING.md,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  multilineInput: {
    textAlignVertical: 'top',
  },
  disabledInput: {
    color: COLORS.textTertiary,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    marginTop: SPACING.xs,
  },
  helperText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
});
