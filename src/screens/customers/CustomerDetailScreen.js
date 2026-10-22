/**
 * Customer Profile & Transaction Ledger Screen
 * High-end boutique customer profile, order history, and payment collection.
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
import { getCustomerById, getCustomerSales } from '../../repositories/customerRepository';
import { recordSalePayment } from '../../repositories/paymentRepository';
import { formatCurrency, toMinorUnits } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import ScreenContainer from '../../components/common/ScreenContainer';
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
    const balanceRemaining = Math.max(0, sale.total_amount - (sale.paid_amount || 0));
    setPaymentAmount(String(balanceRemaining / 100));
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    try {
      setSubmittingPayment(true);
      await recordSalePayment({
        saleId: selectedSaleToPay.id,
        amount: toMinorUnits(paymentAmount),
        paymentMethod,
        notes: `Customer ledger collection for Invoice #${selectedSaleToPay.invoice_number}`,
      });

      notifyDataChanged();
      setSelectedSaleToPay(null);
      Alert.alert('Payment Recorded', 'Credit balance updated successfully.');
      loadData();
    } catch (err) {
      Alert.alert('Payment Error', err.message || 'Could not record payment.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (!customer && !loading) {
    return (
      <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
        <Header title="Client Not Found" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.emptyText}>Customer record not found.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const hasDue = (customer?.current_balance || 0) > 0;

  return (
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
      <Header
        title={customer?.name || 'Client Details'}
        subtitle="VIP Account Profile"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(customer?.name || 'C').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.clientName}>{customer?.name}</Text>
              {customer?.phone ? (
                <Text style={styles.clientPhone}>
                  <Ionicons name="call-outline" size={13} color={COLORS.textTertiary} /> {customer.phone}
                </Text>
              ) : null}
              {customer?.notes ? (
                <Text style={styles.clientNotes}>"{customer.notes}"</Text>
              ) : null}
            </View>
          </View>

          {/* Balance & Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Total Purchases</Text>
              <Text style={styles.statVal}>
                {formatCurrency(customer?.total_spent || 0, currencySymbol)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Current Balance</Text>
              <Text
                style={[
                  styles.statVal,
                  hasDue ? { color: COLORS.danger } : { color: COLORS.success },
                ]}
              >
                {hasDue
                  ? formatCurrency(customer.current_balance, currencySymbol)
                  : 'Settled'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Order History */}
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          <Text style={styles.historyCount}>{sales.length} receipts</Text>
        </View>

        {sales.length > 0 ? (
          sales.map((order) => {
            const dueOnOrder = Math.max(0, order.total_amount - (order.paid_amount || 0));
            const isFullyPaid = dueOnOrder === 0;

            return (
              <Card key={order.id} style={styles.orderCard}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('SaleDetail', { saleId: order.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.orderTopRow}>
                    <View>
                      <Text style={styles.invoiceNum}>#{order.invoice_number}</Text>
                      <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                    </View>
                    <Badge
                      label={isFullyPaid ? 'PAID' : 'DUE BALANCE'}
                      variant={isFullyPaid ? 'success' : 'danger'}
                    />
                  </View>

                  <View style={styles.orderBottomRow}>
                    <View>
                      <Text style={styles.orderTotalLabel}>Invoice Total</Text>
                      <Text style={styles.orderTotalVal}>
                        {formatCurrency(order.total_amount, currencySymbol)}
                      </Text>
                    </View>

                    {!isFullyPaid && (
                      <TouchableOpacity
                        style={styles.payBtn}
                        onPress={() => openPaymentForSale(order)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="cash-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.payBtnText}>
                          Collect {formatCurrency(dueOnOrder, currencySymbol)}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              </Card>
            );
          })
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={32} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>No transactions recorded for this client.</Text>
          </Card>
        )}
      </ScrollView>

      {/* Collect Payment Modal */}
      {selectedSaleToPay && (
        <ModalSheet
          visible={Boolean(selectedSaleToPay)}
          onClose={() => setSelectedSaleToPay(null)}
          title="Collect Balance Payment"
          subtitle={`Invoice #${selectedSaleToPay.invoice_number}`}
        >
          <Input
            label={`Payment Amount (${currencySymbol}) *`}
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            placeholder="0"
            keyboardType="numeric"
          />

          <Button
            title="Confirm & Record Receipt"
            variant="primary"
            loading={submittingPayment}
            onPress={handleRecordPayment}
            style={styles.modalBtn}
          />
        </ModalSheet>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderRadius: RADIUS.xl,
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
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    ...TYPOGRAPHY.h2,
    fontWeight: '800',
    color: COLORS.primary,
  },
  profileInfo: {
    flex: 1,
  },
  clientName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  clientPhone: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  clientNotes: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginBottom: 2,
  },
  statVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.borderLight,
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
  orderCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  invoiceNum: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  orderDate: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  orderBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  orderTotalLabel: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  orderTotalVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: COLORS.primary,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primarySurface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(91,36,19,0.15)',
    gap: 4,
  },
  payBtnText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.primary,
    fontWeight: '700',
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
  modalBtn: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.pill,
  },
});
