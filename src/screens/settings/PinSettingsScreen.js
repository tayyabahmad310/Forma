/**
 * PIN Security Settings Screen
 * Manager access protection and PIN code configuration.
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
import { useAuth } from '../../context/AuthContext';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import ScreenContainer from '../../components/common/ScreenContainer';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function PinSettingsScreen({ navigation }) {
  const { pinEnabled, enableNewPin, disableCurrentPin } = useAuth();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetPin = async () => {
    if (newPin.length < 4 || newPin.length > 6) {
      Alert.alert('Invalid PIN', 'PIN must be between 4 and 6 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Mismatch', 'New PIN and Confirm PIN do not match.');
      return;
    }

    try {
      setLoading(true);
      await enableNewPin(newPin);
      setNewPin('');
      setConfirmPin('');
      Alert.alert('PIN Enabled', 'PIN lock security is now enabled for Clothio.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to set PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleDisablePin = async () => {
    if (!currentPin) {
      Alert.alert('Required', 'Please enter your current PIN to disable security.');
      return;
    }

    try {
      setLoading(true);
      await disableCurrentPin(currentPin);
      setCurrentPin('');
      Alert.alert('PIN Disabled', 'PIN lock security has been removed.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Incorrect PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
      <Header
        title="Security PIN"
        subtitle="App Locking & Access Control"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={[styles.statusIconCircle, pinEnabled && styles.statusIconCircleActive]}>
            <Ionicons
              name={pinEnabled ? 'shield-checkmark' : 'shield-outline'}
              size={32}
              color={pinEnabled ? COLORS.success : COLORS.textTertiary}
            />
          </View>
          <Text style={styles.statusTitle}>
            {pinEnabled ? 'PIN Protection Active' : 'No PIN Configured'}
          </Text>
          <Text style={styles.statusSubtitle}>
            {pinEnabled
              ? 'Clothio requires your security PIN to launch and open the POS register.'
              : 'Secure your boutique ledger, reports, and POS register with a 4 to 6 digit PIN.'}
          </Text>
        </Card>

        {/* Change or Set PIN */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>
            {pinEnabled ? 'Change Security PIN' : 'Create New Security PIN'}
          </Text>

          <Input
            label="New PIN (4-6 digits)"
            value={newPin}
            onChangeText={setNewPin}
            placeholder="••••"
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
          />

          <Input
            label="Confirm New PIN"
            value={confirmPin}
            onChangeText={setConfirmPin}
            placeholder="••••"
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
          />

          <Button
            title={pinEnabled ? 'Update PIN' : 'Enable PIN Protection'}
            variant="primary"
            loading={loading}
            onPress={handleSetPin}
            style={styles.btn}
          />
        </Card>

        {/* Disable PIN */}
        {pinEnabled && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Disable PIN Security</Text>
            <Text style={styles.cardSubtitle}>
              Enter your current PIN to turn off lock screen protection.
            </Text>

            <Input
              label="Current PIN"
              value={currentPin}
              onChangeText={setCurrentPin}
              placeholder="••••"
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
            />

            <Button
              title="Turn Off PIN Protection"
              variant="outline"
              loading={loading}
              onPress={handleDisablePin}
              style={styles.btn}
            />
          </Card>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  statusCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
  },
  statusIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  statusIconCircleActive: {
    backgroundColor: 'rgba(74, 124, 89, 0.12)',
  },
  statusTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  statusSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  cardSubtitle: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginBottom: SPACING.md,
  },
  btn: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.pill,
  },
});
