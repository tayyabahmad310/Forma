/**
 * Receipt Preview & Local PDF Sharing Screen
 * High-end boutique paper receipt view and instant thermal/PDF printer.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { getSaleById, getSaleItems } from '../../repositories/saleRepository';
import { getPaymentsForSale } from '../../repositories/paymentRepository';
import { shareReceiptPdf, printReceiptDirect } from '../../services/receiptService';
import { formatCurrency } from '../../utils/currency';
import { formatDate, formatTime } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import ScreenContainer from '../../components/common/ScreenContainer';
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
      <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
        <Header title="Receipt" onBack={() => navigation.goBack()} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
      <Header
        title={`Receipt #${sale.invoice_number}`}
        subtitle="Customer Paper & PDF Copy"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Paper Receipt Simulation */}
        <View style={styles.paperReceipt}>
          {/* Header */}
          <View style={styles.receiptHeader}>
            <View style={styles.monogram}>
              <Text style={styles.monogramText}>
                {(settings.business_name || 'CLOTHIO').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.storeName}>{settings.business_name || 'Clothio Apparel'}</Text>
            {settings.business_address ? (
              <Text style={styles.storeAddress}>{settings.business_address}</Text>
            ) : null}
            {settings.business_phone ? (
              <Text style={styles.storePhone}>{settings.business_phone}</Text>
            ) : null}
          </View>

          <View style={styles.dashedLine} />

          {/* Meta Info */}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Invoice: #{sale.invoice_number}</Text>
            <Text style={styles.metaLabel}>{formatDate(sale.sale_date)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>
              Client: {sale.customer_name_snapshot || 'Walk-in Guest'}
            </Text>
            <Text style={styles.metaLabel}>{formatTime(sale.created_at)}</Text>
          </View>

          <View style={styles.dashedLine} />

          {/* Items Table */}
          <View style={styles.itemsTable}>
            {items.map((it, idx) => (
              <View key={it.id || idx} style={styles.receiptItemRow}>
                <View style={styles.itemTitleCol}>
                  <Text style={styles.receiptItemTitle}>{it.product_name_snapshot}</Text>
                  <Text style={styles.receiptItemMeta}>
                    {it.size_snapshot} / {it.color_snapshot} • {it.quantity} x {formatCurrency(it.unit_price, currencySymbol)}
                  </Text>
                </View>
                <Text style={styles.receiptItemSubtotal}>
                  {formatCurrency(it.subtotal, currencySymbol)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.dashedLine} />

          {/* Totals */}
          <View style={styles.totalsTable}>
            <View style={styles.tRow}>
              <Text style={styles.tLabel}>Subtotal</Text>
              <Text style={styles.tVal}>{formatCurrency(sale.subtotal, currencySymbol)}</Text>
            </View>

            {sale.discount_amount > 0 && (
              <View style={styles.tRow}>
                <Text style={styles.tLabel}>Discount</Text>
                <Text style={styles.tVal}>-{formatCurrency(sale.discount_amount, currencySymbol)}</Text>
              </View>
            )}

            <View style={styles.tGrandRow}>
              <Text style={styles.tGrandLabel}>Total Amount</Text>
              <Text style={styles.tGrandVal}>{formatCurrency(sale.total_amount, currencySymbol)}</Text>
            </View>

            <View style={styles.tRow}>
              <Text style={styles.tLabel}>Paid Amount ({sale.payment_method})</Text>
              <Text style={styles.tVal}>{formatCurrency(sale.paid_amount, currencySymbol)}</Text>
            </View>

            {sale.total_amount > sale.paid_amount && (
              <View style={styles.tRow}>
                <Text style={[styles.tLabel, { color: COLORS.danger, fontWeight: '700' }]}>
                  Balance Due
                </Text>
                <Text style={[styles.tVal, { color: COLORS.danger, fontWeight: '800' }]}>
                  {formatCurrency(sale.total_amount - sale.paid_amount, currencySymbol)}
                </Text>
              </View>
            )}
          </View>

          {/* Footer Tagline */}
          <View style={styles.dashedLine} />
          <Text style={styles.footerNote}>
            {settings.receipt_footer || 'Thank you for shopping with us!'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <Button
            title="Share PDF Receipt"
            icon="share-outline"
            variant="outline"
            loading={isSharing}
            onPress={handleSharePdf}
            style={styles.actionBtn}
          />
          <Button
            title="Print Receipt"
            icon="print-outline"
            variant="primary"
            loading={isPrinting}
            onPress={handlePrint}
            style={styles.actionBtn}
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
  paperReceipt: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  monogram: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  monogramText: {
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
    color: COLORS.primary,
  },
  storeName: {
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  storeAddress: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  storePhone: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  dashedLine: {
    height: 1,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderStyle: 'dashed',
    marginVertical: SPACING.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  metaLabel: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textSecondary,
  },
  itemsTable: {
    paddingVertical: SPACING.xs,
  },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  itemTitleCol: {
    flex: 1,
    marginRight: SPACING.md,
  },
  receiptItemTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  receiptItemMeta: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginTop: 1,
  },
  receiptItemSubtotal: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  totalsTable: {
    gap: 4,
  },
  tRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tLabel: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textSecondary,
  },
  tVal: {
    ...TYPOGRAPHY.captionSmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  tGrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
    marginVertical: 4,
  },
  tGrandLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  tGrandVal: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '800',
    color: COLORS.primary,
  },
  footerNote: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    borderRadius: RADIUS.pill,
  },
});
