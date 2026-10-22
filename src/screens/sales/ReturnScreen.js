/**
 * Process Sales Returns & Refunds Screen
 * Safe-area aware garment return and inventory restock manager.
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
import { getSaleById, getSaleItems } from '../../repositories/saleRepository';
import { createSalesReturn } from '../../repositories/returnRepository';
import { formatCurrency, toMinorUnits, toMajorUnits } from '../../utils/currency';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import ScreenContainer from '../../components/common/ScreenContainer';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function ReturnScreen({ route, navigation }) {
  const { currencySymbol, notifyDataChanged } = useApp();
  const saleId = route.params?.saleId;

  const [sale, setSale] = useState(null);
  const [items, setItems] = useState([]);
  const [returnSelections, setReturnSelections] = useState({});
  const [refundPaymentMethod, setRefundPaymentMethod] = useState('CASH');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSaleById(saleId);
        const its = await getSaleItems(saleId);
        setSale(s);
        setItems(its);

        const initialSel = {};
        for (const it of its) {
          const remaining = it.quantity - it.returned_quantity;
          const unitEffectivePrice = Math.round(it.subtotal / it.quantity);
          initialSel[it.id] = {
            quantity: 0,
            remaining,
            restockEligible: true,
            unitRefundPrice: unitEffectivePrice,
          };
        }
        setReturnSelections(initialSel);
      } catch (err) {
        console.warn('Error loading return data:', err);
      }
    })();
  }, [saleId]);

  const updateQuantity = (itemId, delta) => {
    setReturnSelections((prev) => {
      const current = prev[itemId] || { quantity: 0, remaining: 0 };
      const nextQty = Math.max(0, Math.min(current.remaining, current.quantity + delta));
      return {
        ...prev,
        [itemId]: { ...current, quantity: nextQty },
      };
    });
  };

  const toggleRestock = (itemId) => {
    setReturnSelections((prev) => {
      const current = prev[itemId];
      return {
        ...prev,
        [itemId]: { ...current, restockEligible: !current.restockEligible },
      };
    });
  };

  // Computations
  let totalRefundAmount = 0;
  let totalUnitsReturning = 0;

  for (const it of items) {
    const sel = returnSelections[it.id];
    if (sel && sel.quantity > 0) {
      totalRefundAmount += sel.quantity * sel.unitRefundPrice;
      totalUnitsReturning += sel.quantity;
    }
  }

  const handleProcessReturn = async () => {
    if (totalUnitsReturning === 0) {
      Alert.alert('No Items Selected', 'Please specify at least 1 unit to return.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for this return/exchange.');
      return;
    }

    try {
      setSubmitting(true);

      const returnItemsPayload = [];
      for (const it of items) {
        const sel = returnSelections[it.id];
        if (sel && sel.quantity > 0) {
          returnItemsPayload.push({
            saleItemId: it.id,
            productId: it.product_id,
            variantId: it.variant_id,
            quantity: sel.quantity,
            refundPrice: sel.unitRefundPrice,
            restockEligible: sel.restockEligible,
          });
        }
      }

      await createSalesReturn({
        saleId,
        refundAmount: totalRefundAmount,
        refundPaymentMethod,
        reason: reason.trim(),
        items: returnItemsPayload,
      });

      notifyDataChanged();
      Alert.alert('Return Processed', 'Refund registered and inventory restocked!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to process return');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
      <Header
        title="Return & Refund"
        subtitle={`Invoice #${sale?.invoice_number || saleId}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Select Garments to Return</Text>
          <Text style={styles.cardSubtitle}>Specify quantity and whether item is suitable for restocking</Text>

          {items.map((it) => {
            const sel = returnSelections[it.id] || { quantity: 0, remaining: 0, restockEligible: true };
            const canReturn = sel.remaining > 0;

            return (
              <View key={it.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{it.product_name_snapshot}</Text>
                  <Text style={styles.itemMeta}>
                    {it.size_snapshot} / {it.color_snapshot} • Max returnable: {sel.remaining} pcs
                  </Text>
                </View>

                {canReturn ? (
                  <View style={styles.itemControls}>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => updateQuantity(it.id, -1)}
                      >
                        <Ionicons name="remove" size={16} color={COLORS.textPrimary} />
                      </TouchableOpacity>
                      <Text style={styles.stepVal}>{sel.quantity}</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => updateQuantity(it.id, 1)}
                      >
                        <Ionicons name="add" size={16} color={COLORS.textPrimary} />
                      </TouchableOpacity>
                    </View>

                    {sel.quantity > 0 && (
                      <TouchableOpacity
                        style={[styles.restockChip, sel.restockEligible && styles.restockChipActive]}
                        onPress={() => toggleRestock(it.id)}
                      >
                        <Ionicons
                          name={sel.restockEligible ? 'checkbox' : 'square-outline'}
                          size={14}
                          color={sel.restockEligible ? COLORS.primary : COLORS.textTertiary}
                        />
                        <Text style={styles.restockText}>Restock</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <Text style={styles.fullyReturned}>Already fully returned</Text>
                )}
              </View>
            );
          })}
        </Card>

        {/* Refund Details */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Refund Settlement</Text>

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total Refund Due Customer</Text>
            <Text style={styles.totalVal}>{formatCurrency(totalRefundAmount, currencySymbol)}</Text>
          </View>

          <Input
            label="Reason for Return / Exchange *"
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Size exchange requested by customer"
          />

          <Button
            title={`Process Refund (${formatCurrency(totalRefundAmount, currencySymbol)})`}
            variant="primary"
            loading={submitting}
            onPress={handleProcessReturn}
            style={styles.submitBtn}
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
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
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
  itemRow: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  itemInfo: {
    marginBottom: 8,
  },
  itemName: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemMeta: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 2,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  stepVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: COLORS.textPrimary,
    minWidth: 32,
    textAlign: 'center',
  },
  restockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSubtle,
  },
  restockChipActive: {
    backgroundColor: COLORS.primarySurface,
  },
  restockText: {
    ...TYPOGRAPHY.captionSmall,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  fullyReturned: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.danger,
    fontStyle: 'italic',
  },
  totalBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  totalLabel: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  totalVal: {
    ...TYPOGRAPHY.h2,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
  },
  submitBtn: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.pill,
  },
});
