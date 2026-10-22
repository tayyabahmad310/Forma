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
  SafeAreaView,
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
      <SafeAreaView style={styles.safeArea}>
        <Header title="Sale Not Found" onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <Text style={styles.notFoundText}>Transaction record not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={sale?.invoice_number || 'Sale Details'}
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
              <Text style={styles.invoiceTitle}>{sale?.invoice_number}</Text>
              <Text style={styles.dateMeta}>
                {formatDate(sale?.sale_date)} at {formatTime(sale?.created_at)}
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
              {sale?.customer_name_snapshot || 'Walk-in Customer'}
            </Text>
            {sale?.customer_phone_snapshot ? (
              <Text style={styles.customerPhone}>• {sale?.customer_phone_snapshot}</Text>
            ) : null}
          </View>
        </Card>

        {/* Line Items */}
        <Card style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Purchased Items ({items.length})</Text>

          {items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>{item.product_name_snapshot}</Text>
                <Text style={styles.itemVariant}>{item.variant_name_snapshot}</Text>
                {item.returned_quantity > 0 && (
                  <Text style={styles.returnedBadge}>
                    ({item.returned_quantity} returned)
                  </Text>
                )}
              </View>

              <View style={styles.itemRight}>
                <Text style={styles.itemQtyPrice}>
                  {item.quantity} × {formatCurrency(item.custom_unit_price || item.unit_price_snapshot, currencySymbol)}
                </Text>
                {item.discount_amount > 0 && (
                  <Text style={styles.itemDiscount}>
                    Disc: -{formatCurrency(item.discount_amount, currencySymbol)}
                  </Text>
                )}
                <Text style={styles.itemSubtotal}>
                  {formatCurrency(item.subtotal, currencySymbol)}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Totals & Payments */}
        <Card style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Financial Summary</Text>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Subtotal</Text>
            <Text style={styles.calcVal}>{formatCurrency(sale?.subtotal || 0, currencySymbol)}</Text>
          </View>

          {sale?.discount_amount > 0 && (
            <View style={styles.calcRow}>
              <Text style={styles.discountLabel}>Order Discount</Text>
              <Text style={styles.discountVal}>
                -{formatCurrency(sale.discount_amount, currencySymbol)}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.calcRow}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalVal}>{formatCurrency(sale?.total_amount || 0, currencySymbol)}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Paid Amount ({sale?.payment_method})</Text>
            <Text style={styles.paidVal}>{formatCurrency(sale?.paid_amount || 0, currencySymbol)}</Text>
          </View>

          {sale?.balance_amount > 0 ? (
            <View style={styles.calcRow}>
              <Text style={styles.balanceLabel}>Remaining Balance Due</Text>
              <Text style={styles.balanceVal}>
                {formatCurrency(sale.balance_amount, currencySymbol)}
              </Text>
            </View>
          ) : (
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Settlement</Text>
              <Text style={styles.settledVal}>Fully Settled</Text>
            </View>
          )}
        </Card>

        {/* Payments Ledger */}
        {payments.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Payment History ({payments.length})</Text>
            {payments.map((p) => (
              <View key={p.id} style={styles.paymentRow}>
                <View>
                  <Text style={styles.paymentNum}>{p.payment_number}</Text>
                  <Text style={styles.paymentDate}>
                    {formatDate(p.payment_date)} • {p.payment_method}
                  </Text>
                </View>
                <Text style={styles.paymentAmount}>
                  +{formatCurrency(p.amount, currencySymbol)}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsCol}>
          {sale?.balance_amount > 0 && (
            <Button
              title="Collect Remaining Balance"
              variant="primary"
              icon="cash-outline"
              onPress={() => {
                setPaymentAmount(String((sale.balance_amount || 0) / 100));
                setShowPaymentModal(true);
              }}
              style={styles.actionBtn}
            />
          )}

          <Button
            title="View & Share Receipt PDF"
            variant="outline"
            icon="share-outline"
            onPress={() => navigation.navigate('ReceiptPreview', { saleId })}
            style={styles.actionBtn}
          />

          {sale?.status !== 'RETURNED' && (
            <Button
              title="Process Return / Refund"
              variant="danger"
              icon="return-down-back-outline"
              onPress={() => navigation.navigate('ReturnScreen', { saleId })}
              style={styles.actionBtn}
            />
          )}
        </View>
      </ScrollView>

      {/* Collect Balance Payment Modal */}
      <ModalSheet
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Balance Payment"
        subtitle={`Remaining Due: ${formatCurrency(sale?.balance_amount || 0, currencySymbol)}`}
      >
        <Input
          label={`Amount Received (${currencySymbol})`}
          value={paymentAmount}
          onChangeText={setPaymentAmount}
          placeholder="0"
          keyboardType="numeric"
        />

        <Input
          label="Payment Note"
          value={paymentNotes}
          onChangeText={setPaymentNotes}
          placeholder="e.g. Bank transfer reference #1234"
        />

        <Button
          title="Confirm Receipt & Update Balance"
          variant="primary"
          loading={recordingPayment}
          onPress={handleRecordPayment}
          style={{ marginTop: 12 }}
        />
      </ModalSheet>
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
    marginBottom: SPACING.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  invoiceTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  dateMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  customerName: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: 6,
  },
  customerPhone: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  card: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  cardHeaderTitle: {
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
    marginRight: SPACING.md,
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
  returnedBadge: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    fontWeight: '600',
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemQtyPrice: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  itemDiscount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
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
    color: COLORS.textPrimary,
  },
  discountLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.danger,
  },
  discountVal: {
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
    color: COLORS.textPrimary,
  },
  totalVal: {
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  paidVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.success,
  },
  balanceLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.warning,
  },
  balanceVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: COLORS.warning,
  },
  settledVal: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.success,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  paymentNum: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  paymentDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  paymentAmount: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.success,
  },
  actionButtonsCol: {
    marginTop: SPACING.sm,
  },
  actionBtn: {
    marginBottom: SPACING.sm,
  },
});
