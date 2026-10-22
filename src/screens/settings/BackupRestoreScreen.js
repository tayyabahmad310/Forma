/**
 * Local Backup & Restore Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import {
  exportDatabaseBackup,
  pickBackupFile,
  restoreDatabaseBackup,
} from '../../services/backupService';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function BackupRestoreScreen({ navigation }) {
  const { notifyDataChanged } = useApp();

  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [lastExportResult, setLastExportResult] = useState(null);

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await exportDatabaseBackup();
      setLastExportResult(res);
      Alert.alert(
        'Backup Exported',
        `Database backup saved successfully as "${res.filename}". You can share or save it to your phone storage.`
      );
    } catch (err) {
      Alert.alert('Export Error', err.message || 'Failed to export backup file.');
    } finally {
      setExporting(false);
    }
  };

  const handleImportAndRestore = async () => {
    try {
      const payload = await pickBackupFile();
      if (!payload) return; // cancelled

      const totalItems = Object.values(payload.record_counts || {}).reduce((a, b) => a + b, 0);

      Alert.alert(
        'Confirm Full Database Restore',
        `You are about to restore a Clothio backup created on ${new Date(payload.exported_at).toLocaleString()}.\n\nThis archive contains ${totalItems} business records.\n\nAll existing records will be replaced. This action cannot be undone. Proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore Database',
            style: 'destructive',
            onPress: async () => {
              try {
                setRestoring(true);
                await restoreDatabaseBackup(payload);
                notifyDataChanged();
                Alert.alert(
                  'Restore Successful',
                  'Database has been atomically restored and verified. All inventory, sales, and settings are updated.',
                  [{ text: 'OK', onPress: () => navigation.navigate('DashboardTab') }]
                );
              } catch (restoreErr) {
                Alert.alert('Restore Failed', restoreErr.message || 'Database restore failed.');
              } finally {
                setRestoring(false);
              }
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('File Error', err.message || 'Could not process backup file.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Local Backup & Restore" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Warning Callout */}
        <Card style={styles.warningCard}>
          <View style={styles.warningRow}>
            <Ionicons name="information-circle" size={24} color={COLORS.warning} style={styles.warningIcon} />
            <View style={styles.warningInfo}>
              <Text style={styles.warningTitle}>100% Offline Storage Notice</Text>
              <Text style={styles.warningBody}>
                All business records, sales receipts, and stock history reside exclusively on this physical phone. Uninstalling the app or factory resetting your device will permanently erase data unless you maintain regular exported backups.
              </Text>
            </View>
          </View>
        </Card>

        {/* Export Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Export Backup Archive</Text>
          <Text style={styles.cardSubtitle}>
            Creates a self-contained, versioned JSON backup of all clothing inventory, variants, purchase orders, sales invoices, payments, returns, and business settings.
          </Text>

          <Button
            title="Export & Save Backup File"
            variant="primary"
            icon="download-outline"
            loading={exporting}
            onPress={handleExport}
            style={styles.actionBtn}
          />

          {lastExportResult && (
            <View style={styles.exportSuccessBox}>
              <Text style={styles.exportSuccessTitle}>Recent Backup Created:</Text>
              <Text style={styles.exportSuccessFilename}>{lastExportResult.filename}</Text>
            </View>
          )}
        </Card>

        {/* Restore Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Restore from Backup File</Text>
          <Text style={styles.cardSubtitle}>
            Select a previously exported Clothio backup file. The system will validate the schema version and integrity before safely restoring records atomically.
          </Text>

          <Button
            title="Select Backup File & Restore"
            variant="outline"
            icon="folder-open-outline"
            loading={restoring}
            onPress={handleImportAndRestore}
            style={styles.actionBtn}
          />
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
  warningCard: {
    padding: SPACING.md,
    backgroundColor: COLORS.warningLight,
    borderColor: COLORS.warning,
    marginBottom: SPACING.lg,
  },
  warningRow: {
    flexDirection: 'row',
  },
  warningIcon: {
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  warningInfo: {
    flex: 1,
  },
  warningTitle: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.warningText,
    marginBottom: 4,
  },
  warningBody: {
    ...TYPOGRAPHY.caption,
    color: COLORS.warningText,
    lineHeight: 16,
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
    marginTop: 4,
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: SPACING.xs,
  },
  exportSuccessBox: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.sm,
  },
  exportSuccessTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  exportSuccessFilename: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
