/**
 * Receipt Preview & Local PDF Sharing Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { getSaleById, getSaleItems } from '../../repositories/saleRepository';
import { getPaymentsForSale } from '../../repositories/paymentRepository';
import { shareReceiptPdf, printReceiptDirect } from '../../services/receiptService';
import { formatCurrency } from '../../utils/currency';
import { formatDate, formatTime } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function ReceiptPreviewScreen({ route, navigation }) {
  const { settings, currencySymbol } = useApp();
  const saleId = route.params?.saleId;

  const [sale, setSale] = useState(null);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isSharing, setIsSharing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSaleById(saleId);
        const its = await getSaleItems(saleId);
        const pays = await getPaymentsForSale(saleId);
        setSale(s);
        setItems(its);
        setPayments(pays);
      } catch (err) {
        console.warn('Error loading receipt data:', err);
      }
    })();
  }, [saleId]);

  const handleSharePdf = async () => {
    if (!sale) return;
    try {
      setIsSharing(true);
      await shareReceiptPdf({ sale, items, payments, settings });
    } catch (err) {
      Alert.alert('Share Error', err.message || 'Could not export PDF receipt.');
    } finally {
      setIsSharing(false);
    }
  };

  const handlePrint = async () => {
    if (!sale) return;
    try {
      setIsPrinting(true);
      await printReceiptDirect({ sale, items, payments, settings });
    } catch (err) {
      Alert.alert('Print Error', err.message || 'Could not trigger printer.');
    } finally {
      setIsPrinting(false);
    }
  };

  if (!sale) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Receipt" onBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Receipt Preview"
        subtitle={sale.invoice_number}
        onBack={() => navigation.goBack()}
        rightIcon="home-outline"
        onRightPress={() => navigation.navigate('DashboardTab')}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Paper Receipt Simulation Card */}
        <Card style={styles.paperReceipt}>
          {/* Header */}
          <View style={styles.receiptHeader}>
            <Text style={styles.storeName}>{settings.business_name || 'Clothio Apparel'}</Text>
            {settings.business_address ? (
              <Text style={styles.storeAddress}>{settings.business_address}</Text>
            ) : null}
            {settings.business_phone ? (
              <Text style={styles.storePhone}>Tel: {settings.business_phone}</Text>
            ) : null}
          </View>

          <View style={styles.invoiceMetaTable}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice No:</Text>
              <Text style={styles.metaVal}>{sale.invoice_number}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date & Time:</Text>
              <Text style={styles.metaVal}>
                {formatDate(sale.sale_date)} ({formatTime(sale.created_at)})
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Customer:</Text>
              <Text style={styles.metaVal}>{sale.customer_name_snapshot || 'Walk-in Customer'}</Text>
            </View>
          </View>

          <View style={styles.dashedDivider} />

          {/* Line Items */}
          <View style={styles.itemsTableHeader}>
            <Text style={[styles.thText, { flex: 2 }]}>ITEM & SIZE</Text>
            <Text style={[styles.thText, { flex: 1, textAlign: 'center' }]}>QTY</Text>
            <Text style={[styles.thText, { flex: 1, textAlign: 'right' }]}>PRICE</Text>
            <Text style={[styles.thText, { flex: 1, textAlign: 'right' }]}>TOTAL</Text>
          </View>

          {items.map((it) => (
            <View key={it.id} style={styles.itemRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.itName}>{it.product_name_snapshot}</Text>
                <Text style={styles.itVariant}>{it.variant_name_snapshot}</Text>
              </View>
              <Text style={[styles.itVal, { flex: 1, textAlign: 'center' }]}>{it.quantity}</Text>
              <Text style={[styles.itVal, { flex: 1, textAlign: 'right' }]}>
                {formatCurrency(it.custom_unit_price || it.unit_price_snapshot, currencySymbol)}
              </Text>
              <Text style={[styles.itValBold, { flex: 1, textAlign: 'right' }]}>
                {formatCurrency(it.subtotal, currencySymbol)}
              </Text>
            </View>
          ))}

          <View style={styles.dashedDivider} />

          {/* Totals */}
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Subtotal</Text>
            <Text style={styles.calcVal}>{formatCurrency(sale.subtotal, currencySymbol)}</Text>
          </View>

          {sale.discount_amount > 0 && (
            <View style={styles.calcRow}>
              <Text style={styles.discountLabel}>Order Discount</Text>
              <Text style={styles.discountVal}>
                -{formatCurrency(sale.discount_amount, currencySymbol)}
              </Text>
            </View>
          )}

          <View style={styles.solidDivider} />

          <View style={styles.calcRow}>
            <Text style={styles.netTotalLabel}>NET TOTAL</Text>
            <Text style={styles.netTotalVal}>{formatCurrency(sale.total_amount, currencySymbol)}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Paid ({sale.payment_method})</Text>
            <Text style={styles.paidVal}>{formatCurrency(sale.paid_amount, currencySymbol)}</Text>
          </View>

          {sale.balance_amount > 0 ? (
            <View style={styles.calcRow}>
              <Text style={styles.balanceDueLabel}>Remaining Due</Text>
              <Text style={styles.balanceDueVal}>
                {formatCurrency(sale.balance_amount, currencySymbol)}
              </Text>
            </View>
          ) : (
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Status</Text>
              <Text style={styles.settledText}>FULLY SETTLED</Text>
            </View>
          )}

          <View style={styles.dashedDivider} />

          <View style={styles.receiptFooter}>
            <Text style={styles.footerText}>
              {settings.receipt_footer || 'Thank you for shopping with us!'}
            </Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Button
            title="Share PDF Receipt"
            variant="primary"
            icon="share-outline"
            loading={isSharing}
            onPress={handleSharePdf}
            style={styles.actionBtn}
          />

          <Button
            title="Print Receipt"
            variant="outline"
            icon="print-outline"
            loading={isPrinting}
            onPress={handlePrint}
            style={styles.actionBtn}
          />
        </View>
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
  paperReceipt: {
    padding: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  storeName: {
    ...TYPOGRAPHY.h2,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: COLORS.textPrimary,
  },
  storeAddress: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  storePhone: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  invoiceMetaTable: {
    marginBottom: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  metaLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  metaVal: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dashedDivider: {
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: COLORS.borderDark,
    marginVertical: SPACING.sm,
  },
  solidDivider: {
    height: 1,
    backgroundColor: COLORS.textPrimary,
    marginVertical: SPACING.xs + 2,
  },
  itemsTableHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  thText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  itName: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  itVariant: {
    fontSize: 10,
    color: COLORS.textTertiary,
  },
  itVal: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
  },
  itValBold: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  calcLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  calcVal: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  discountLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
  },
  discountVal: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.danger,
  },
  netTotalLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '800',
  },
  netTotalVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
  },
  paidVal: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.success,
  },
  balanceDueLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.warning,
  },
  balanceDueVal: {
    ...TYPOGRAPHY.caption,
    fontWeight: '800',
    color: COLORS.warning,
  },
  settledText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.success,
  },
  receiptFooter: {
    alignItems: 'center',
    paddingTop: SPACING.xs,
  },
  footerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'column',
  },
  actionBtn: {
    marginBottom: SPACING.sm,
  },
});
