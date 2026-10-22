/**
 * Checkout & Payment Screen
 * Finalizes sale, calculates discounts, registers customer, records payment, and prints receipt.
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
import { createSale } from '../../repositories/saleRepository';
import { getAllCustomers, createCustomer } from '../../repositories/customerRepository';
import { formatCurrency, toMinorUnits, toMajorUnits, calculateDiscount } from '../../utils/currency';
import { PAYMENT_METHODS, DISCOUNT_TYPES } from '../../constants/config';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import CartItemRow from '../../components/pos/CartItemRow';
import ModalSheet from '../../components/common/ModalSheet';

export default function CheckoutScreen({ route, navigation }) {
  const { currencySymbol, notifyDataChanged } = useApp();
  const initialCart = route.params?.cart || [];
  const onClearCart = route.params?.onClearCart;

  const [cart, setCart] = useState(initialCart);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');

  // Global Sale Discount
  const [globalDiscountType, setGlobalDiscountType] = useState(DISCOUNT_TYPES.NONE);
  const [globalDiscountVal, setGlobalDiscountVal] = useState('');

  // Payment Options
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // Line item discount modal state
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [itemCustomPrice, setItemCustomPrice] = useState('');
  const [itemDiscountType, setItemDiscountType] = useState(DISCOUNT_TYPES.NONE);
  const [itemDiscountVal, setItemDiscountVal] = useState('');

  // New customer inline modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const list = await getAllCustomers();
        setCustomers(list);
      } catch (err) {
        console.warn('Error fetching customers:', err);
      }
    })();
  }, []);

  // Update cart item quantity
  const handleUpdateQty = (index, delta) => {
    setCart((prev) => {
      const copy = [...prev];
      const item = copy[index];
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      if (newQty > item.currentStock) {
        Alert.alert('Stock Limit', `Only ${item.currentStock} units available.`);
        return prev;
      }
      const unitP = item.customUnitPrice !== null ? item.customUnitPrice : item.sellingPrice;
      const sub = unitP * newQty - (item.discountAmount || 0);
      copy[index] = { ...item, quantity: newQty, subtotal: Math.max(0, sub) };
      return copy;
    });
  };

  const handleRemoveItem = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const rawSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

  let globalDiscountAmount = 0;
  if (globalDiscountType === DISCOUNT_TYPES.PERCENTAGE) {
    const pct = Math.min(100, Math.max(0, parseFloat(globalDiscountVal) || 0));
    globalDiscountAmount = Math.round((rawSubtotal * pct) / 100);
  } else if (globalDiscountType === DISCOUNT_TYPES.FIXED) {
    globalDiscountAmount = Math.min(rawSubtotal, toMinorUnits(globalDiscountVal));
  }

  const grandTotal = Math.max(0, rawSubtotal - globalDiscountAmount);

  // Auto-fill paid amount input if untouched
  useEffect(() => {
    if (!paidAmountInput) {
      setPaidAmountInput(String(toMajorUnits(grandTotal)));
    }
  }, [grandTotal]);

  const paidMinor = paidAmountInput ? toMinorUnits(paidAmountInput) : grandTotal;
  const balanceMinor = Math.max(0, grandTotal - paidMinor);

  // Open line item discount modal
  const openEditDiscountModal = (index) => {
    const item = cart[index];
    setEditingItemIndex(index);
    setItemCustomPrice(item.customUnitPrice !== null ? String(toMajorUnits(item.customUnitPrice)) : '');
    setItemDiscountType(DISCOUNT_TYPES.NONE);
    setItemDiscountVal('');
  };

  const saveLineItemDiscount = () => {
    if (editingItemIndex === null) return;
    setCart((prev) => {
      const copy = [...prev];
      const item = copy[editingItemIndex];
      const customPriceMinor = itemCustomPrice ? toMinorUnits(itemCustomPrice) : null;
      const activeUnit = customPriceMinor !== null ? customPriceMinor : item.sellingPrice;
      const baseLine = activeUnit * item.quantity;

      let discAmount = 0;
      if (itemDiscountType === DISCOUNT_TYPES.PERCENTAGE) {
        const pct = Math.min(100, Math.max(0, parseFloat(itemDiscountVal) || 0));
        discAmount = Math.round((baseLine * pct) / 100);
      } else if (itemDiscountType === DISCOUNT_TYPES.FIXED) {
        discAmount = Math.min(baseLine, toMinorUnits(itemDiscountVal));
      }

      copy[editingItemIndex] = {
        ...item,
        customUnitPrice: customPriceMinor,
        discountAmount: discAmount,
        subtotal: Math.max(0, baseLine - discAmount),
      };
      return copy;
    });
    setEditingItemIndex(null);
  };

  // Add customer inline
  const handleAddNewCustomer = async () => {
    if (!newCustName.trim()) {
      Alert.alert('Required', 'Please enter customer name');
      return;
    }
    try {
      const created = await createCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim() || null,
      });
      setCustomers((prev) => [created, ...prev]);
      setSelectedCustomerId(created.id);
      setCustomerName(created.name);
      setCustomerPhone(created.phone || '');
      setShowAddCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create customer');
    }
  };

  // Finalize Sale
  const handleConfirmSale = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart before proceeding.');
      return;
    }

    try {
      setProcessing(true);

      const itemsPayload = cart.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: item.sellingPrice,
        unitCost: item.unitCost,
        customUnitPrice: item.customUnitPrice,
        discountAmount: item.discountAmount || 0,
        subtotal: item.subtotal,
      }));

      const { saleId, invoiceNumber } = await createSale({
        customerId: selectedCustomerId,
        customerNameSnapshot: customerName,
        customerPhoneSnapshot: customerPhone || null,
        subtotal: rawSubtotal,
        discountType: globalDiscountType,
        discountValue: globalDiscountType === DISCOUNT_TYPES.PERCENTAGE ? parseFloat(globalDiscountVal) || 0 : toMinorUnits(globalDiscountVal),
        discountAmount: globalDiscountAmount,
        totalAmount: grandTotal,
        paidAmount: Math.min(grandTotal, paidMinor),
        paymentMethod,
        notes: notes.trim() || null,
        items: itemsPayload,
      });

      notifyDataChanged();
      if (onClearCart) onClearCart();

      // Navigate to Receipt Preview
      navigation.replace('ReceiptPreview', { saleId });
    } catch (err) {
      Alert.alert('Checkout Error', err.message || 'Transaction could not be completed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Checkout & Payment" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Customer Selector */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Customer Information</Text>
            <TouchableOpacity onPress={() => setShowAddCustomerModal(true)}>
              <Text style={styles.linkText}>+ Add New</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.customerPillsRow}>
            <TouchableOpacity
              style={[
                styles.customerChip,
                selectedCustomerId === null && styles.customerChipSelected,
              ]}
              onPress={() => {
                setSelectedCustomerId(null);
                setCustomerName('Walk-in Customer');
                setCustomerPhone('');
              }}
            >
              <Text
                style={[
                  styles.customerChipText,
                  selectedCustomerId === null && styles.customerChipTextSelected,
                ]}
              >
                Walk-in Customer
              </Text>
            </TouchableOpacity>

            {customers.map((c) => {
              const isSelected = selectedCustomerId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.customerChip, isSelected && styles.customerChipSelected]}
                  onPress={() => {
                    setSelectedCustomerId(c.id);
                    setCustomerName(c.name);
                    setCustomerPhone(c.phone || '');
                  }}
                >
                  <Text
                    style={[
                      styles.customerChipText,
                      isSelected && styles.customerChipTextSelected,
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.customerSelectedNotice}>
            <Ionicons name="person-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.customerSelectedName}>{customerName}</Text>
            {customerPhone ? <Text style={styles.customerSelectedPhone}>({customerPhone})</Text> : null}
          </View>
        </Card>

        {/* Cart Items Review */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Order Items ({cart.length})</Text>
          {cart.map((item, idx) => (
            <CartItemRow
              key={`${item.variantId}-${idx}`}
              item={item}
              currencySymbol={currencySymbol}
              onIncrement={() => handleUpdateQty(idx, 1)}
              onDecrement={() => handleUpdateQty(idx, -1)}
              onRemove={() => handleRemoveItem(idx)}
              onEditDiscount={() => openEditDiscountModal(idx)}
            />
          ))}
        </Card>

        {/* Global Sale Discount */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Order Discount</Text>
          <View style={styles.discountTypeRow}>
            <TouchableOpacity
              style={[
                styles.discountBtn,
                globalDiscountType === DISCOUNT_TYPES.NONE && styles.discountBtnActive,
              ]}
              onPress={() => setGlobalDiscountType(DISCOUNT_TYPES.NONE)}
            >
              <Text style={[styles.discountBtnText, globalDiscountType === DISCOUNT_TYPES.NONE && styles.discountBtnTextActive]}>
                No Discount
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.discountBtn,
                globalDiscountType === DISCOUNT_TYPES.PERCENTAGE && styles.discountBtnActive,
              ]}
              onPress={() => setGlobalDiscountType(DISCOUNT_TYPES.PERCENTAGE)}
            >
              <Text style={[styles.discountBtnText, globalDiscountType === DISCOUNT_TYPES.PERCENTAGE && styles.discountBtnTextActive]}>
                Percentage (%)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.discountBtn,
                globalDiscountType === DISCOUNT_TYPES.FIXED && styles.discountBtnActive,
              ]}
              onPress={() => setGlobalDiscountType(DISCOUNT_TYPES.FIXED)}
            >
              <Text style={[styles.discountBtnText, globalDiscountType === DISCOUNT_TYPES.FIXED && styles.discountBtnTextActive]}>
                Fixed ({currencySymbol})
              </Text>
            </TouchableOpacity>
          </View>

          {globalDiscountType !== DISCOUNT_TYPES.NONE && (
            <Input
              label={globalDiscountType === DISCOUNT_TYPES.PERCENTAGE ? 'Discount Rate (%)' : `Discount Amount (${currencySymbol})`}
              value={globalDiscountVal}
              onChangeText={setGlobalDiscountVal}
              placeholder={globalDiscountType === DISCOUNT_TYPES.PERCENTAGE ? 'e.g. 10' : 'e.g. 500'}
              keyboardType="numeric"
            />
          )}
        </Card>

        {/* Payment Methods */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          <View style={styles.paymentMethodsRow}>
            {PAYMENT_METHODS.map((pm) => {
              const isSelected = paymentMethod === pm.id;
              return (
                <TouchableOpacity
                  key={pm.id}
                  style={[styles.pmCard, isSelected && styles.pmCardSelected]}
                  onPress={() => setPaymentMethod(pm.id)}
                >
                  <Ionicons
                    name={
                      pm.id === 'CASH'
                        ? 'cash-outline'
                        : pm.id === 'CARD'
                        ? 'card-outline'
                        : pm.id === 'BANK'
                        ? 'business-outline'
                        : 'phone-portrait-outline'
                    }
                    size={22}
                    color={isSelected ? COLORS.textInverse : COLORS.textPrimary}
                  />
                  <Text style={[styles.pmLabel, isSelected && styles.pmLabelSelected]}>
                    {pm.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label={`Amount Paid (${currencySymbol})`}
            value={paidAmountInput}
            onChangeText={setPaidAmountInput}
            placeholder="0"
            keyboardType="numeric"
          />

          <Input
            label="Internal Transaction Note"
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional order notes or customer request..."
          />
        </Card>

        {/* Order Summary & Balance */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items Subtotal</Text>
            <Text style={styles.summaryVal}>{formatCurrency(rawSubtotal, currencySymbol)}</Text>
          </View>

          {globalDiscountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryDiscountLabel}>Discount</Text>
              <Text style={styles.summaryDiscountVal}>
                -{formatCurrency(globalDiscountAmount, currencySymbol)}
              </Text>
            </View>
          )}

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.grandTotalLabel}>Net Total Payable</Text>
            <Text style={styles.grandTotalVal}>{formatCurrency(grandTotal, currencySymbol)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Paid Amount</Text>
            <Text style={styles.summaryPaidVal}>{formatCurrency(paidMinor, currencySymbol)}</Text>
          </View>

          {balanceMinor > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.balanceDueLabel}>Remaining Customer Balance</Text>
              <Text style={styles.balanceDueVal}>{formatCurrency(balanceMinor, currencySymbol)}</Text>
            </View>
          ) : (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment Status</Text>
              <Text style={styles.fullyPaidVal}>Fully Settled</Text>
            </View>
          )}
        </Card>

        {/* Checkout Confirm Button */}
        <Button
          title="Complete Sale & Generate Receipt"
          variant="primary"
          size="lg"
          loading={processing}
          onPress={handleConfirmSale}
          style={styles.confirmBtn}
        />
      </ScrollView>

      {/* Edit Line Item Discount Modal */}
      <ModalSheet
        visible={editingItemIndex !== null}
        onClose={() => setEditingItemIndex(null)}
        title="Edit Item Price / Line Discount"
        subtitle="Apply custom selling price or discount for this specific item"
      >
        <Input
          label={`Custom Final Selling Price per Unit (${currencySymbol})`}
          value={itemCustomPrice}
          onChangeText={setItemCustomPrice}
          placeholder="Leave empty to use default catalog price"
          keyboardType="numeric"
        />

        <Text style={styles.fieldLabel}>Line Discount Type</Text>
        <View style={styles.discountTypeRow}>
          <TouchableOpacity
            style={[styles.discountBtn, itemDiscountType === DISCOUNT_TYPES.NONE && styles.discountBtnActive]}
            onPress={() => setItemDiscountType(DISCOUNT_TYPES.NONE)}
          >
            <Text style={[styles.discountBtnText, itemDiscountType === DISCOUNT_TYPES.NONE && styles.discountBtnTextActive]}>
              None
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.discountBtn, itemDiscountType === DISCOUNT_TYPES.PERCENTAGE && styles.discountBtnActive]}
            onPress={() => setItemDiscountType(DISCOUNT_TYPES.PERCENTAGE)}
          >
            <Text style={[styles.discountBtnText, itemDiscountType === DISCOUNT_TYPES.PERCENTAGE && styles.discountBtnTextActive]}>
              Percentage (%)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.discountBtn, itemDiscountType === DISCOUNT_TYPES.FIXED && styles.discountBtnActive]}
            onPress={() => setItemDiscountType(DISCOUNT_TYPES.FIXED)}
          >
            <Text style={[styles.discountBtnText, itemDiscountType === DISCOUNT_TYPES.FIXED && styles.discountBtnTextActive]}>
              Fixed ({currencySymbol})
            </Text>
          </TouchableOpacity>
        </View>

        {itemDiscountType !== DISCOUNT_TYPES.NONE && (
          <Input
            label={itemDiscountType === DISCOUNT_TYPES.PERCENTAGE ? 'Discount Rate (%)' : 'Discount Amount'}
            value={itemDiscountVal}
            onChangeText={setItemDiscountVal}
            placeholder="0"
            keyboardType="numeric"
          />
        )}

        <Button title="Apply to Item" variant="primary" onPress={saveLineItemDiscount} style={{ marginTop: 12 }} />
      </ModalSheet>

      {/* Add New Customer Inline Modal */}
      <ModalSheet
        visible={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        title="Add New Customer"
        subtitle="Register customer for balance tracking and receipt history"
      >
        <Input
          label="Customer Full Name *"
          value={newCustName}
          onChangeText={setNewCustName}
          placeholder="e.g. Tayyab Khan"
        />

        <Input
          label="Phone Number"
          value={newCustPhone}
          onChangeText={setNewCustPhone}
          placeholder="e.g. 0300 1234567"
          keyboardType="phone-pad"
        />

        <Button
          title="Save & Select Customer"
          variant="primary"
          onPress={handleAddNewCustomer}
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
    marginBottom: SPACING.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  linkText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
  },
  customerPillsRow: {
    marginBottom: SPACING.md,
  },
  customerChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSubtle,
    marginRight: SPACING.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  customerChipSelected: {
    backgroundColor: COLORS.primary,
  },
  customerChipText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  customerChipTextSelected: {
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  customerSelectedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  customerSelectedName: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: 6,
  },
  customerSelectedPhone: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  fieldLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  discountTypeRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  discountBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.sm,
    marginRight: 6,
  },
  discountBtnActive: {
    backgroundColor: COLORS.primary,
  },
  discountBtnText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  discountBtnTextActive: {
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  pmCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    marginHorizontal: 3,
  },
  pmCardSelected: {
    backgroundColor: COLORS.primary,
  },
  pmLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  pmLabelSelected: {
    color: COLORS.textInverse,
  },
  summaryCard: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  summaryVal: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  summaryDiscountLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.danger,
  },
  summaryDiscountVal: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.danger,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.sm,
  },
  grandTotalLabel: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  grandTotalVal: {
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  summaryPaidVal: {
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
  fullyPaidVal: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.success,
  },
  confirmBtn: {
    marginTop: SPACING.lg,
  },
});
