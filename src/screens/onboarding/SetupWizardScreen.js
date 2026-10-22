/**
 * First-Launch Boutique Setup Wizard
 * Empowers the store owner to name their boutique, select currency,
 * and choose between a pristine blank store or exploring sample fashion inventory.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import Header from '../../components/common/Header';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { updateMultipleSettings } from '../../repositories/settingsRepository';
import { createProduct } from '../../repositories/productRepository';
import { createPurchase } from '../../repositories/purchaseRepository';

const CURRENCIES = [
  { code: 'PKR', symbol: 'Rs', label: 'PKR (Rs)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'AED', symbol: 'د.إ', label: 'AED (د.إ)' },
  { code: 'SAR', symbol: '﷼', label: 'SAR (﷼)' },
  { code: 'CAD', symbol: '$', label: 'CAD ($)' },
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
];

export default function SetupWizardScreen({ onComplete, onBack }) {
  const { refreshSettings } = useApp();

  const [businessName, setBusinessName] = useState('My Boutique');
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [startMode, setStartMode] = useState('clean'); // 'clean' | 'sample'
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    if (!businessName.trim()) {
      Alert.alert('Store Name Required', 'Please provide a name for your boutique.');
      return;
    }

    setLoading(true);
    try {
      // 1. Save business profile and mark onboarding as complete
      await updateMultipleSettings({
        business_name: businessName.trim(),
        currency_code: selectedCurrency.code,
        currency_symbol: selectedCurrency.symbol,
        business_phone: phone.trim() || '+92 300 0000000',
        business_address: address.trim() || 'Store Location',
        onboarding_completed: 'true',
      });

      // 2. If user chose to explore with sample data, seed a small curated hijab & boutique collection
      if (startMode === 'sample') {
        await seedSampleFashionCollection(selectedCurrency.symbol);
      }

      await refreshSettings();
      onComplete();
    } catch (err) {
      console.error('Setup error:', err);
      Alert.alert('Configuration Error', 'Failed to save store profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer backgroundColor={COLORS.background}>
      <Header
        title="Store Configuration"
        subtitle="Step 2 of 2 • Boutique Setup"
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introBox}>
          <Text style={styles.introTitle}>Welcome to your boutique</Text>
          <Text style={styles.introSubtitle}>
            Configure your local offline business details. You can change these anytime in Settings.
          </Text>
        </View>

        {/* Store Name Input */}
        <Input
          label="Boutique / Store Name"
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="e.g. Bella Hijab & Boutique"
          leftIcon="business-outline"
        />

        {/* Currency Selector */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>Store Currency</Text>
          <View style={styles.currencyPillGrid}>
            {CURRENCIES.map((curr) => {
              const isSelected = selectedCurrency.code === curr.code;
              return (
                <TouchableOpacity
                  key={curr.code}
                  style={[
                    styles.currencyPill,
                    isSelected && styles.currencyPillActive,
                  ]}
                  onPress={() => setSelectedCurrency(curr)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.currencyPillText,
                      isSelected && styles.currencyPillTextActive,
                    ]}
                  >
                    {curr.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Contact Info */}
        <Input
          label="Store Phone (Printed on Receipts)"
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. +92 321 9876543"
          keyboardType="phone-pad"
          leftIcon="call-outline"
        />

        <Input
          label="Store Address"
          value={address}
          onChangeText={setAddress}
          placeholder="e.g. Main Commercial Plaza, Shop #12"
          leftIcon="location-outline"
        />

        {/* Starting Mode Choice */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>Starting Inventory</Text>

          {/* Option A: Clean Slate */}
          <TouchableOpacity
            style={[
              styles.modeCard,
              startMode === 'clean' && styles.modeCardActive,
            ]}
            onPress={() => setStartMode('clean')}
            activeOpacity={0.8}
          >
            <View style={styles.modeCardHeader}>
              <View style={[styles.radioCircle, startMode === 'clean' && styles.radioCircleActive]}>
                {startMode === 'clean' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.modeTextContainer}>
                <Text style={styles.modeTitle}>Clean Slate (Pristine Store)</Text>
                <Text style={styles.modeSubtitle}>
                  Zero products, zero demo records. Ready immediately for adding your real clothing items.
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Option B: Sample Boutique Collection */}
          <TouchableOpacity
            style={[
              styles.modeCard,
              startMode === 'sample' && styles.modeCardActive,
            ]}
            onPress={() => setStartMode('sample')}
            activeOpacity={0.8}
          >
            <View style={styles.modeCardHeader}>
              <View style={[styles.radioCircle, startMode === 'sample' && styles.radioCircleActive]}>
                {startMode === 'sample' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.modeTextContainer}>
                <Text style={styles.modeTitle}>Explore with Sample Hijab & Fashion Collection</Text>
                <Text style={styles.modeSubtitle}>
                  Pre-loads 4 curated items (Trendy Hijab, Silk Abaya, Linen Kurti, Modest Dress) with sizes & colors to test POS.
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <Button
          title="Launch My Boutique"
          onPress={handleFinish}
          variant="primary"
          size="lg"
          loading={loading}
          style={styles.launchButton}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

// Helper to seed a small boutique collection if user requests demo mode
async function seedSampleFashionCollection(symbol) {
  try {
    const p1 = await createProduct({
      name: 'Shayla Hijab - Trendy',
      sku: 'HJB-001',
      category_id: 1,
      cost_price: 1200,
      selling_price: 2400,
      min_stock_alert: 5,
      variants: [
        { size: 'M', color: 'Olive Green', sku: 'HJB-001-OLV', cost_price: 1200, selling_price: 2400 },
        { size: 'L', color: 'Camel', sku: 'HJB-001-CML', cost_price: 1200, selling_price: 2400 },
        { size: 'M', color: 'Black', sku: 'HJB-001-BLK', cost_price: 1200, selling_price: 2400 },
      ],
    });

    const p2 = await createProduct({
      name: 'Silk Hijab - Premium Edition',
      sku: 'SLK-002',
      category_id: 1,
      cost_price: 1800,
      selling_price: 3500,
      min_stock_alert: 4,
      variants: [
        { size: 'Free Size', color: 'Dusty Pink', sku: 'SLK-002-PNK', cost_price: 1800, selling_price: 3500 },
        { size: 'Free Size', color: 'Navy Blue', sku: 'SLK-002-NVY', cost_price: 1800, selling_price: 3500 },
      ],
    });

    const p3 = await createProduct({
      name: 'Abaya - Elegance in Simplicity',
      sku: 'ABY-003',
      category_id: 4,
      cost_price: 3500,
      selling_price: 6500,
      min_stock_alert: 3,
      variants: [
        { size: 'S', color: 'Charcoal Grey', sku: 'ABY-003-S', cost_price: 3500, selling_price: 6500 },
        { size: 'M', color: 'Charcoal Grey', sku: 'ABY-003-M', cost_price: 3500, selling_price: 6500 },
        { size: 'L', color: 'Charcoal Grey', sku: 'ABY-003-L', cost_price: 3500, selling_price: 6500 },
      ],
    });

    const p4 = await createProduct({
      name: 'Trendy Long Shirt - Modest',
      sku: 'SHR-004',
      category_id: 1,
      cost_price: 2200,
      selling_price: 4200,
      min_stock_alert: 5,
      variants: [
        { size: 'S', color: 'White', sku: 'SHR-004-WHT-S', cost_price: 2200, selling_price: 4200 },
        { size: 'M', color: 'White', sku: 'SHR-004-WHT-M', cost_price: 2200, selling_price: 4200 },
      ],
    });

    // Create an initial purchase batch so stock is available to sell right away in POS!
    if (p1?.variants?.[0]?.id) {
      await createPurchase({
        supplier_id: null,
        invoice_no: 'INIT-STOCK-001',
        notes: 'Initial Sample Stock Batch',
        items: [
          { variant_id: p1.variants[0].id, quantity: 15, unit_cost: 1200 },
          { variant_id: p1.variants[1].id, quantity: 12, unit_cost: 1200 },
          { variant_id: p1.variants[2].id, quantity: 20, unit_cost: 1200 },
          { variant_id: p2.variants[0].id, quantity: 10, unit_cost: 1800 },
          { variant_id: p3.variants[0].id, quantity: 8, unit_cost: 3500 },
          { variant_id: p4.variants[0].id, quantity: 10, unit_cost: 2200 },
        ],
        amount_paid: 80000,
      });
    }
  } catch (e) {
    console.warn('Sample seeding notice:', e);
  }
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl * 2,
  },
  introBox: {
    marginBottom: SPACING.xl,
  },
  introTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  introSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  sectionContainer: {
    marginBottom: SPACING.xl,
  },
  sectionLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currencyPillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  currencyPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  currencyPillActive: {
    backgroundColor: COLORS.primarySurface,
    borderColor: COLORS.primary,
  },
  currencyPillText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  currencyPillTextActive: {
    color: COLORS.primary,
  },
  modeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    ...SHADOWS.subtle,
  },
  modeCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySurface,
  },
  modeCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    borderColor: COLORS.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    marginTop: 2,
  },
  radioCircleActive: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
  },
  modeTextContainer: {
    flex: 1,
  },
  modeTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  modeSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  launchButton: {
    marginTop: SPACING.md,
  },
});
