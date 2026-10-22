/**
 * Product Details & Variant Inventory Screen
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
import { getProductWithVariants, addVariant } from '../../repositories/productRepository';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import ModalSheet from '../../components/common/ModalSheet';
import Input from '../../components/common/Input';
import { CLOTHING_SIZES, CLOTHING_COLORS } from '../../constants/config';

export default function ProductDetailScreen({ route, navigation }) {
  const { currencySymbol, dataVersion, notifyDataChanged } = useApp();
  const productId = route.params?.productId;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // New variant modal state
  const [showAddVariantModal, setShowAddVariantModal] = useState(false);
  const [newSize, setNewSize] = useState('L');
  const [newColor, setNewColor] = useState('Black');
  const [newSku, setNewSku] = useState('');
  const [newStock, setNewStock] = useState('0');

  const loadDetails = useCallback(async () => {
    try {
      const data = await getProductWithVariants(productId);
      setProduct(data);
    } catch (err) {
      console.warn('Error loading product:', err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails, dataVersion]);

  const handleCreateVariant = async () => {
    try {
      await addVariant(productId, {
        size: newSize,
        color: newColor,
        sku: newSku.trim() || null,
        initialStock: parseInt(newStock, 10) || 0,
      });
      setShowAddVariantModal(false);
      notifyDataChanged();
      loadDetails();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to add variant');
    }
  };

  if (!product && !loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Product Not Found" onBack={() => navigation.goBack()} />
        <View style={styles.notFoundCenter}>
          <Text style={styles.notFoundText}>This product does not exist.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalStock = product?.total_stock || 0;
  const minAlert = product?.min_stock_alert || 5;

  let stockVariant = 'success';
  let stockLabel = `${totalStock} Units Available`;
  if (totalStock <= 0) {
    stockVariant = 'danger';
    stockLabel = 'Out of Stock';
  } else if (totalStock <= minAlert) {
    stockVariant = 'warning';
    stockLabel = `Low Stock (${totalStock} left)`;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={product?.name || 'Product Details'}
        onBack={() => navigation.goBack()}
        rightIcon="create-outline"
        onRightPress={() => navigation.navigate('ProductForm', { productId })}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Master Summary Card */}
        <Card style={styles.masterCard}>
          <View style={styles.topRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{product?.category_name || 'Uncategorized'}</Text>
            </View>
            <Badge label={stockLabel} variant={stockVariant} />
          </View>

          <Text style={styles.productTitle}>{product?.name}</Text>
          {product?.sku && <Text style={styles.skuText}>Master SKU: #{product.sku}</Text>}

          {product?.description ? (
            <Text style={styles.descText}>{product.description}</Text>
          ) : null}

          <View style={styles.pricingRow}>
            <View style={styles.priceCol}>
              <Text style={styles.priceLabel}>Selling Price</Text>
              <Text style={styles.sellingPriceVal}>
                {formatCurrency(product?.default_selling_price || 0, currencySymbol)}
              </Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceCol}>
              <Text style={styles.priceLabel}>Purchase Cost</Text>
              <Text style={styles.costVal}>
                {formatCurrency(product?.default_purchase_cost || 0, currencySymbol)}
              </Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceCol}>
              <Text style={styles.priceLabel}>Min Alert</Text>
              <Text style={styles.alertVal}>{product?.min_stock_alert || 5} pcs</Text>
            </View>
          </View>
        </Card>

        {/* Variants Section */}
        <View style={styles.variantsHeaderRow}>
          <Text style={styles.sectionTitle}>Variations & Sizing</Text>
          <TouchableOpacity
            style={styles.addVariantBtn}
            onPress={() => setShowAddVariantModal(true)}
          >
            <Ionicons name="add" size={16} color={COLORS.primary} />
            <Text style={styles.addVariantBtnText}>Add Size/Color</Text>
          </TouchableOpacity>
        </View>

        {product?.variants && product.variants.length > 0 ? (
          product.variants.map((v) => (
            <Card key={v.id} style={styles.variantCard}>
              <View style={styles.variantRow}>
                <View style={styles.variantLeft}>
                  <View style={styles.tagGroup}>
                    <View style={styles.sizeBadge}>
                      <Text style={styles.sizeText}>{v.size}</Text>
                    </View>
                    <View style={styles.colorBadge}>
                      <Text style={styles.colorText}>{v.color}</Text>
                    </View>
                  </View>
                  {v.sku && <Text style={styles.variantSku}>SKU: {v.sku}</Text>}
                </View>

                <View style={styles.variantRight}>
                  <Text
                    style={[
                      styles.stockVal,
                      v.current_stock <= 0
                        ? { color: COLORS.danger }
                        : v.current_stock <= minAlert
                        ? { color: COLORS.warning }
                        : { color: COLORS.success },
                    ]}
                  >
                    {v.current_stock} pcs
                  </Text>
                  <TouchableOpacity
                    style={styles.adjustBtn}
                    onPress={() =>
                      navigation.navigate('StockAdjustment', {
                        productId: product.id,
                        variantId: v.id,
                        variantTitle: `${product.name} (${v.size} / ${v.color})`,
                        currentStock: v.current_stock,
                      })
                    }
                  >
                    <Ionicons name="swap-vertical" size={14} color={COLORS.accent} />
                    <Text style={styles.adjustBtnText}>Adjust</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ))
        ) : (
          <Text style={styles.emptyVariants}>No variants configured.</Text>
        )}

        {/* Audit Log / History Button */}
        <Button
          title="View Stock Movement Audit Trail"
          variant="secondary"
          icon="time-outline"
          style={styles.historyBtn}
          onPress={() =>
            navigation.navigate('StockAdjustment', {
              productId: product?.id,
              showHistoryOnly: true,
            })
          }
        />
      </ScrollView>

      {/* Add Variant Modal */}
      <ModalSheet
        visible={showAddVariantModal}
        onClose={() => setShowAddVariantModal(false)}
        title="Add Size & Color Variation"
        subtitle="Specify size, color and initial stock level"
      >
        <Text style={styles.modalFieldLabel}>Size</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalPillsRow}>
          {CLOTHING_SIZES.map((sz) => (
            <TouchableOpacity
              key={sz}
              style={[styles.modalChip, newSize === sz && styles.modalChipSelected]}
              onPress={() => setNewSize(sz)}
            >
              <Text style={[styles.modalChipText, newSize === sz && styles.modalChipTextSelected]}>
                {sz}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.modalFieldLabel}>Color</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalPillsRow}>
          {CLOTHING_COLORS.map((col) => (
            <TouchableOpacity
              key={col}
              style={[styles.modalChip, newColor === col && styles.modalChipSelected]}
              onPress={() => setNewColor(col)}
            >
              <Text style={[styles.modalChipText, newColor === col && styles.modalChipTextSelected]}>
                {col}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Input
          label="Variant SKU (Optional)"
          value={newSku}
          onChangeText={setNewSku}
          placeholder="e.g. SHT-XL-BLU"
        />

        <Input
          label="Initial Stock Quantity"
          value={newStock}
          onChangeText={setNewStock}
          placeholder="0"
          keyboardType="number-pad"
        />

        <Button
          title="Save Variant"
          variant="primary"
          onPress={handleCreateVariant}
          style={styles.modalSaveBtn}
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
  notFoundCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  masterCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  categoryPill: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  categoryText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  productTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  skuText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginBottom: SPACING.sm,
  },
  descText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  priceCol: {
    flex: 1,
    alignItems: 'center',
  },
  priceLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  sellingPriceVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  costVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  alertVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    color: COLORS.warning,
  },
  priceDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.borderLight,
  },
  variantsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  addVariantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  addVariantBtnText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  variantCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  variantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  variantLeft: {
    flex: 1,
  },
  tagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  sizeBadge: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    marginRight: 6,
  },
  sizeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  colorBadge: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  colorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  variantSku: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  variantRight: {
    alignItems: 'flex-end',
  },
  stockVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    marginBottom: 4,
  },
  adjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.accentLight,
  },
  adjustBtnText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accentDark,
    fontWeight: '600',
    marginLeft: 3,
  },
  emptyVariants: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: SPACING.md,
  },
  historyBtn: {
    marginTop: SPACING.lg,
  },
  modalFieldLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  modalPillsRow: {
    marginBottom: SPACING.md,
  },
  modalChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.surfaceSubtle,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modalChipText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
  },
  modalChipTextSelected: {
    color: COLORS.textInverse,
    fontWeight: '600',
  },
  modalSaveBtn: {
    marginTop: SPACING.md,
  },
});
