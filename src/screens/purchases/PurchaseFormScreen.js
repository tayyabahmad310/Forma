/**
 * New Purchase Order / Stock Inward Form Screen
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
import { createPurchase } from '../../repositories/purchaseRepository';
import { getAllSuppliers, createSupplier } from '../../repositories/supplierRepository';
import { searchVariantsForPOS } from '../../repositories/productRepository';
import { formatCurrency, toMinorUnits, toMajorUnits } from '../../utils/currency';
import { getTodayDateString } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import ModalSheet from '../../components/common/ModalSheet';

export default function PurchaseFormScreen({ navigation }) {
  const { currencySymbol, notifyDataChanged } = useApp();

  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [purchaseInvoiceNumber, setPurchaseInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(getTodayDateString());
  const [additionalCosts, setAdditionalCosts] = useState('');
  const [purchaseDiscount, setPurchaseDiscount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Purchase line items: array of { productId, variantId, productName, variantName, quantity, unitCost, subtotal }
  const [items, setItems] = useState([]);

  // Item Picker Modal
  const [showItemPickerModal, setShowItemPickerModal] = useState(false);
  const [allVariants, setAllVariants] = useState([]);
  const [variantSearch, setVariantSearch] = useState('');

  // Add Supplier Inline Modal
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSuppName, setNewSuppName] = useState('');
  const [newSuppPhone, setNewSuppPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supps = await getAllSuppliers();
        setSuppliers(supps);
      } catch (err) {
        console.warn('Error loading suppliers:', err);
      }
    })();
  }, []);

  const loadVariantCatalog = async () => {
    try {
      const vars = await searchVariantsForPOS(variantSearch, 50);
      setAllVariants(vars);
      setShowItemPickerModal(true);
    } catch (err) {
      console.warn('Error loading variants:', err);
    }
  };

  const handleSelectItemToPurchase = (variant) => {
    const existingIndex = items.findIndex((it) => it.variantId === variant.variant_id);
    if (existingIndex > -1) {
      Alert.alert('Item in List', 'This variant is already in your purchase list. Adjust quantity there.');
      return;
    }

    const defaultCost = variant.purchase_cost || 0;
    setItems((prev) => [
      ...prev,
      {
        productId: variant.product_id,
        variantId: variant.variant_id,
        productName: variant.product_name,
        variantName: `${variant.size} / ${variant.color}`,
        quantity: 10,
        unitCost: defaultCost,
        unitCostInput: String(toMajorUnits(defaultCost)),
        subtotal: defaultCost * 10,
      },
    ]);
    setShowItemPickerModal(false);
  };

  const updateItemQty = (index, qtyStr) => {
    const q = parseInt(qtyStr, 10) || 0;
    setItems((prev) => {
      const copy = [...prev];
      const it = copy[index];
      copy[index] = { ...it, quantity: q, subtotal: it.unitCost * q };
      return copy;
    });
  };

  const updateItemCost = (index, costStr) => {
    const costMinor = toMinorUnits(costStr);
    setItems((prev) => {
      const copy = [...prev];
      const it = copy[index];
      copy[index] = {
        ...it,
        unitCost: costMinor,
        unitCostInput: costStr,
        subtotal: costMinor * it.quantity,
      };
      return copy;
    });
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Computations
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discountMinor = toMinorUnits(purchaseDiscount);
  const additionalMinor = toMinorUnits(additionalCosts);
  const totalAmount = Math.max(0, subtotal - discountMinor + additionalMinor);

  // Auto-fill paid amount if empty
  useEffect(() => {
    if (!paidAmount) {
      setPaidAmount(String(toMajorUnits(totalAmount)));
    }
  }, [totalAmount]);

  const paidMinor = paidAmount ? toMinorUnits(paidAmount) : totalAmount;
  const balanceDue = Math.max(0, totalAmount - paidMinor);

  const handleCreateSupplier = async () => {
    if (!newSuppName.trim()) {
      Alert.alert('Required', 'Supplier name is required');
      return;
    }
    try {
      const supp = await createSupplier({
        name: newSuppName.trim(),
        phone: newSuppPhone.trim() || null,
      });
      setSuppliers((prev) => [supp, ...prev]);
      setSelectedSupplierId(supp.id);
      setShowAddSupplierModal(false);
      setNewSuppName('');
      setNewSuppPhone('');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create supplier');
    }
  };

  const handleSavePurchase = async () => {
    if (items.length === 0) {
      Alert.alert('Empty Order', 'Please add at least one clothing item to inward.');
      return;
    }

    try {
      setSubmitting(true);

      const itemsPayload = items.map((it) => ({
        productId: it.productId,
        variantId: it.variantId,
        quantity: it.quantity,
        unitCost: it.unitCost,
        subtotal: it.subtotal,
      }));

      await createPurchase({
        invoiceNumber: purchaseInvoiceNumber.trim() || null,
        supplierId: selectedSupplierId,
        purchaseDate,
        subtotal,
        discountAmount: discountMinor,
        additionalCosts: additionalMinor,
        totalAmount,
        paidAmount: Math.min(totalAmount, paidMinor),
        paymentStatus: balanceDue === 0 ? 'PAID' : paidMinor > 0 ? 'PARTIAL' : 'UNPAID',
        notes: notes.trim() || null,
        items: itemsPayload,
      });

      notifyDataChanged();
      Alert.alert('Success', 'Inward stock purchase recorded and inventory updated!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save purchase');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="New Stock Purchase" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Supplier & Invoice Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Supplier Information</Text>
            <TouchableOpacity onPress={() => setShowAddSupplierModal(true)}>
              <Text style={styles.linkText}>+ Add Supplier</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.supplierPillsRow}>
            <TouchableOpacity
              style={[styles.chip, selectedSupplierId === null && styles.chipSelected]}
              onPress={() => setSelectedSupplierId(null)}
            >
              <Text style={[styles.chipText, selectedSupplierId === null && styles.chipTextSelected]}>
                Direct / Unassigned
              </Text>
            </TouchableOpacity>

            {suppliers.map((s) => {
              const isSelected = selectedSupplierId === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setSelectedSupplierId(s.id)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Input
            label="Supplier Invoice / Reference #"
            value={purchaseInvoiceNumber}
            onChangeText={setPurchaseInvoiceNumber}
            placeholder="Leave blank for auto-generated reference"
          />

          <Input
            label="Purchase Date (YYYY-MM-DD)"
            value={purchaseDate}
            onChangeText={setPurchaseDate}
            placeholder="YYYY-MM-DD"
          />
        </Card>

        {/* Inward Items */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Inward Stock Items ({items.length})</Text>
            <Button
              title="+ Add Item"
              variant="outline"
              size="sm"
              onPress={loadVariantCatalog}
            />
          </View>

          {items.length === 0 ? (
            <Text style={styles.emptyItemsText}>
              No items added. Tap "+ Add Item" to select clothing items.
            </Text>
          ) : (
            items.map((it, idx) => (
              <View key={`${it.variantId}-${idx}`} style={styles.itemCard}>
                <View style={styles.itemTopRow}>
                  <View style={styles.itemHeaderLeft}>
                    <Text style={styles.itemName}>{it.productName}</Text>
                    <Text style={styles.itemVariant}>Variant: {it.variantName}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeItem(idx)}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>

                <View style={styles.itemInputRow}>
                  <View style={styles.itemInputCol}>
                    <Input
                      label="Inward Qty"
                      value={String(it.quantity)}
                      onChangeText={(val) => updateItemQty(idx, val)}
                      placeholder="1"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.itemInputCol}>
                    <Input
                      label={`Cost/Unit (${currencySymbol})`}
                      value={it.unitCostInput}
                      onChangeText={(val) => updateItemCost(idx, val)}
                      placeholder="0"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.itemSubtotalCol}>
                    <Text style={styles.subtotalLabel}>Subtotal</Text>
                    <Text style={styles.subtotalVal}>
                      {formatCurrency(it.subtotal, currencySymbol)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Costs & Settlements */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Additional Costs & Payments</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label={`Supplier Discount (${currencySymbol})`}
                value={purchaseDiscount}
                onChangeText={setPurchaseDiscount}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.col}>
              <Input
                label={`Shipping / Carriage (${currencySymbol})`}
                value={additionalCosts}
                onChangeText={setAdditionalCosts}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </View>

          <Input
            label={`Amount Paid to Supplier (${currencySymbol})`}
            value={paidAmount}
            onChangeText={setPaidAmount}
            placeholder="0"
            keyboardType="numeric"
          />

          <Input
            label="Purchase Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes about supplier, delivery condition, or terms..."
          />
        </Card>

        {/* Totals Summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items Subtotal</Text>
            <Text style={styles.summaryVal}>{formatCurrency(subtotal, currencySymbol)}</Text>
          </View>
          {discountMinor > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Supplier Discount</Text>
              <Text style={styles.discountVal}>-{formatCurrency(discountMinor, currencySymbol)}</Text>
            </View>
          )}
          {additionalMinor > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping & Delivery</Text>
              <Text style={styles.summaryVal}>+{formatCurrency(additionalMinor, currencySymbol)}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.grandTotalLabel}>Total Purchase Cost</Text>
            <Text style={styles.grandTotalVal}>{formatCurrency(totalAmount, currencySymbol)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount Paid</Text>
            <Text style={styles.paidVal}>{formatCurrency(paidMinor, currencySymbol)}</Text>
          </View>
          {balanceDue > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.balanceDueLabel}>Remaining Supplier Payable</Text>
              <Text style={styles.balanceDueVal}>{formatCurrency(balanceDue, currencySymbol)}</Text>
            </View>
          ) : (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment Status</Text>
              <Text style={styles.paidVal}>Fully Paid</Text>
            </View>
          )}
        </Card>

        <Button
          title="Confirm Purchase & Inward Stock"
          variant="primary"
          size="lg"
          loading={submitting}
          onPress={handleSavePurchase}
          style={styles.submitBtn}
        />
      </ScrollView>

      {/* Select Item Modal */}
      <ModalSheet
        visible={showItemPickerModal}
        onClose={() => setShowItemPickerModal(false)}
        title="Select Clothing Item"
        subtitle="Choose item and size/color variant to purchase"
      >
        <ScrollView style={{ maxHeight: 400 }}>
          {allVariants.map((v) => (
            <TouchableOpacity
              key={v.variant_id}
              style={styles.pickerItem}
              onPress={() => handleSelectItemToPurchase(v)}
            >
              <View>
                <Text style={styles.pickerItemName}>{v.product_name}</Text>
                <Text style={styles.pickerItemVariant}>
                  Size: {v.size} | Color: {v.color}
                </Text>
              </View>
              <Text style={styles.pickerItemCost}>
                Cost: {formatCurrency(v.purchase_cost || 0, currencySymbol)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ModalSheet>

      {/* Add Supplier Modal */}
      <ModalSheet
        visible={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        title="Add Supplier"
        subtitle="Save supplier contact for purchase orders"
      >
        <Input
          label="Supplier Name *"
          value={newSuppName}
          onChangeText={setNewSuppName}
          placeholder="e.g. Master Fabrics & Garments"
        />

        <Input
          label="Phone Number"
          value={newSuppPhone}
          onChangeText={setNewSuppPhone}
          placeholder="e.g. 0321 9876543"
          keyboardType="phone-pad"
        />

        <Button
          title="Save Supplier"
          variant="primary"
          onPress={handleCreateSupplier}
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
  },
  linkText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
  },
  supplierPillsRow: {
    marginBottom: SPACING.md,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSubtle,
    marginRight: SPACING.xs,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  emptyItemsText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    paddingVertical: SPACING.sm,
  },
  itemCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  itemHeaderLeft: {
    flex: 1,
  },
  itemName: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemVariant: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  itemInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemInputCol: {
    flex: 1,
    marginRight: SPACING.xs,
  },
  itemSubtotalCol: {
    minWidth: 70,
    alignItems: 'flex-end',
    paddingBottom: 4,
  },
  subtotalLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  subtotalVal: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  row: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  summaryCard: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
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
  },
  discountVal: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.danger,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.sm,
  },
  grandTotalLabel: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
  },
  grandTotalVal: {
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
  submitBtn: {
    marginTop: SPACING.lg,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  pickerItemName: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  pickerItemVariant: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  pickerItemCost: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
