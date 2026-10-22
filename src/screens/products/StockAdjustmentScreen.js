/**
 * Stock Adjustment & Movement History Screen
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { adjustVariantStock, getVariantById } from '../../repositories/productRepository';
import { getStockMovementsPaginated } from '../../repositories/stockMovementRepository';
import { MOVEMENT_TYPES } from '../../constants/config';
import { formatDate } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

const ADJUSTMENT_OPTIONS = [
  { id: MOVEMENT_TYPES.DAMAGE, label: 'Damaged Goods (-)' },
  { id: MOVEMENT_TYPES.LOST, label: 'Lost / Shoplifted (-)' },
  { id: MOVEMENT_TYPES.ADJUSTMENT, label: 'Correction / Audit (±)' },
];

export default function StockAdjustmentScreen({ route, navigation }) {
  const { notifyDataChanged } = useApp();
  const productId = route.params?.productId;
  const variantId = route.params?.variantId;
  const variantTitle = route.params?.variantTitle || 'Clothing Item';
  const showHistoryOnly = route.params?.showHistoryOnly || false;

  const [currentStock, setCurrentStock] = useState(route.params?.currentStock || 0);
  const [selectedType, setSelectedType] = useState(MOVEMENT_TYPES.DAMAGE);
  const [quantity, setQuantity] = useState('');
  const [isAdd, setIsAdd] = useState(false); // for correction: add vs deduct
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [movements, setMovements] = useState([]);

  const loadData = useCallback(async () => {
    try {
      if (variantId) {
        const v = await getVariantById(variantId);
        if (v) setCurrentStock(v.current_stock);
      }
      const history = await getStockMovementsPaginated({
        productId,
        variantId,
        limit: 25,
      });
      setMovements(history);
    } catch (err) {
      console.warn('Error loading stock movement history:', err);
    }
  }, [productId, variantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdjust = async () => {
    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid positive number for quantity.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please enter an audit reason for this manual stock change.');
      return;
    }

    let delta = 0;
    if (selectedType === MOVEMENT_TYPES.DAMAGE || selectedType === MOVEMENT_TYPES.LOST) {
      delta = -qtyNum;
    } else {
      delta = isAdd ? qtyNum : -qtyNum;
    }

    if (currentStock + delta < 0) {
      Alert.alert('Insufficient Stock', `Stock cannot become negative. Available stock: ${currentStock}`);
      return;
    }

    try {
      setSubmitting(true);
      await adjustVariantStock({
        variantId,
        quantityChange: delta,
        movementType: selectedType,
        reason: reason.trim(),
      });

      notifyDataChanged();
      Alert.alert('Success', 'Stock adjustment recorded successfully.');
      setQuantity('');
      setReason('');
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to record adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={showHistoryOnly ? 'Movement History' : 'Adjust Stock'}
        subtitle={variantTitle}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {!showHistoryOnly && variantId && (
          <Card style={styles.formCard}>
            <View style={styles.stockNoticeBox}>
              <Text style={styles.stockNoticeLabel}>Current Available Stock</Text>
              <Text style={styles.stockNoticeVal}>{currentStock} Units</Text>
            </View>

            <Text style={styles.fieldLabel}>Adjustment Category</Text>
            <View style={styles.typeRow}>
              {ADJUSTMENT_OPTIONS.map((opt) => {
                const isSelected = selectedType === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.typeButton, isSelected && styles.typeButtonSelected]}
                    onPress={() => setSelectedType(opt.id)}
                  >
                    <Text style={[styles.typeButtonText, isSelected && styles.typeButtonTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedType === MOVEMENT_TYPES.ADJUSTMENT && (
              <View style={styles.directionToggle}>
                <TouchableOpacity
                  style={[styles.dirBtn, isAdd && styles.dirBtnActive]}
                  onPress={() => setIsAdd(true)}
                >
                  <Text style={[styles.dirText, isAdd && styles.dirTextActive]}>+ Add Stock</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dirBtn, !isAdd && styles.dirBtnActive]}
                  onPress={() => setIsAdd(false)}
                >
                  <Text style={[styles.dirText, !isAdd && styles.dirTextActive]}>- Deduct Stock</Text>
                </TouchableOpacity>
              </View>
            )}

            <Input
              label="Quantity to Adjust"
              value={quantity}
              onChangeText={setQuantity}
              placeholder="e.g. 2"
              keyboardType="number-pad"
            />

            <Input
              label="Reason / Audit Note *"
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Stained collar discovered during weekly inventory check"
              multiline
              numberOfLines={2}
            />

            <Button
              title="Confirm Stock Adjustment"
              variant="primary"
              loading={submitting}
              onPress={handleAdjust}
              style={styles.submitBtn}
            />
          </Card>
        )}

        {/* Movement History Audit Log */}
        <Text style={styles.historyTitle}>Audit Movement History</Text>

        {movements.length === 0 ? (
          <Text style={styles.emptyText}>No stock movements recorded yet.</Text>
        ) : (
          movements.map((m) => {
            const isPositive = m.quantity_change > 0;
            return (
              <Card key={m.id} style={styles.movementCard}>
                <View style={styles.movementRow}>
                  <View style={styles.movementLeft}>
                    <View style={styles.badgeRow}>
                      <Badge
                        label={m.movement_type}
                        variant={
                          m.movement_type === 'PURCHASE' || m.movement_type === 'RETURN'
                            ? 'success'
                            : m.movement_type === 'SALE'
                            ? 'info'
                            : 'warning'
                        }
                        size="sm"
                      />
                      <Text style={styles.dateText}>{formatDate(m.created_at, true)}</Text>
                    </View>

                    <Text style={styles.variantInfo}>
                      {m.product_name} ({m.size} / {m.color})
                    </Text>

                    {m.reason ? <Text style={styles.reasonText}>{m.reason}</Text> : null}
                  </View>

                  <View style={styles.movementRight}>
                    <Text
                      style={[
                        styles.changeText,
                        isPositive ? styles.changePos : styles.changeNeg,
                      ]}
                    >
                      {isPositive ? `+${m.quantity_change}` : m.quantity_change}
                    </Text>
                    <Text style={styles.balanceText}>Balance: {m.balance_after}</Text>
                  </View>
                </View>
              </Card>
            );
          })
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
  formCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  stockNoticeBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  stockNoticeLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  stockNoticeVal: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
  },
  fieldLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  typeRow: {
    marginBottom: SPACING.md,
  },
  typeButton: {
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeButtonSelected: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
  },
  typeButtonTextSelected: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  directionToggle: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  dirBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.sm,
    marginRight: 6,
  },
  dirBtnActive: {
    backgroundColor: COLORS.primary,
  },
  dirText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
  },
  dirTextActive: {
    color: COLORS.textInverse,
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: SPACING.sm,
  },
  historyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  emptyText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  movementCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  movementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  movementLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginLeft: SPACING.sm,
  },
  variantInfo: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  reasonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  movementRight: {
    alignItems: 'flex-end',
  },
  changeText: {
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
  },
  changePos: {
    color: COLORS.success,
  },
  changeNeg: {
    color: COLORS.danger,
  },
  balanceText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
});
