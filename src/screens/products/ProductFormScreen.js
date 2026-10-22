/**
 * Product & Variants Creation / Editing Screen
 * High-end boutique form with safe area insets, pill styling, and luxury palette.
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
import {
  createProduct,
  updateProduct,
  getProductWithVariants,
} from '../../repositories/productRepository';
import { getAllCategories } from '../../repositories/categoryRepository';
import { CLOTHING_SIZES, CLOTHING_COLORS } from '../../constants/config';
import { toMinorUnits, toMajorUnits } from '../../utils/currency';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import ScreenContainer from '../../components/common/ScreenContainer';
import Header from '../../components/common/Header';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

export default function ProductFormScreen({ route, navigation }) {
  const { currencySymbol, notifyDataChanged } = useApp();
  const productId = route.params?.productId;
  const isEditing = Boolean(productId);

  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [description, setDescription] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [minStockAlert, setMinStockAlert] = useState('5');

  // Variations list: array of { size, color, sku, initialStock, purchaseCost, sellingPrice }
  const [variants, setVariants] = useState([
    { size: 'M', color: 'Black', sku: '', initialStock: '10' },
  ]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const cats = await getAllCategories();
        setCategories(cats);

        if (isEditing) {
          const prod = await getProductWithVariants(productId);
          if (prod) {
            setName(prod.name);
            setSku(prod.sku || '');
            setCategoryId(prod.category_id);
            setDescription(prod.description || '');
            setPurchaseCost(String(toMajorUnits(prod.default_purchase_cost)));
            setSellingPrice(String(toMajorUnits(prod.default_selling_price)));
            setMinStockAlert(String(prod.min_stock_alert));

            if (prod.variants && prod.variants.length > 0) {
              setVariants(
                prod.variants.map((v) => ({
                  id: v.id,
                  size: v.size,
                  color: v.color,
                  sku: v.sku || '',
                  initialStock: String(v.current_stock),
                  purchaseCost: v.purchase_cost !== null ? String(toMajorUnits(v.purchase_cost)) : '',
                  sellingPrice: v.selling_price !== null ? String(toMajorUnits(v.selling_price)) : '',
                }))
              );
            }
          }
        }
      } catch (err) {
        console.warn('Error loading product details:', err);
      }
    })();
  }, [productId, isEditing]);

  const handleAddVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      { size: 'L', color: 'White', sku: '', initialStock: '10' },
    ]);
  };

  const handleRemoveVariantRow = (index) => {
    if (variants.length <= 1) {
      Alert.alert('Required', 'Product must have at least one variation.');
      return;
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariantField = (index, field, value) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Product name is required';
    if (!sellingPrice || isNaN(Number(sellingPrice)) || Number(sellingPrice) < 0) {
      errs.sellingPrice = 'Enter a valid selling price';
    }
    if (purchaseCost && isNaN(Number(purchaseCost))) {
      errs.purchaseCost = 'Enter a valid purchase cost';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      const defaultCostMinor = toMinorUnits(purchaseCost);
      const defaultPriceMinor = toMinorUnits(sellingPrice);
      const minAlertNum = parseInt(minStockAlert, 10) || 5;

      const productData = {
        name: name.trim(),
        categoryId,
        sku: sku.trim() || null,
        description: description.trim() || null,
        defaultPurchaseCost: defaultCostMinor,
        defaultSellingPrice: defaultPriceMinor,
        minStockAlert: minAlertNum,
      };

      if (isEditing) {
        await updateProduct(productId, productData);
      } else {
        const variantsData = variants.map((v) => ({
          size: v.size,
          color: v.color,
          sku: v.sku.trim() || null,
          initialStock: parseInt(v.initialStock, 10) || 0,
          purchaseCost: v.purchaseCost ? toMinorUnits(v.purchaseCost) : defaultCostMinor,
          sellingPrice: v.sellingPrice ? toMinorUnits(v.sellingPrice) : defaultPriceMinor,
        }));

        await createProduct(productData, variantsData);
      }

      notifyDataChanged();
      Alert.alert('Success', `Product ${isEditing ? 'updated' : 'created'} successfully!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
      <Header
        title={isEditing ? 'Edit Product' : 'Add New Product'}
        subtitle="Catalogue & Inventory Item"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Basic Details */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Basic Information</Text>

          <Input
            label="Product Title *"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Linen Blend Blazer"
            error={errors.name}
          />

          <Input
            label="Master Product SKU / Barcode"
            value={sku}
            onChangeText={setSku}
            placeholder="e.g. BLZ-LIN-001"
          />

          {/* Category Picker */}
          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryPills}
          >
            {categories.map((c) => {
              const isSelected = categoryId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.pill, isSelected && styles.pillSelected]}
                  onPress={() => setCategoryId(c.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Input
            label="Description / Fabric Notes"
            value={description}
            onChangeText={setDescription}
            placeholder="Pure linen, tailored lapel, dry clean only."
            multiline
            numberOfLines={2}
          />
        </Card>

        {/* Pricing & Stock Rules */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Default Pricing & Stock Rules</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label={`Selling Price (${currencySymbol}) *`}
                value={sellingPrice}
                onChangeText={setSellingPrice}
                placeholder="0"
                keyboardType="numeric"
                error={errors.sellingPrice}
              />
            </View>
            <View style={styles.col}>
              <Input
                label={`Purchase Cost (${currencySymbol})`}
                value={purchaseCost}
                onChangeText={setPurchaseCost}
                placeholder="0"
                keyboardType="numeric"
                error={errors.purchaseCost}
              />
            </View>
          </View>

          <Input
            label="Low Stock Alert Threshold (Units)"
            value={minStockAlert}
            onChangeText={setMinStockAlert}
            placeholder="5"
            keyboardType="number-pad"
          />
        </Card>

        {/* Variations (Sizes & Colors) - Active for creation */}
        {!isEditing && (
          <Card style={styles.card}>
            <View style={styles.variantHeader}>
              <View>
                <Text style={styles.cardTitle}>Sizes & Colors</Text>
                <Text style={styles.cardSubtitle}>Configure inventory for each variation</Text>
              </View>
              <TouchableOpacity
                style={styles.addVariantHeaderBtn}
                onPress={handleAddVariantRow}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color={COLORS.primary} />
                <Text style={styles.addVariantHeaderText}>Add Variant</Text>
              </TouchableOpacity>
            </View>

            {variants.map((v, idx) => (
              <View key={idx} style={styles.variantRowCard}>
                <View style={styles.variantTopRow}>
                  <Text style={styles.variantIndex}>Variant #{idx + 1}</Text>
                  {variants.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoveVariantRow(idx)}>
                      <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Size Pills */}
                <Text style={styles.microLabel}>Select Size</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                  {CLOTHING_SIZES.map((sz) => (
                    <TouchableOpacity
                      key={sz}
                      style={[styles.chip, v.size === sz && styles.chipSelected]}
                      onPress={() => updateVariantField(idx, 'size', sz)}
                    >
                      <Text style={[styles.chipText, v.size === sz && styles.chipTextSelected]}>
                        {sz}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Color Pills */}
                <Text style={styles.microLabel}>Select Color</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                  {CLOTHING_COLORS.map((col) => (
                    <TouchableOpacity
                      key={col}
                      style={[styles.chip, v.color === col && styles.chipSelected]}
                      onPress={() => updateVariantField(idx, 'color', col)}
                    >
                      <Text style={[styles.chipText, v.color === col && styles.chipTextSelected]}>
                        {col}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.row}>
                  <View style={styles.col}>
                    <Input
                      label="Initial Stock Qty"
                      value={v.initialStock}
                      onChangeText={(val) => updateVariantField(idx, 'initialStock', val)}
                      placeholder="0"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.col}>
                    <Input
                      label="Variant SKU"
                      value={v.sku}
                      onChangeText={(val) => updateVariantField(idx, 'sku', val)}
                      placeholder="e.g. BLZ-M-BLK"
                    />
                  </View>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Submit */}
        <Button
          title={isEditing ? 'Save Changes' : 'Create Clothing Product'}
          variant="primary"
          size="lg"
          loading={saving}
          onPress={handleSave}
          style={styles.submitButton}
        />
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
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryPills: {
    paddingBottom: SPACING.md,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  pillTextSelected: {
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  col: {
    flex: 1,
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  addVariantHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primarySurface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(91,36,19,0.15)',
  },
  addVariantHeaderText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.primary,
    fontWeight: '700',
    marginLeft: 4,
  },
  variantRowCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  variantTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  variantIndex: {
    ...TYPOGRAPHY.caption,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  microLabel: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  horizontalChips: {
    marginBottom: SPACING.sm,
  },
  chip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textPrimary,
  },
  chipTextSelected: {
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.pill,
  },
});
