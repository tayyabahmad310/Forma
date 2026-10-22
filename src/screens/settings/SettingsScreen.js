/**
 * Application Settings & Database Diagnostics Screen
 * High-end boutique store preferences, currency configuration, and data integrity.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { checkDatabaseIntegrity, getDatabaseStats } from '../../database/queryUtils';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import ScreenContainer from '../../components/common/ScreenContainer';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const CURRENCIES = [
  { code: 'PKR', symbol: 'Rs' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'AED', symbol: 'AED' },
  { code: 'SAR', symbol: 'SAR' },
  { code: 'INR', symbol: '₹' },
];

export default function SettingsScreen({ navigation }) {
  const { settings, saveSettings, notifyDataChanged } = useApp();
  const { pinEnabled } = useAuth();

  const [businessName, setBusinessName] = useState(settings.business_name || '');
  const [businessPhone, setBusinessPhone] = useState(settings.business_phone || '');
  const [businessAddress, setBusinessAddress] = useState(settings.business_address || '');
  const [currencySymbol, setCurrencySymbol] = useState(settings.currency_symbol || 'Rs');
  const [receiptFooter, setReceiptFooter] = useState(settings.receipt_footer || '');
  const [minStockAlert, setMinStockAlert] = useState(settings.default_min_stock_alert || '5');

  const [saving, setSaving] = useState(false);
  const [integrityStatus, setIntegrityStatus] = useState(null);
  const [dbStats, setDbStats] = useState(null);

  useEffect(() => {
    (async () => {
      const stats = await getDatabaseStats();
      setDbStats(stats);
    })();
  }, []);

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await saveSettings({
        business_name: businessName.trim(),
        business_phone: businessPhone.trim(),
        business_address: businessAddress.trim(),
        currency_symbol: currencySymbol.trim(),
        receipt_footer: receiptFooter.trim(),
        default_min_stock_alert: minStockAlert.trim(),
      });
      notifyDataChanged();
      Alert.alert('Settings Saved', 'Boutique store preferences updated successfully.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRunIntegrityCheck = async () => {
    const res = await checkDatabaseIntegrity();
    setIntegrityStatus(res);
    const stats = await getDatabaseStats();
    setDbStats(stats);
    Alert.alert(
      res.ok ? 'Database Verified Healthy' : 'Database Warning',
      res.message
    );
  };

  const totalDbRows = dbStats ? Object.values(dbStats).reduce((a, b) => a + b, 0) : 0;

  return (
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
      <Header
        title="Store Settings"
        subtitle="Boutique Profile & System Controls"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Boutique Profile */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="storefront-outline" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Boutique Brand Profile</Text>
          </View>
          <Text style={styles.cardSubtitle}>Displayed on customer receipts, invoices and exports</Text>

          <Input
            label="Boutique Name"
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="e.g. Clothio Luxury Apparel"
          />

          <Input
            label="Contact Phone / WhatsApp"
            value={businessPhone}
            onChangeText={setBusinessPhone}
            placeholder="e.g. +92 300 1234567"
            keyboardType="phone-pad"
          />

          <Input
            label="Storefront Address"
            value={businessAddress}
            onChangeText={setBusinessAddress}
            placeholder="e.g. 14 Fashion Avenue, Gulberg III, Lahore"
          />

          {/* Currency Selector Pills */}
          <Text style={styles.fieldLabel}>Operating Currency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.currencyPills}>
            {CURRENCIES.map((c) => {
              const isSelected = currencySymbol === c.symbol;
              return (
                <TouchableOpacity
                  key={c.code}
                  style={[styles.currencyPill, isSelected && styles.currencyPillSelected]}
                  onPress={() => setCurrencySymbol(c.symbol)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.currencyCode, isSelected && styles.currencyCodeSelected]}>
                    {c.code}
                  </Text>
                  <Text style={[styles.currencySym, isSelected && styles.currencySymSelected]}>
                    {c.symbol}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="Custom Symbol"
                value={currencySymbol}
                onChangeText={setCurrencySymbol}
                placeholder="Rs"
              />
            </View>
            <View style={styles.col}>
              <Input
                label="Low Stock Alert"
                value={minStockAlert}
                onChangeText={setMinStockAlert}
                placeholder="5"
                keyboardType="number-pad"
              />
            </View>
          </View>

          <Input
            label="Receipt Tagline / Return Policy"
            value={receiptFooter}
            onChangeText={setReceiptFooter}
            placeholder="e.g. Items can be exchanged within 7 days with original tag."
            multiline
            numberOfLines={2}
          />

          <Button
            title="Save Brand Preferences"
            variant="primary"
            loading={saving}
            onPress={handleSaveProfile}
            style={styles.saveBtn}
          />
        </Card>

        {/* Security & Backup Shortcuts */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Security & Backup</Text>
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('PinSettings')}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Manager PIN Protection</Text>
              <Text style={styles.menuSubtitle}>
                {pinEnabled ? 'PIN Lock is currently active' : 'PIN Lock is disabled'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('BackupRestore')}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Local Backup & Data Export</Text>
              <Text style={styles.menuSubtitle}>
                Export offline database snapshot or restore
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* Database Health & Diagnostic Info */}
        <Card style={styles.card}>
          <View style={styles.diagHeader}>
            <View>
              <View style={styles.sectionHeader}>
                <Ionicons name="server-outline" size={20} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Offline SQLite Engine</Text>
              </View>
              <Text style={styles.cardSubtitle}>Zero-latency local storage with WAL journaling</Text>
            </View>
            <TouchableOpacity
              style={styles.verifyPillBtn}
              onPress={handleRunIntegrityCheck}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.primary} />
              <Text style={styles.verifyPillText}>Verify</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.diagStatsRow}>
            <View style={styles.diagStat}>
              <Text style={styles.diagLabel}>Total Records</Text>
              <Text style={styles.diagVal}>{totalDbRows.toLocaleString()}</Text>
            </View>
            <View style={styles.diagDivider} />
            <View style={styles.diagStat}>
              <Text style={styles.diagLabel}>Catalog Items</Text>
              <Text style={styles.diagVal}>
                {(dbStats?.products || 0) + (dbStats?.product_variants || 0)}
              </Text>
            </View>
            <View style={styles.diagDivider} />
            <View style={styles.diagStat}>
              <Text style={styles.diagLabel}>Sales Receipts</Text>
              <Text style={styles.diagVal}>{dbStats?.sales || 0}</Text>
            </View>
          </View>

          {integrityStatus && (
            <View
              style={[
                styles.integrityNotice,
                { backgroundColor: integrityStatus.ok ? 'rgba(74, 124, 89, 0.12)' : 'rgba(197, 83, 62, 0.12)' },
              ]}
            >
              <Text
                style={[
                  styles.integrityText,
                  { color: integrityStatus.ok ? COLORS.success : COLORS.danger },
                ]}
              >
                {integrityStatus.message}
              </Text>
            </View>
          )}

          <Text style={styles.appVersionText}>
            Clothio v1.0.0 • SQLite 3 WAL • 100% Offline Architecture
          </Text>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  card: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  cardSubtitle: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currencyPills: {
    gap: 8,
    paddingBottom: SPACING.md,
  },
  currencyPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  currencyPillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  currencyCode: {
    ...TYPOGRAPHY.captionSmall,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  currencyCodeSelected: {
    color: COLORS.textInverse,
  },
  currencySym: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  currencySymSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  col: {
    flex: 1,
  },
  saveBtn: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.pill,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  menuIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  menuSubtitle: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.xs,
  },
  diagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  verifyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primarySurface,
    borderWidth: 1,
    borderColor: 'rgba(91,36,19,0.15)',
  },
  verifyPillText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.primary,
    fontWeight: '700',
  },
  diagStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  diagStat: {
    flex: 1,
    alignItems: 'center',
  },
  diagLabel: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginBottom: 2,
  },
  diagVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  diagDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.borderLight,
  },
  integrityNotice: {
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginVertical: SPACING.xs,
  },
  integrityText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    textAlign: 'center',
  },
  appVersionText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
