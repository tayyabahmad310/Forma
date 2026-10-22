/**
 * Animated Boutique Splash Screen
 * Elegant brand monogram, smooth scale and fade transition.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants/theme';

export default function SplashScreen({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(subtitleFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(800),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onFinish) onFinish();
    });
  }, [fadeAnim, scaleAnim, subtitleFade, onFinish]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} translucent />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Monogram Badge */}
        <View style={styles.monogramContainer}>
          <Ionicons name="sparkles" size={32} color={COLORS.primaryLight} style={styles.sparkleIcon} />
          <Text style={styles.monogram}>C</Text>
        </View>

        <Text style={styles.brandTitle}>CLOTHIO</Text>
        <Text style={styles.brandSubtitle}>BOUTIQUE & APPAREL POS</Text>

        <Animated.View style={[styles.taglineWrapper, { opacity: subtitleFade }]}>
          <View style={styles.divider} />
          <Text style={styles.tagline}>Curated Fashion • Offline Management</Text>
          <View style={styles.divider} />
        </Animated.View>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>100% Offline • Local SQLite Engine</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  monogramContainer: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    position: 'relative',
    shadowColor: COLORS.primaryLight,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  sparkleIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  monogram: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.textInverse,
    letterSpacing: -1,
  },
  brandTitle: {
    ...TYPOGRAPHY.display,
    color: COLORS.textInverse,
    letterSpacing: 4,
    marginBottom: SPACING.xs,
  },
  brandSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primaryLight,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: SPACING.xxl,
  },
  taglineWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  divider: {
    width: 24,
    height: 1,
    backgroundColor: COLORS.secondaryMuted,
  },
  tagline: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginHorizontal: SPACING.md,
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: SPACING.xxl,
  },
  footerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.secondaryMuted,
    letterSpacing: 0.5,
  },
});
