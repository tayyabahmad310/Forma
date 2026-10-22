/**
 * Product Details & Variant Inventory Screen
 * Fashion boutique showcase with arched gallery header, size/color selectors, and inventory controls.
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
import { getProductWithVariants, addVariant } from '../../repositories/productRepository';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import ScreenContainer from '../../components/common/ScreenContainer';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import ModalSheet from '../../components/common/ModalSheet';
import Input from '../../components/common/Input';
import { CLOTHING_SIZES, CLOTHING_COLORS } from '../../constants/config';

export default function ProductDetailScreen({ route, navigation }) {
  const { currencySymbol, dataVersion, notifyDataChanged, addToCart } = useApp();
  const productId = route.params?.productId;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  // New variant modal state
  const [showAddVariantModal, setShowAddVariantModal] = useState(false);
  const [newSize, setNewSize] = useState('M');
  const [newColor, setNewColor] = useState('Black');
  const [newSku, setNewSku] = useState('');
  const [newStock, setNewStock] = useState('10');

  const loadDetails = useCallback(async () => {
    try {
      const data = await getProductWithVariants(productId);
      setProduct(data);
      if (data?.variants?.length > 0 && !selectedVariantId) {
        setSelectedVariantId(data.variants[0].id);
      }
    } catch (err) {
      console.warn('Error loading product:', err);
    } finally {
      setLoading(false);
    }
  }, [productId, selectedVariantId]);

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

  const handleQuickAddToCart = () => {
    if (!product) return;
    const variant = product.variants?.find((v) => v.id === selectedVariantId) || product.variants?.[0];
    if (!variant) {
      Alert.alert('Notice', 'Please add a size/color variation before adding to POS cart.');
      return;
    }
    if (variant.current_stock <= 0) {
      Alert.alert('Out of Stock', 'This variation has 0 units available.');
      return;
    }

    if (addToCart) {
      addToCart({
        variantId: variant.id,
        productId: product.id,
        productName: product.name,
        size: variant.size,
        color: variant.color,
        sku: variant.sku || product.sku,
        sellingPrice: variant.selling_price || product.default_selling_price,
        currentStock: variant.current_stock,
        quantity: 1,
      });
      Alert.alert('Added to Cart', `${product.name} (${variant.size}/${variant.color}) added to POS register.`);
    } else {
      navigation.navigate('POSTab', { addProductId: product.id, addVariantId: variant.id });
    }
  };

  if (!product && !loading) {
    return (
      <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
        <Header title="Product Not Found" onBack={() => navigation.goBack()} />
        <View style={styles.notFoundCenter}>
          <Text style={styles.notFoundText}>This product does not exist.</Text>
        </View>
      </ScreenContainer>
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

  const selectedVariant = product?.variants?.find((v) => v.id === selectedVariantId);
  const activePrice = selectedVariant?.selling_price || product?.default_selling_price || 0;
  const activeCost = selectedVariant?.purchase_cost || product?.default_purchase_cost || 0;
  const profitMargin = activePrice > 0 ? Math.round(((activePrice - activeCost) / activePrice) * 100) : 0;

  return (
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
      <Header
        title="Product Details"
        subtitle={product?.category_name || 'Boutique Apparel'}
        onBack={() => navigation.goBack()}
        rightIcon="create-outline"
        onRightPress={() => navigation.navigate('ProductForm', { productId })}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Arched Fashion Visual Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroArchFrame}>
            <View style={styles.heroIconCircle}>
              <Ionicons name="shirt-outline" size={48} color={COLORS.primary} />
            </View>
            <View style={styles.heroBadgeRow}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>{product?.category_name || 'COLLECTION'}</Text>
              </View>
              <Badge label={stockLabel} variant={stockVariant} />
            </View>
          </View>

          <View style={styles.heroDetails}>
            <Text style={styles.productTitle}>{product?.name}</Text>
            {product?.sku ? (
              <View style={styles.skuTag}>
                <Ionicons name="barcode-outline" size={14} color={COLORS.textTertiary} />
                <Text style={styles.skuText}>SKU: {product.sku}</Text>
              </View>
            ) : null}

            {product?.description ? (
              <Text style={styles.descText}>{product.description}</Text>
            ) : null}

            {/* Financial & Pricing Breakdown */}
            <View style={styles.priceContainer}>
              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>Selling Price</Text>
                  <Text style={styles.sellingPriceVal}>
                    {formatCurrency(activePrice, currencySymbol)}
                  </Text>
                </View>

                <View style={styles.marginPill}>
                  <Text style={styles.marginText}>{profitMargin}% Margin</Text>
                </View>
              </View>

              <View style={styles.costBar}>
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>Cost Price</Text>
                  <Text style={styles.costVal}>{formatCurrency(activeCost, currencySymbol)}</Text>
                </View>
                <View style={styles.costDivider} />
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>Min Stock Alert</Text>
                  <Text style={styles.alertVal}>{product?.min_stock_alert || 5} units</Text>
                </View>
                <View style={styles.costDivider} />
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>Total Variants</Text>
                  <Text style={styles.variantCountVal}>{product?.variants?.length || 0}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Size Selection Pills */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Sizes</Text>
          <Text style={styles.sectionSubtitle}>Tap to inspect stock</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
          {product?.variants && product.variants.length > 0 ? (
            product.variants.map((v) => {
              const isSelected = selectedVariantId === v.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.sizePill, isSelected && styles.sizePillActive]}
                  onPress={() => setSelectedVariantId(v.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.sizePillText, isSelected && styles.sizePillTextActive]}>
                    {v.size}
                  </Text>
                  <Text style={[styles.sizeSubText, isSelected && styles.sizeSubTextActive]}>
                    {v.color}
                  </Text>
                  <View style={[styles.stockDot, v.current_stock <= 0 && styles.stockDotEmpty]} />
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.emptyNote}>No sizes configured.</Text>
          )}
        </ScrollView>

        {/* Variations & Inventory Management Section */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Inventory by Variant</Text>
            <Text style={styles.sectionSubtitle}>{product?.variants?.length || 0} configured variations</Text>
          </View>
          <TouchableOpacity
            style={styles.addVariantBtn}
            onPress={() => setShowAddVariantModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color={COLORS.primary} />
            <Text style={styles.addVariantBtnText}>Add Size/Color</Text>
          </TouchableOpacity>
        </View>

        {product?.variants && product.variants.length > 0 ? (
          product.variants.map((v) => {
            const isSelected = selectedVariantId === v.id;
            return (
              <Card
                key={v.id}
                style={[styles.variantCard, isSelected && styles.variantCardSelected]}
              >
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
                    {v.sku ? <Text style={styles.variantSku}>SKU: {v.sku}</Text> : null}
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
                      activeOpacity={0.8}
                    >
                      <Ionicons name="swap-vertical" size={14} color={COLORS.primary} />
                      <Text style={styles.adjustBtnText}>Adjust</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          })
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="shirt-outline" size={32} color={COLORS.textTertiary} />
            <Text style={styles.emptyCardText}>No variations yet. Add standard sizes (S, M, L) to track inventory.</Text>
          </Card>
        )}

        {/* Audit Log / History Button */}
        <Button
          title="Stock Movement Audit Trail"
          variant="outline"
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

      {/* Floating Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomLabel}>Unit Price</Text>
          <Text style={styles.bottomPrice}>{formatCurrency(activePrice, currencySymbol)}</Text>
        </View>

        <Button
          title="Add to POS Cart"
          icon="cart-outline"
          variant="primary"
          style={styles.addToCartBtn}
          onPress={handleQuickAddToCart}
        />
      </View>

      {/* Add Variant Modal */}
      <ModalSheet
        visible={showAddVariantModal}
        onClose={() => setShowAddVariantModal(false)}
        title="Add Size & Color Variation"
        subtitle="Specify size, color and initial stock level"
      >
        <Text style={styles.modalFieldLabel}>Select Size</Text>
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

        <Text style={styles.modalFieldLabel}>Select Color</Text>
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: 110,
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
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
  },
  heroArchFrame: {
    height: 180,
    backgroundColor: '#F3EFEA',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  heroBadgeRow: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryPill: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  categoryPillText: {
    ...TYPOGRAPHY.captionSmall,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.8,
  },
  heroDetails: {
    padding: SPACING.lg,
  },
  productTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  skuTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  skuText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  descText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  priceContainer: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  priceLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sellingPriceVal: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    fontWeight: '800',
  },
  marginPill: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  marginText: {
    ...TYPOGRAPHY.captionSmall,
    fontWeight: '700',
    color: COLORS.success,
  },
  costBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  costItem: {
    flex: 1,
    alignItems: 'center',
  },
  costLabel: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginBottom: 2,
  },
  costVal: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  alertVal: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.warning,
  },
  variantCountVal: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  costDivider: {
    width: 1,
    height: 22,
    backgroundColor: COLORS.borderLight,
  },
  sectionHeader: {
    marginBottom: SPACING.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  pillsRow: {
    paddingVertical: 4,
    gap: 8,
  },
  sizePill: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    minWidth: 64,
  },
  sizePillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sizePillText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sizePillTextActive: {
    color: COLORS.textInverse,
  },
  sizeSubText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  sizeSubTextActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginTop: 4,
  },
  stockDotEmpty: {
    backgroundColor: COLORS.danger,
  },
  emptyNote: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  addVariantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primarySurface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(91,36,19,0.15)',
  },
  addVariantBtnText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.primary,
    fontWeight: '700',
    marginLeft: 4,
  },
  variantCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  variantCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
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
    gap: 6,
    marginBottom: 4,
  },
  sizeBadge: {
    backgroundColor: COLORS.primarySurface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  sizeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '800',
    color: COLORS.primary,
  },
  colorBadge: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  colorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  variantSku: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  variantRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  stockVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
  },
  adjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  adjustBtnText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.primary,
    fontWeight: '700',
    marginLeft: 3,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: 8,
  },
  emptyCardText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  historyBtn: {
    marginTop: SPACING.xl,
    borderRadius: RADIUS.pill,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    ...SHADOWS.lg,
  },
  bottomInfo: {
    flex: 1,
  },
  bottomLabel: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  bottomPrice: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    fontWeight: '800',
  },
  addToCartBtn: {
    flex: 1.5,
    borderRadius: RADIUS.pill,
  },
  modalFieldLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalPillsRow: {
    marginBottom: SPACING.md,
  },
  modalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
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
    fontWeight: '700',
  },
  modalSaveBtn: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.pill,
  },
});
