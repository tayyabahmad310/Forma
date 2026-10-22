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
  Alert,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { getPurchaseById, getPurchaseItems, cancelPurchase } from '../../repositories/purchaseRepository';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import ScreenContainer from '../../components/common/ScreenContainer';
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
              Alert.alert('Cancelled', 'Purchase order cancelled and stock reversed.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not cancel purchase.');
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
      <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
        <Header title="Purchase Details" onBack={() => navigation.goBack()} />
      </ScreenContainer>
    );
  }

  const isCancelled = purchase.status === 'CANCELLED';

  return (
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
      <Header
        title={`PO #${purchase.po_number || purchase.id}`}
        subtitle={formatDate(purchase.purchase_date || purchase.created_at)}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Header Summary */}
        <Card style={styles.card}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.supplierName}>{purchase.supplier_name || 'Direct Wholesale'}</Text>
              {purchase.invoice_number ? (
                <Text style={styles.invoiceText}>Vendor Ref: #{purchase.invoice_number}</Text>
              ) : null}
            </View>
            <Badge
              label={purchase.status || 'RECEIVED'}
              variant={isCancelled ? 'danger' : 'success'}
            />
          </View>

          <View style={styles.summaryBar}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Total Cost</Text>
              <Text style={styles.summaryVal}>
                {formatCurrency(purchase.total_amount, currencySymbol)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Paid</Text>
              <Text style={styles.summaryVal}>
                {formatCurrency(purchase.paid_amount || 0, currencySymbol)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Items</Text>
              <Text style={styles.summaryVal}>{items.length}</Text>
            </View>
          </View>
        </Card>

        {/* Line Items Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Inward Clothing Items</Text>

          {items.map((it, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{it.product_name}</Text>
                <Text style={styles.itemVariant}>
                  {it.size} / {it.color} • {it.quantity} units @ {formatCurrency(it.unit_cost, currencySymbol)}
                </Text>
              </View>
              <Text style={styles.itemSubtotal}>
                {formatCurrency(it.subtotal, currencySymbol)}
              </Text>
            </View>
          ))}
        </Card>

        {/* Cancellation Action */}
        {!isCancelled && (
          <Button
            title="Cancel & Reverse Stock Inward"
            variant="outline"
            loading={cancelling}
            onPress={handleCancel}
            style={styles.cancelBtn}
          />
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
  card: {
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  supplierName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  invoiceText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginBottom: 2,
  },
  summaryVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.borderLight,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  itemInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  itemName: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemVariant: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  itemSubtotal: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '800',
    color: COLORS.primary,
  },
  cancelBtn: {
    marginTop: SPACING.sm,
    borderColor: COLORS.danger,
    borderRadius: RADIUS.pill,
  },
});
