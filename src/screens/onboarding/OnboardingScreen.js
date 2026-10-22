/**
 * Luxury Fashion Onboarding Carousel Screen
 * Directly mirrors the reference design: arched fashion cards, curated typography,
 * pill progress indicators, and warm terracotta "Let's Get Started" pill button.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import Button from '../../components/common/Button';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Curated Boutique Fashion\nfor Every Season',
    subtitle:
      'From everyday elegance to festive collections, manage your clothing sizes, colors, and stock with effortless simplicity.',
    iconMain: 'sparkles',
    iconSide1: 'shirt',
    iconSide2: 'rose',
    badge: 'COLLECTION 2026',
  },
  {
    id: '2',
    title: 'Swift & Reliable\nOffline POS Checkout',
    subtitle:
      'Ring up sales in seconds, select variants with a tap, apply custom discounts, and generate instant printable receipts.',
    iconMain: 'card',
    iconSide1: 'receipt',
    iconSide2: 'pricetag',
    badge: 'RAPID CHECKOUT',
  },
  {
    id: '3',
    title: 'Precision Profit & Loss\nWithout the Internet',
    subtitle:
      'Track real-time gross margins, supplier payables, customer credit ledgers, and inventory valuation 100% on your device.',
    iconMain: 'pie-chart',
    iconSide1: 'trending-up',
    iconSide2: 'shield-checkmark',
    badge: 'FINANCIAL ACCURACY',
  },
];

export default function OnboardingScreen({ onGetStarted }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      onGetStarted();
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const renderSlide = ({ item }) => {
    return (
      <View style={styles.slideContainer}>
        {/* Artistic Arched Fashion Illustration Collage */}
        <View style={styles.collageContainer}>
          {/* Main Arched Frame */}
          <View style={styles.mainArchFrame}>
            <View style={styles.archInner}>
              <Ionicons name={item.iconMain} size={48} color={COLORS.primary} />
              <View style={styles.collectionBadge}>
                <Text style={styles.collectionBadgeText}>{item.badge}</Text>
              </View>
            </View>
          </View>

          {/* Right Top Circular Frame */}
          <View style={styles.circleFrameTop}>
            <Ionicons name={item.iconSide1} size={30} color={COLORS.primaryDark} />
          </View>

          {/* Right Bottom Circular Frame */}
          <View style={styles.circleFrameBottom}>
            <Ionicons name={item.iconSide2} size={30} color={COLORS.primary} />
          </View>
        </View>

        {/* Text Section */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer backgroundColor={COLORS.background}>
      {/* Top Skip Header */}
      <View style={styles.header}>
        <View />
        <TouchableOpacity onPress={onGetStarted} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.skipText}>Skip Setup</Text>
        </TouchableOpacity>
      </View>

      {/* Slide Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        style={styles.carousel}
      />

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Pagination Dots */}
        <View style={styles.paginationRow}>
          {SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                currentIndex === idx ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {/* Primary Pill Button */}
        <Button
          title={currentIndex === SLIDES.length - 1 ? "Let's Get Started" : 'Continue'}
          onPress={handleNext}
          variant="primary"
          size="lg"
          style={styles.primaryButton}
        />

        {/* Sub-link */}
        <TouchableOpacity onPress={onGetStarted} style={styles.subLinkContainer}>
          <Text style={styles.subLinkText}>
            Ready to configure your store? <Text style={styles.subLinkBold}>Quick Setup</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    height: 44,
  },
  skipText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  carousel: {
    flex: 1,
  },
  slideContainer: {
    width,
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
  },
  collageContainer: {
    width: width - SPACING.xl * 2,
    height: 290,
    position: 'relative',
    marginVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainArchFrame: {
    position: 'absolute',
    left: 20,
    top: 10,
    width: 160,
    height: 250,
    borderRadius: 80,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: 6,
    ...SHADOWS.card,
  },
  archInner: {
    flex: 1,
    borderRadius: 74,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionBadge: {
    position: 'absolute',
    bottom: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  collectionBadgeText: {
    color: COLORS.textInverse,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  circleFrameTop: {
    position: 'absolute',
    right: 30,
    top: 20,
    width: 120,
    height: 120,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.bannerCard,
    borderWidth: 2,
    borderColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  circleFrameBottom: {
    position: 'absolute',
    right: 20,
    bottom: 25,
    width: 110,
    height: 110,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 2,
    borderColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.display,
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'center',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    color: COLORS.textSecondary,
    lineHeight: 21,
    paddingHorizontal: SPACING.sm,
  },
  bottomControls: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: RADIUS.pill,
  },
  activeDot: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: COLORS.borderDark,
  },
  primaryButton: {
    width: '100%',
    marginBottom: SPACING.sm,
  },
  subLinkContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  subLinkText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  subLinkBold: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
