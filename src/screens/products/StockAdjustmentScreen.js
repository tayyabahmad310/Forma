/**
 * Stock Adjustment & Movement History Screen
 * Safe-area aware boutique inventory auditing interface.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { adjustVariantStock, getVariantById } from '../../repositories/productRepository';
import { getStockMovementsPaginated } from '../../repositories/stockMovementRepository';
import { MOVEMENT_TYPES } from '../../constants/config';
import { formatDate } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import ScreenContainer from '../../components/common/ScreenContainer';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

const ADJUSTMENT_OPTIONS = [
  { id: MOVEMENT_TYPES.DAMAGE, label: 'Damaged (-)' },
  { id: MOVEMENT_TYPES.LOST, label: 'Lost/Theft (-)' },
  { id: MOVEMENT_TYPES.ADJUSTMENT, label: 'Audit Count (±)' },
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
  const [isAdd, setIsAdd] = useState(false);
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
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
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
                    activeOpacity={0.8}
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
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dirText, isAdd && styles.dirTextActive]}>+ Add Stock</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dirBtn, !isAdd && styles.dirBtnActive]}
                  onPress={() => setIsAdd(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dirText, !isAdd && styles.dirTextActive]}>- Deduct Stock</Text>
                </TouchableOpacity>
              </View>
            )}

            <Input
              label="Quantity to Adjust *"
              value={quantity}
              onChangeText={setQuantity}
              placeholder="e.g. 2"
              keyboardType="number-pad"
            />

            <Input
              label="Audit Reason / Note *"
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Minor tear found during hanger inspection"
            />

            <Button
              title="Apply Stock Adjustment"
              variant="primary"
              loading={submitting}
              onPress={handleAdjust}
              style={styles.submitBtn}
            />
          </Card>
        )}

        {/* Audit Log / History List */}
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Movement Log</Text>
          <Text style={styles.historyCount}>{movements.length} events logged</Text>
        </View>

        {movements.length > 0 ? (
          movements.map((m) => {
            const isPos = m.quantity_change > 0;
            return (
              <Card key={m.id} style={styles.movementCard}>
                <View style={styles.movementRow}>
                  <View style={styles.movementLeft}>
                    <View style={styles.typeBadgeRow}>
                      <Badge
                        label={m.movement_type.toUpperCase()}
                        variant={isPos ? 'success' : 'default'}
                      />
                      <Text style={styles.movementDate}>{formatDate(m.created_at)}</Text>
                    </View>
                    <Text style={styles.movementTitle}>
                      {m.product_name} ({m.size}/{m.color})
                    </Text>
                    {m.reason ? <Text style={styles.reasonText}>"{m.reason}"</Text> : null}
                  </View>

                  <View style={styles.movementRight}>
                    <Text style={[styles.deltaVal, isPos ? styles.deltaPositive : styles.deltaNegative]}>
                      {isPos ? `+${m.quantity_change}` : m.quantity_change}
                    </Text>
                    <Text style={styles.afterStock}>bal: {m.stock_after}</Text>
                  </View>
                </View>
              </Card>
            );
          })
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="time-outline" size={32} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>No inventory movements recorded yet.</Text>
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
  formCard: {
    marginBottom: SPACING.xl,
    padding: SPACING.lg,
  },
  stockNoticeBox: {
    backgroundColor: COLORS.primarySurface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(91,36,19,0.12)',
  },
  stockNoticeLabel: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stockNoticeVal: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    fontWeight: '800',
    marginTop: 2,
  },
  fieldLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.md,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  typeButtonTextSelected: {
    color: COLORS.textInverse,
  },
  directionToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.pill,
    padding: 3,
    marginBottom: SPACING.md,
  },
  dirBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.pill,
  },
  dirBtnActive: {
    backgroundColor: COLORS.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  dirText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dirTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  submitBtn: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.pill,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  historyCount: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  movementCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
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
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  movementDate: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  movementTitle: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  reasonText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  movementRight: {
    alignItems: 'flex-end',
  },
  deltaVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
  },
  deltaPositive: {
    color: COLORS.success,
  },
  deltaNegative: {
    color: COLORS.danger,
  },
  afterStock: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: 8,
  },
  emptyText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
});
