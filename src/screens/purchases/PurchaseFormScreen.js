/**
 * New Purchase Order / Stock Inward Form Screen
 * Safe-area aware boutique bulk procurement form.
 */

import React, { useState, useEffect } from 'react';
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
import { createPurchase } from '../../repositories/purchaseRepository';
import { getAllSuppliers, createSupplier } from '../../repositories/supplierRepository';
import { searchVariantsForPOS } from '../../repositories/productRepository';
import { formatCurrency, toMinorUnits, toMajorUnits } from '../../utils/currency';
import { getTodayDateString } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import ScreenContainer from '../../components/common/ScreenContainer';
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
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
      <Header
        title="New Stock Purchase"
        subtitle="Inward PO & Bulk Restock"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Supplier & Invoice Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Vendor Information</Text>
            <TouchableOpacity onPress={() => setShowAddSupplierModal(true)}>
              <Text style={styles.linkText}>+ Add Supplier</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.supplierPills}>
            <TouchableOpacity
              style={[styles.suppPill, selectedSupplierId === null && styles.suppPillSelected]}
              onPress={() => setSelectedSupplierId(null)}
              activeOpacity={0.8}
            >
              <Text style={[styles.suppPillText, selectedSupplierId === null && styles.suppPillTextSelected]}>
                Direct / Anonymous
              </Text>
            </TouchableOpacity>
            {suppliers.map((s) => {
              const isSelected = selectedSupplierId === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.suppPill, isSelected && styles.suppPillSelected]}
                  onPress={() => setSelectedSupplierId(s.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.suppPillText, isSelected && styles.suppPillTextSelected]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="Vendor Invoice # (Optional)"
                value={purchaseInvoiceNumber}
                onChangeText={setPurchaseInvoiceNumber}
                placeholder="e.g. INV-9042"
              />
            </View>
            <View style={styles.col}>
              <Input
                label="Inward Date"
                value={purchaseDate}
                onChangeText={setPurchaseDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>
        </Card>

        {/* Stock Items Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Apparel Items to Inward</Text>
              <Text style={styles.cardSubtitle}>{items.length} items selected</Text>
            </View>
            <TouchableOpacity
              style={styles.addItemsBtn}
              onPress={loadVariantCatalog}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color={COLORS.primary} />
              <Text style={styles.addItemsBtnText}>Add Items</Text>
            </TouchableOpacity>
          </View>

          {items.map((it, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{it.productName}</Text>
                <Text style={styles.itemVariant}>{it.variantName}</Text>
              </View>

              <View style={styles.inputsRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.microLabel}>Qty</Text>
                  <Input
                    value={String(it.quantity)}
                    onChangeText={(val) => updateItemQty(idx, val)}
                    keyboardType="number-pad"
                    containerStyle={styles.compactInput}
                  />
                </View>

                <View style={styles.inputCol}>
                  <Text style={styles.microLabel}>Unit Cost</Text>
                  <Input
                    value={it.unitCostInput}
                    onChangeText={(val) => updateItemCost(idx, val)}
                    keyboardType="numeric"
                    containerStyle={styles.compactInput}
                  />
                </View>

                <View style={styles.subtotalCol}>
                  <Text style={styles.microLabel}>Subtotal</Text>
                  <Text style={styles.itemSubtotal}>
                    {formatCurrency(it.subtotal, currencySymbol)}
                  </Text>
                </View>

                <TouchableOpacity onPress={() => removeItem(idx)} style={styles.removeBtn}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {items.length === 0 && (
            <TouchableOpacity
              style={styles.pickPrompt}
              onPress={loadVariantCatalog}
              activeOpacity={0.7}
            >
              <Ionicons name="shirt-outline" size={28} color={COLORS.textTertiary} />
              <Text style={styles.pickPromptText}>Tap to select clothes from catalog to restock</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Financials & Settlement */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Cost Totals & Payment</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="Freight / Packing (+)"
                value={additionalCosts}
                onChangeText={setAdditionalCosts}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.col}>
              <Input
                label="Supplier Discount (-)"
                value={purchaseDiscount}
                onChangeText={setPurchaseDiscount}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Gross Subtotal</Text>
              <Text style={styles.totalVal}>{formatCurrency(subtotal, currencySymbol)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.grandLabel}>Net Inward Amount</Text>
              <Text style={styles.grandVal}>{formatCurrency(totalAmount, currencySymbol)}</Text>
            </View>
          </View>

          <Input
            label={`Amount Paid to Supplier (${currencySymbol})`}
            value={paidAmount}
            onChangeText={setPaidAmount}
            placeholder="0"
            keyboardType="numeric"
          />

          {balanceDue > 0 ? (
            <View style={styles.dueNotice}>
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.danger} />
              <Text style={styles.dueNoticeText}>
                Remaining Supplier Due: {formatCurrency(balanceDue, currencySymbol)}
              </Text>
            </View>
          ) : null}

          <Button
            title="Confirm Inward Purchase"
            variant="primary"
            loading={submitting}
            onPress={handleSavePurchase}
            style={styles.submitBtn}
          />
        </Card>
      </ScrollView>

      {/* Item Picker Modal */}
      <ModalSheet
        visible={showItemPickerModal}
        onClose={() => setShowItemPickerModal(false)}
        title="Select Clothing Variant"
        subtitle="Choose variant to add stock to"
      >
        <ScrollView style={styles.modalVariantList}>
          {allVariants.map((v) => (
            <TouchableOpacity
              key={v.variant_id}
              style={styles.modalVariantItem}
              onPress={() => handleSelectItemToPurchase(v)}
            >
              <View>
                <Text style={styles.modalVariantTitle}>{v.product_name}</Text>
                <Text style={styles.modalVariantSub}>
                  {v.size} / {v.color} • Available: {v.current_stock} pcs
                </Text>
              </View>
              <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ModalSheet>

      {/* Add Supplier Modal */}
      <ModalSheet
        visible={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        title="Add Vendor"
        subtitle="Quickly register new apparel supplier"
      >
        <Input
          label="Vendor Name *"
          value={newSuppName}
          onChangeText={setNewSuppName}
          placeholder="e.g. Al-Karam Wholesale"
        />

        <Input
          label="Phone / WhatsApp"
          value={newSuppPhone}
          onChangeText={setNewSuppPhone}
          placeholder="e.g. +92 300 1234567"
          keyboardType="phone-pad"
        />

        <Button
          title="Save Vendor"
          variant="primary"
          onPress={handleCreateSupplier}
          style={styles.modalBtn}
        />
      </ModalSheet>
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
  cardSubtitle: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  linkText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '700',
  },
  supplierPills: {
    gap: 8,
    paddingVertical: SPACING.sm,
  },
  suppPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suppPillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  suppPillText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  suppPillTextSelected: {
    color: COLORS.textInverse,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  col: {
    flex: 1,
  },
  addItemsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primarySurface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(91,36,19,0.15)',
  },
  addItemsBtnText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.primary,
    fontWeight: '700',
    marginLeft: 4,
  },
  itemRow: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  itemInfo: {
    marginBottom: 6,
  },
  itemName: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemVariant: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textSecondary,
  },
  inputsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputCol: {
    width: 75,
  },
  microLabel: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    fontSize: 10,
    marginBottom: 2,
  },
  compactInput: {
    marginBottom: 0,
  },
  subtotalCol: {
    flex: 1,
    paddingBottom: 8,
  },
  itemSubtotal: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '800',
    color: COLORS.primary,
  },
  removeBtn: {
    paddingBottom: 10,
  },
  pickPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: RADIUS.lg,
  },
  pickPromptText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  totalsBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginVertical: SPACING.md,
    gap: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  totalVal: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textSecondary,
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
  dueNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(197, 83, 62, 0.12)',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  dueNoticeText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.danger,
    fontWeight: '700',
  },
  submitBtn: {
    borderRadius: RADIUS.pill,
  },
  modalVariantList: {
    maxHeight: 320,
  },
  modalVariantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalVariantTitle: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalVariantSub: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  modalBtn: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.pill,
  },
});
