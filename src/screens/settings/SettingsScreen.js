/**
 * Application Settings & Database Diagnostics Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { checkDatabaseIntegrity, getDatabaseStats } from '../../database/queryUtils';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function SettingsScreen({ navigation }) {
  const { settings, saveSettings } = useApp();
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
      Alert.alert('Saved', 'Store preferences updated successfully.');
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
      res.ok ? 'Database Healthy' : 'Database Warning',
      res.message
    );
  };

  const totalDbRows = dbStats ? Object.values(dbStats).reduce((a, b) => a + b, 0) : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Settings & Preferences" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Business Profile */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Clothing Store Profile</Text>
          <Text style={styles.cardSubtitle}>Appears on printed receipts and customer invoices</Text>

          <Input
            label="Business Name"
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="e.g. Clothio Apparel"
          />

          <Input
            label="Contact Phone"
            value={businessPhone}
            onChangeText={setBusinessPhone}
            placeholder="e.g. +92 300 1234567"
            keyboardType="phone-pad"
          />

          <Input
            label="Shop Address"
            value={businessAddress}
            onChangeText={setBusinessAddress}
            placeholder="e.g. Main Commercial Market, Lahore"
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="Currency Symbol"
                value={currencySymbol}
                onChangeText={setCurrencySymbol}
                placeholder="Rs"
              />
            </View>
            <View style={styles.col}>
              <Input
                label="Default Low Stock Threshold"
                value={minStockAlert}
                onChangeText={setMinStockAlert}
                placeholder="5"
                keyboardType="number-pad"
              />
            </View>
          </View>

          <Input
            label="Receipt Footer Note"
            value={receiptFooter}
            onChangeText={setReceiptFooter}
            placeholder="Return terms, thank you note, etc."
            multiline
            numberOfLines={2}
          />

          <Button
            title="Save Store Preferences"
            variant="primary"
            loading={saving}
            onPress={handleSaveProfile}
            style={styles.saveBtn}
          />
        </Card>

        {/* Security & Backup Shortcuts */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Data & Security</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('PinSettings')}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>App PIN Security</Text>
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
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Local Backup & Restore</Text>
              <Text style={styles.menuSubtitle}>
                Export offline database or restore from file
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* Database Health & Diagnostic Info */}
        <Card style={styles.card}>
          <View style={styles.diagHeader}>
            <View>
              <Text style={styles.cardTitle}>SQLite Storage Diagnostics</Text>
              <Text style={styles.cardSubtitle}>Offline Relational Database (WAL Mode)</Text>
            </View>
            <Button
              title="Verify Health"
              variant="outline"
              size="sm"
              onPress={handleRunIntegrityCheck}
            />
          </View>

          <View style={styles.diagStatsRow}>
            <View style={styles.diagStat}>
              <Text style={styles.diagLabel}>Total Records</Text>
              <Text style={styles.diagVal}>{totalDbRows.toLocaleString()}</Text>
            </View>
            <View style={styles.diagDivider} />
            <View style={styles.diagStat}>
              <Text style={styles.diagLabel}>Products & Variants</Text>
              <Text style={styles.diagVal}>
                {(dbStats?.products || 0) + (dbStats?.product_variants || 0)}
              </Text>
            </View>
            <View style={styles.diagDivider} />
            <View style={styles.diagStat}>
              <Text style={styles.diagLabel}>Sales Records</Text>
              <Text style={styles.diagVal}>{dbStats?.sales || 0}</Text>
            </View>
          </View>

          {integrityStatus && (
            <View
              style={[
                styles.integrityNotice,
                { backgroundColor: integrityStatus.ok ? COLORS.successLight : COLORS.dangerLight },
              ]}
            >
              <Text
                style={[
                  styles.integrityText,
                  { color: integrityStatus.ok ? COLORS.successText : COLORS.dangerText },
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  card: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  cardSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  saveBtn: {
    marginTop: SPACING.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  menuSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
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
  diagStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
  },
  diagStat: {
    flex: 1,
    alignItems: 'center',
  },
  diagLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
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
    borderRadius: RADIUS.sm,
    marginVertical: SPACING.xs,
  },
  integrityText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    textAlign: 'center',
  },
  appVersionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
