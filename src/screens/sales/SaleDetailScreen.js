/**
 * Sale Details Screen
 * Displays complete transaction record, item snapshots, payments, and actions.
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
import { getSaleById, getSaleItems } from '../../repositories/saleRepository';
import { getPaymentsForSale, recordSalePayment } from '../../repositories/paymentRepository';
import { formatCurrency, toMinorUnits } from '../../utils/currency';
import { formatDate, formatTime } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import ScreenContainer from '../../components/common/ScreenContainer';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import ModalSheet from '../../components/common/ModalSheet';
import Input from '../../components/common/Input';

export default function SaleDetailScreen({ route, navigation }) {
  const { currencySymbol, dataVersion, notifyDataChanged } = useApp();
  const saleId = route.params?.saleId;

  const [sale, setSale] = useState(null);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Balance payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  const loadSaleDetails = useCallback(async () => {
    try {
      const s = await getSaleById(saleId);
      const its = await getSaleItems(saleId);
      const pays = await getPaymentsForSale(saleId);
      setSale(s);
      setItems(its);
      setPayments(pays);
    } catch (err) {
      console.warn('Error fetching sale details:', err);
    } finally {
      setLoading(false);
    }
  }, [saleId]);

  useEffect(() => {
    loadSaleDetails();
  }, [loadSaleDetails, dataVersion]);

  const handleRecordPayment = async () => {
    const minor = toMinorUnits(paymentAmount);
    if (minor <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (minor > sale.balance_amount) {
      Alert.alert(
        'Excess Amount',
        `Amount cannot exceed remaining balance of ${formatCurrency(sale.balance_amount, currencySymbol)}.`
      );
      return;
    }

    try {
      setRecordingPayment(true);
      await recordSalePayment({
        saleId,
        amount: minor,
        paymentMethod,
        notes: paymentNotes.trim() || null,
      });

      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNotes('');
      notifyDataChanged();
      loadSaleDetails();
      Alert.alert('Success', 'Payment recorded successfully.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  if (!sale && !loading) {
    return (
      <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
        <Header title="Sale Not Found" onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <Text style={styles.notFoundText}>Transaction record not found.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const isReturnable = sale?.status !== 'RETURNED';

  return (
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
      <Header
        title={sale?.invoice_number ? `#${sale.invoice_number}` : 'Receipt Details'}
        subtitle={formatDate(sale?.sale_date)}
        onBack={() => navigation.goBack()}
        rightIcon="receipt-outline"
        onRightPress={() => navigation.navigate('ReceiptPreview', { saleId })}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.invoiceTitle}>Invoice #{sale?.invoice_number}</Text>
              <Text style={styles.dateMeta}>
                {formatDate(sale?.sale_date)} • {formatTime(sale?.created_at)}
              </Text>
            </View>
            <Badge
              label={sale?.status !== 'COMPLETED' ? sale?.status : sale?.payment_status}
              variant={
                sale?.status === 'RETURNED'
                  ? 'danger'
                  : sale?.status === 'PARTIALLY_RETURNED'
                  ? 'warning'
                  : sale?.payment_status === 'PAID'
                  ? 'success'
                  : 'warning'
              }
            />
          </View>

          <View style={styles.customerRow}>
            <Ionicons name="person-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.customerName}>
              {sale?.customer_name_snapshot || 'Walk-in Guest'}
            </Text>
            {sale?.customer_phone_snapshot ? (
              <Text style={styles.customerPhone}>• {sale?.customer_phone_snapshot}</Text>
            ) : null}
          </View>
        </Card>

        {/* Line Items */}
        <Card style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Purchased Garments ({items.length})</Text>

          {items.map((it) => (
            <View key={it.id} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemTitle}>{it.product_name_snapshot}</Text>
                <Text style={styles.itemMeta}>
                  {it.size_snapshot} / {it.color_snapshot} • Qty: {it.quantity}
                </Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemTotal}>
                  {formatCurrency(it.subtotal, currencySymbol)}
                </Text>
                <Text style={styles.itemUnit}>
                  @{formatCurrency(it.unit_price, currencySymbol)}
                </Text>
              </View>
            </View>
          ))}

          {/* Pricing Calculation Summary */}
          <View style={styles.calcBox}>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Gross Subtotal</Text>
              <Text style={styles.calcVal}>{formatCurrency(sale?.subtotal || 0, currencySymbol)}</Text>
            </View>
            {sale?.discount_amount > 0 && (
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Discount</Text>
                <Text style={[styles.calcVal, { color: COLORS.danger }]}>
                  -{formatCurrency(sale.discount_amount, currencySymbol)}
                </Text>
              </View>
            )}
            <View style={styles.calcDivider} />
            <View style={styles.calcRow}>
              <Text style={styles.grandLabel}>Net Grand Total</Text>
              <Text style={styles.grandVal}>
                {formatCurrency(sale?.total_amount || 0, currencySymbol)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {isReturnable && (
            <Button
              title="Return / Exchange Items"
              variant="outline"
              icon="swap-horizontal-outline"
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Return', { saleId })}
            />
          )}

          <Button
            title="View & Print Receipt"
            variant="primary"
            icon="print-outline"
            style={styles.actionBtn}
            onPress={() => navigation.navigate('ReceiptPreview', { saleId })}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  statusCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  invoiceTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  dateMeta: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  customerName: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  customerPhone: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  card: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
  },
  cardHeaderTitle: {
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
  itemLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  itemTitle: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemMeta: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemTotal: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  itemUnit: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  calcBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    gap: 4,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcLabel: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  calcVal: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  calcDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 4,
  },
  grandLabel: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  grandVal: {
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
    color: COLORS.primary,
  },
  actionRow: {
    gap: SPACING.md,
  },
  actionBtn: {
    borderRadius: RADIUS.pill,
  },
});
