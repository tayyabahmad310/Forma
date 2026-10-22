/**
 * PIN Security Settings Screen
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
import { useAuth } from '../../context/AuthContext';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
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
    <SafeAreaView style={styles.safeArea}>
      <Header title="PIN Lock Security" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Warning Callout */}
        <Card style={styles.warningCard}>
          <View style={styles.warningRow}>
            <Ionicons name="shield-checkmark" size={24} color={COLORS.info} style={styles.warningIcon} />
            <View style={styles.warningInfo}>
              <Text style={styles.warningTitle}>Local Cryptographic Protection</Text>
              <Text style={styles.warningBody}>
                Your PIN is salted and hashed using SHA-256 in Android SecureStore. It protects financial transactions, prices, and customer balances from unauthorized access.
              </Text>
            </View>
          </View>
        </Card>

        {pinEnabled ? (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Disable PIN Protection</Text>
            <Text style={styles.cardSubtitle}>
              Enter your active PIN to turn off app lock protection.
            </Text>

            <Input
              label="Current 4-6 Digit PIN"
              value={currentPin}
              onChangeText={setCurrentPin}
              placeholder="••••"
              keyboardType="number-pad"
              secureTextEntry
            />

            <Button
              title="Disable PIN Security"
              variant="danger"
              loading={loading}
              onPress={handleDisablePin}
              style={styles.actionBtn}
            />
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Set New Application PIN</Text>
            <Text style={styles.cardSubtitle}>
              Create a 4 to 6 digit passcode required whenever Clothio launches.
            </Text>

            <Input
              label="New PIN (4-6 digits)"
              value={newPin}
              onChangeText={setNewPin}
              placeholder="••••"
              keyboardType="number-pad"
              secureTextEntry
            />

            <Input
              label="Confirm New PIN"
              value={confirmPin}
              onChangeText={setConfirmPin}
              placeholder="••••"
              keyboardType="number-pad"
              secureTextEntry
            />

            <Button
              title="Activate PIN Security"
              variant="primary"
              loading={loading}
              onPress={handleSetPin}
              style={styles.actionBtn}
            />
          </Card>
        )}
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
    backgroundColor: COLORS.infoLight,
    borderColor: COLORS.info,
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
    color: COLORS.infoText,
    marginBottom: 4,
  },
  warningBody: {
    ...TYPOGRAPHY.caption,
    color: COLORS.infoText,
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
    marginTop: SPACING.sm,
  },
});
