/**
 * Purchase Details Screen
 * Allows viewing inward orders and cancelling purchases with safe inventory reversal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { getPurchaseById, getPurchaseItems, cancelPurchase } from '../../repositories/purchaseRepository';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

export default function PurchaseDetailScreen({ route, navigation }) {
  const { currencySymbol, notifyDataChanged } = useApp();
  const purchaseId = route.params?.purchaseId;

  const [purchase, setPurchase] = useState(null);
  const [items, setItems] = useState([]);
  const [cancelling, setCancelling] = useState(false);

  const loadDetails = useCallback(async () => {
    try {
      const p = await getPurchaseById(purchaseId);
      const its = await getPurchaseItems(purchaseId);
      setPurchase(p);
      setItems(its);
    } catch (err) {
      console.warn('Error loading purchase details:', err);
    }
  }, [purchaseId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const handleCancel = () => {
    Alert.alert(
      'Cancel Purchase Order?',
      'Cancelling this purchase will reverse the inward stock adjustments. Ensure you have not already sold these items.',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Confirm Cancellation',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              await cancelPurchase(purchaseId);
              notifyDataChanged();
              loadDetails();
              Alert.alert('Cancelled', 'Purchase cancelled and stock reversed successfully.');
            } catch (err) {
              Alert.alert('Cannot Cancel', err.message || 'Failed to cancel purchase.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (!purchase) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Purchase Details" onBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const isCancelled = purchase.status === 'CANCELLED';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={purchase.invoice_number}
        subtitle={formatDate(purchase.purchase_date)}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Master Status Card */}
        <Card style={styles.card}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.invoiceTitle}>{purchase.invoice_number}</Text>
              <Text style={styles.supplierText}>
                Supplier: {purchase.supplier_name || 'Direct / Unassigned'}
              </Text>
              {purchase.supplier_phone ? (
                <Text style={styles.supplierPhone}>Tel: {purchase.supplier_phone}</Text>
              ) : null}
            </View>
            <Badge
              label={isCancelled ? 'CANCELLED' : purchase.payment_status}
              variant={isCancelled ? 'danger' : purchase.payment_status === 'PAID' ? 'success' : 'warning'}
            />
          </View>
        </Card>

        {/* Line Items */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Inward Items ({items.length})</Text>

          {items.map((it) => (
            <View key={it.id} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>{it.product_name}</Text>
                <Text style={styles.itemVariant}>
                  Size: {it.size} | Color: {it.color}
                </Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemQtyCost}>
                  {it.quantity} pcs @ {formatCurrency(it.unit_cost, currencySymbol)}
                </Text>
                <Text style={styles.itemSubtotal}>
                  {formatCurrency(it.subtotal, currencySymbol)}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Financial Summary */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Financial Breakdown</Text>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Subtotal</Text>
            <Text style={styles.calcVal}>{formatCurrency(purchase.subtotal, currencySymbol)}</Text>
          </View>
          {purchase.discount_amount > 0 && (
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Discount</Text>
              <Text style={styles.calcDiscount}>
                -{formatCurrency(purchase.discount_amount, currencySymbol)}
              </Text>
            </View>
          )}
          {purchase.additional_costs > 0 && (
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Shipping / Other Costs</Text>
              <Text style={styles.calcVal}>
                +{formatCurrency(purchase.additional_costs, currencySymbol)}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.calcRow}>
            <Text style={styles.totalLabel}>Total Purchase</Text>
            <Text style={styles.totalVal}>{formatCurrency(purchase.total_amount, currencySymbol)}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Paid Amount</Text>
            <Text style={styles.paidVal}>{formatCurrency(purchase.paid_amount, currencySymbol)}</Text>
          </View>

          {purchase.balance_amount > 0 && !isCancelled && (
            <View style={styles.calcRow}>
              <Text style={styles.balanceDueLabel}>Remaining Payable to Supplier</Text>
              <Text style={styles.balanceDueVal}>
                {formatCurrency(purchase.balance_amount, currencySymbol)}
              </Text>
            </View>
          )}
        </Card>

        {!isCancelled && (
          <Button
            title="Cancel Purchase & Reverse Stock"
            variant="danger"
            loading={cancelling}
            onPress={handleCancel}
            style={styles.cancelBtn}
          />
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
  card: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  supplierText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  supplierPhone: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  itemVariant: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemQtyCost: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  itemSubtotal: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  calcLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  calcVal: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  calcDiscount: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.danger,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.sm,
  },
  totalLabel: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
  },
  totalVal: {
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
  },
  paidVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.success,
  },
  balanceDueLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.warning,
  },
  balanceDueVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: COLORS.warning,
  },
  cancelBtn: {
    marginTop: SPACING.md,
  },
});
