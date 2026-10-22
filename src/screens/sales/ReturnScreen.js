/**
 * Process Sales Returns & Refunds Screen
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
import { getSaleById, getSaleItems } from '../../repositories/saleRepository';
import { createSalesReturn } from '../../repositories/returnRepository';
import { formatCurrency, toMinorUnits, toMajorUnits } from '../../utils/currency';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function ReturnScreen({ route, navigation }) {
  const { currencySymbol, notifyDataChanged } = useApp();
  const saleId = route.params?.saleId;

  const [sale, setSale] = useState(null);
  const [items, setItems] = useState([]);
  const [returnSelections, setReturnSelections] = useState({}); // { [saleItemId]: { quantity: 0, restockEligible: true, unitRefundPrice: 0 } }
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
      const cur = prev[itemId] || { quantity: 0, remaining: 0, restockEligible: true };
      const nextQty = Math.max(0, Math.min(cur.remaining, cur.quantity + delta));
      return {
        ...prev,
        [itemId]: { ...cur, quantity: nextQty },
      };
    });
  };

  const toggleRestock = (itemId) => {
    setReturnSelections((prev) => {
      const cur = prev[itemId];
      return {
        ...prev,
        [itemId]: { ...cur, restockEligible: !cur.restockEligible },
      };
    });
  };

  // Calculate total refund
  const totalRefundAmount = Object.entries(returnSelections).reduce((sum, [_, item]) => {
    return sum + item.quantity * item.unitRefundPrice;
  }, 0);

  const totalReturnUnits = Object.values(returnSelections).reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmitReturn = async () => {
    if (totalReturnUnits === 0) {
      Alert.alert('No Items Selected', 'Please select at least 1 unit to return.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for return (e.g. Size exchange, defective zipper).');
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
            variantId: it.variant_id,
            quantity: sel.quantity,
            unitRefundPrice: sel.unitRefundPrice,
            subtotal: sel.quantity * sel.unitRefundPrice,
            restockEligible: sel.restockEligible,
          });
        }
      }

      await createSalesReturn({
        saleId,
        customerId: sale.customer_id,
        totalRefundAmount,
        refundPaymentMethod,
        reason: reason.trim(),
        items: returnItemsPayload,
      });

      notifyDataChanged();
      Alert.alert('Return Processed', 'Sales return completed and inventory adjusted successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Return Error', err.message || 'Failed to process return');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Process Return"
        subtitle={`Invoice ${sale?.invoice_number}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Card style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Return Policy & Restocking Rules</Text>
          <Text style={styles.noticeBody}>
            Items marked "Restock Eligible" will be added back into sellable inventory. Damaged items will be recorded in the audit log without increasing sellable stock.
          </Text>
        </Card>

        {/* Item Selection */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>Select Items to Return</Text>

          {items.map((it) => {
            const sel = returnSelections[it.id] || { quantity: 0, remaining: 0, restockEligible: true };
            const isFullyReturned = sel.remaining === 0;

            return (
              <View key={it.id} style={styles.itemBox}>
                <View style={styles.itemTopRow}>
                  <View style={styles.itemTitleCol}>
                    <Text style={styles.itemName}>{it.product_name_snapshot}</Text>
                    <Text style={styles.itemVariant}>{it.variant_name_snapshot}</Text>
                    <Text style={styles.itemRemainingText}>
                      Purchased: {it.quantity} | Available to return: {sel.remaining}
                    </Text>
                  </View>

                  {!isFullyReturned ? (
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => updateQuantity(it.id, -1)}
                      >
                        <Ionicons name="remove" size={16} color={COLORS.textPrimary} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{sel.quantity}</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => updateQuantity(it.id, 1)}
                      >
                        <Ionicons name="add" size={16} color={COLORS.textPrimary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.fullyReturnedNotice}>Fully Returned</Text>
                  )}
                </View>

                {sel.quantity > 0 && (
                  <View style={styles.restockRow}>
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => toggleRestock(it.id)}
                    >
                      <Ionicons
                        name={sel.restockEligible ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={sel.restockEligible ? COLORS.success : COLORS.textTertiary}
                      />
                      <Text style={styles.checkboxLabel}>
                        {sel.restockEligible ? 'Restock to Inventory (Resellable)' : 'Damaged / Discard (Do Not Restock)'}
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.refundLineText}>
                      Refund: {formatCurrency(sel.quantity * sel.unitRefundPrice, currencySymbol)}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </Card>

        {/* Refund Details */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>Refund Details</Text>

          <Input
            label="Reason for Return *"
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Size didn't fit, customer selected different color"
            multiline
            numberOfLines={2}
          />

          <Text style={styles.fieldLabel}>Refund Payment Method</Text>
          <View style={styles.methodToggle}>
            <TouchableOpacity
              style={[styles.methodBtn, refundPaymentMethod === 'CASH' && styles.methodBtnActive]}
              onPress={() => setRefundPaymentMethod('CASH')}
            >
              <Text style={[styles.methodText, refundPaymentMethod === 'CASH' && styles.methodTextActive]}>
                Cash Refund
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.methodBtn, refundPaymentMethod === 'CUSTOMER_CREDIT' && styles.methodBtnActive]}
              onPress={() => setRefundPaymentMethod('CUSTOMER_CREDIT')}
            >
              <Text style={[styles.methodText, refundPaymentMethod === 'CUSTOMER_CREDIT' && styles.methodTextActive]}>
                Store Credit
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Total Card */}
        <Card style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalUnitsLabel}>Total Units Returning</Text>
            <Text style={styles.totalUnitsVal}>{totalReturnUnits} pcs</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.grandTotalLabel}>Total Refund Amount</Text>
            <Text style={styles.grandTotalVal}>{formatCurrency(totalRefundAmount, currencySymbol)}</Text>
          </View>
        </Card>

        <Button
          title="Confirm & Process Return"
          variant="danger"
          size="lg"
          loading={submitting}
          onPress={handleSubmitReturn}
          style={styles.submitBtn}
        />
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
  noticeCard: {
    padding: SPACING.md,
    backgroundColor: COLORS.infoLight,
    borderColor: COLORS.info,
    marginBottom: SPACING.md,
  },
  noticeTitle: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.infoText,
    marginBottom: 2,
  },
  noticeBody: {
    ...TYPOGRAPHY.caption,
    color: COLORS.infoText,
    lineHeight: 16,
  },
  card: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  itemBox: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitleCol: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  itemName: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  itemVariant: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  itemRemainingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.sm,
    padding: 2,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  fullyReturnedNotice: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    fontWeight: '600',
  },
  restockRow: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkboxLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginLeft: 6,
  },
  refundLineText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    fontWeight: '700',
  },
  fieldLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  methodToggle: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.sm,
    marginRight: 6,
  },
  methodBtnActive: {
    backgroundColor: COLORS.primary,
  },
  methodText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
  },
  methodTextActive: {
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  totalCard: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  totalUnitsLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  totalUnitsVal: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  grandTotalLabel: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
  },
  grandTotalVal: {
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
    color: COLORS.danger,
  },
  submitBtn: {
    marginTop: SPACING.md,
  },
});
