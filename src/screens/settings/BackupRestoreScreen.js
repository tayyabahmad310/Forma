/**
 * Local Backup & Restore Screen
 * Secure offline data archiving and disaster recovery.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import ScreenContainer from '../../components/common/ScreenContainer';
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
      if (!payload) return;

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
                  'Database records have been restored from your backup archive.',
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
              } catch (err) {
                Alert.alert('Restore Failed', err.message || 'Corrupt or incompatible backup file.');
              } finally {
                setRestoring(false);
              }
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Restore Error', err.message || 'Could not read backup file.');
    }
  };

  return (
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
      <Header
        title="Backup & Recovery"
        subtitle="Offline Data Vault & Archiving"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Export Card */}
        <Card style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="cloud-download-outline" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.cardTitle}>Export Backup Snapshot</Text>
          <Text style={styles.cardDesc}>
            Packages all products, inventory, transactions, expenses, customers, and store settings into an encrypted offline JSON archive.
          </Text>

          <Button
            title="Create & Share Backup (.json)"
            variant="primary"
            icon="share-outline"
            loading={exporting}
            onPress={handleExport}
            style={styles.actionBtn}
          />

          {lastExportResult && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.successText}>
                Last exported: {lastExportResult.filename} ({Math.round(lastExportResult.size / 1024)} KB)
              </Text>
            </View>
          )}
        </Card>

        {/* Restore Card */}
        <Card style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(197, 83, 62, 0.12)' }]}>
            <Ionicons name="refresh-outline" size={28} color={COLORS.danger} />
          </View>
          <Text style={styles.cardTitle}>Restore Database from Archive</Text>
          <Text style={styles.cardDesc}>
            Select a previously exported Clothio backup file from your device files, Google Drive, or SD card.
          </Text>

          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
            <Text style={styles.warningText}>
              Warning: Restoring will overwrite existing data with the contents of the chosen backup.
            </Text>
          </View>

          <Button
            title="Select Backup File to Restore"
            variant="outline"
            icon="folder-open-outline"
            loading={restoring}
            onPress={handleImportAndRestore}
            style={styles.actionBtn}
          />
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
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    textAlign: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  cardDesc: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  actionBtn: {
    width: '100%',
    borderRadius: RADIUS.pill,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 124, 89, 0.12)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
    width: '100%',
    gap: 8,
  },
  successText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.success,
    fontWeight: '600',
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 131, 36, 0.12)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    width: '100%',
    gap: 8,
  },
  warningText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.warning,
    flex: 1,
  },
});
