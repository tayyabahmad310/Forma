/**
 * Customer Profile & Transaction Ledger Screen
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
import { getCustomerById, getCustomerSales } from '../../repositories/customerRepository';
import { recordSalePayment } from '../../repositories/paymentRepository';
import { formatCurrency, toMinorUnits } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import ModalSheet from '../../components/common/ModalSheet';
import Input from '../../components/common/Input';

export default function CustomerDetailScreen({ route, navigation }) {
  const { currencySymbol, dataVersion, notifyDataChanged } = useApp();
  const customerId = route.params?.customerId;

  const [customer, setCustomer] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Collect balance modal
  const [selectedSaleToPay, setSelectedSaleToPay] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const cust = await getCustomerById(customerId);
      const orders = await getCustomerSales(customerId, 20);
      setCustomer(cust);
      setSales(orders);
    } catch (err) {
      console.warn('Error fetching customer details:', err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadData();
  }, [loadData, dataVersion]);

  const openPaymentForSale = (sale) => {
    setSelectedSaleToPay(sale);
    setPaymentAmount(String(sale.balance_amount / 100));
  };

  const handleConfirmPayment = async () => {
    if (!selectedSaleToPay) return;
    const minor = toMinorUnits(paymentAmount);
    if (minor <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a positive amount.');
      return;
    }
    if (minor > selectedSaleToPay.balance_amount) {
      Alert.alert('Excess Amount', 'Amount exceeds the sale invoice balance.');
      return;
    }

    try {
      setSubmittingPayment(true);
      await recordSalePayment({
        saleId: selectedSaleToPay.id,
        amount: minor,
        paymentMethod,
        notes: `Customer balance collection for ${customer.name}`,
      });

      setSelectedSaleToPay(null);
      setPaymentAmount('');
      notifyDataChanged();
      loadData();
      Alert.alert('Success', 'Payment collected and customer balance updated.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (!customer && !loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Customer Not Found" onBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const outstandingBalance = customer?.outstanding_balance || 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={customer?.name || 'Customer Details'}
        subtitle="Customer ledger & purchase history"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Card style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={28} color={COLORS.primary} />
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.name}>{customer?.name}</Text>
              {customer?.phone ? (
                <Text style={styles.phone}>Phone: {customer.phone}</Text>
              ) : null}
              {customer?.notes ? (
                <Text style={styles.notesText}>{customer.notes}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.ledgerRow}>
            <View style={styles.ledgerCol}>
              <Text style={styles.ledgerLabel}>Total Orders</Text>
              <Text style={styles.ledgerVal}>{customer?.total_orders || 0}</Text>
            </View>
            <View style={styles.ledgerDivider} />
            <View style={styles.ledgerCol}>
              <Text style={styles.ledgerLabel}>Outstanding Credit</Text>
              <Text
                style={[
                  styles.ledgerVal,
                  outstandingBalance > 0 ? { color: COLORS.warning } : { color: COLORS.success },
                ]}
              >
                {formatCurrency(outstandingBalance, currencySymbol)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Orders List */}
        <Text style={styles.sectionTitle}>Order Invoices ({sales.length})</Text>

        {sales.length === 0 ? (
          <Text style={styles.emptyText}>No orders recorded for this customer yet.</Text>
        ) : (
          sales.map((sale) => (
            <Card
              key={sale.id}
              style={styles.saleCard}
              onPress={() => navigation.navigate('SaleDetail', { saleId: sale.id })}
            >
              <View style={styles.saleRow}>
                <View style={styles.saleLeft}>
                  <Text style={styles.invoiceNumber}>{sale.invoice_number}</Text>
                  <Text style={styles.saleDate}>
                    {formatDate(sale.sale_date)} • {sale.payment_method}
                  </Text>
                </View>

                <View style={styles.saleRight}>
                  <Text style={styles.saleTotal}>
                    {formatCurrency(sale.total_amount, currencySymbol)}
                  </Text>
                  <Badge
                    label={sale.payment_status}
                    variant={
                      sale.payment_status === 'PAID'
                        ? 'success'
                        : sale.payment_status === 'PARTIAL'
                        ? 'warning'
                        : 'danger'
                    }
                    size="sm"
                  />
                </View>
              </View>

              {sale.balance_amount > 0 && (
                <View style={styles.balanceActionRow}>
                  <Text style={styles.balanceDueNotice}>
                    Remaining Balance: {formatCurrency(sale.balance_amount, currencySymbol)}
                  </Text>
                  <TouchableOpacity
                    style={styles.payBtn}
                    onPress={() => openPaymentForSale(sale)}
                  >
                    <Text style={styles.payBtnText}>Collect Payment</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          ))
        )}
      </ScrollView>

      {/* Collect Payment Modal */}
      <ModalSheet
        visible={Boolean(selectedSaleToPay)}
        onClose={() => setSelectedSaleToPay(null)}
        title="Collect Customer Payment"
        subtitle={`Invoice #${selectedSaleToPay?.invoice_number} | Due: ${formatCurrency(selectedSaleToPay?.balance_amount || 0, currencySymbol)}`}
      >
        <Input
          label={`Amount Received (${currencySymbol})`}
          value={paymentAmount}
          onChangeText={setPaymentAmount}
          placeholder="0"
          keyboardType="numeric"
        />

        <Text style={styles.fieldLabel}>Payment Method</Text>
        <View style={styles.methodToggle}>
          {['CASH', 'CARD', 'BANK', 'WALLET'].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]}
              onPress={() => setPaymentMethod(m)}
            >
              <Text style={[styles.methodText, paymentMethod === m && styles.methodTextActive]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title="Confirm Collection"
          variant="primary"
          loading={submittingPayment}
          onPress={handleConfirmPayment}
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
  card: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarInfo: {
    flex: 1,
  },
  name: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  phone: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  notesText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  ledgerCol: {
    flex: 1,
    alignItems: 'center',
  },
  ledgerLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  ledgerVal: {
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  ledgerDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.borderLight,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  emptyText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  saleCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleLeft: {
    flex: 1,
  },
  invoiceNumber: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  saleDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  saleRight: {
    alignItems: 'flex-end',
  },
  saleTotal: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  balanceActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  balanceDueNotice: {
    ...TYPOGRAPHY.caption,
    color: COLORS.warning,
    fontWeight: '700',
  },
  payBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  payBtnText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textInverse,
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
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.xs,
    marginRight: 4,
  },
  methodBtnActive: {
    backgroundColor: COLORS.primary,
  },
  methodText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
  },
  methodTextActive: {
    color: COLORS.textInverse,
    fontWeight: '700',
  },
});
