/**
 * Luxury Fashion Point of Sale (POS) Screen
 * Matches reference aesthetic:
 * 2-column clothing variant cards, category pills, search bar,
 * live quantity steppers, and floating bottom checkout bar with safe area padding.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import Header from '../../components/common/Header';
import SearchBar from '../../components/common/SearchBar';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import { useApp } from '../../context/AppContext';
import { searchVariantsForPOS } from '../../repositories/productRepository';
import { formatCurrency } from '../../utils/currency';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');

const POS_CATEGORIES = [
  { id: 'all', label: 'All Items' },
  { id: 'hijab', label: 'Hijabs & Scarves' },
  { id: 'abaya', label: 'Abayas' },
  { id: 'dress', label: 'Dresses' },
  { id: 'shirt', label: 'Shirts & Tops' },
  { id: 'formal', label: 'Formal Wear' },
];

export default function PosScreen({ navigation }) {
  const { currencySymbol, dataVersion } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [variants, setVariants] = useState([]);
  const [cart, setCart] = useState([]);

  const loadVariants = useCallback(async () => {
    try {
      const items = await searchVariantsForPOS(searchTerm, 50);
      setVariants(items);
    } catch (err) {
      console.warn('Error loading variants for POS:', err);
    }
  }, [searchTerm]);

  useEffect(() => {
    loadVariants();
  }, [loadVariants, dataVersion]);

  // Add variant to cart
  const handleAddToCart = (variant) => {
    if (variant.current_stock <= 0) {
      Alert.alert('Out of Stock', `"${variant.product_name} (${variant.size || ''} ${variant.color || ''})" is out of stock.`);
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.variantId === variant.variant_id);
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        if (existing.quantity >= variant.current_stock) {
          Alert.alert('Stock Limit', `Only ${variant.current_stock} units available in stock.`);
          return prev;
        }
        const updated = [...prev];
        const newQty = existing.quantity + 1;
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          subtotal: newQty * existing.unit_price,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            variantId: variant.variant_id,
            productId: variant.product_id,
            product_name: variant.product_name,
            size: variant.size,
            color: variant.color,
            unit_price: variant.selling_price,
            unit_cost: variant.cost_price,
            current_stock: variant.current_stock,
            quantity: 1,
            custom_unit_price: null,
            discount_amount: 0,
            subtotal: variant.selling_price,
          },
        ];
      }
    });
  };

  // Decrement from cart
  const handleDecrement = (variantId) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.variantId === variantId);
      if (existingIndex === -1) return prev;
      const existing = prev[existingIndex];
      if (existing.quantity > 1) {
        const updated = [...prev];
        const newQty = existing.quantity - 1;
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          subtotal: newQty * existing.unit_price,
        };
        return updated;
      } else {
        return prev.filter((item) => item.variantId !== variantId);
      }
    });
  };

  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const renderVariantCard = ({ item }) => {
    const cartItem = cart.find((c) => c.variantId === item.variant_id);
    const inCartQty = cartItem ? cartItem.quantity : 0;
    const isOutOfStock = item.current_stock <= 0;

    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity
          style={[styles.productCard, isOutOfStock && styles.productCardDisabled]}
          onPress={() => !isOutOfStock && handleAddToCart(item)}
          activeOpacity={0.75}
        >
          {/* Card Top Thumbnail */}
          <View style={styles.thumbnailBox}>
            <Ionicons name="shirt-outline" size={32} color={COLORS.primaryLight} />

            {/* In Cart Badge */}
            {inCartQty > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{inCartQty}</Text>
              </View>
            )}

            {/* Stock status pill */}
            <View style={styles.stockPill}>
              {isOutOfStock ? (
                <Badge label="Sold Out" variant="danger" size="sm" />
              ) : (
                <Text style={styles.stockText}>{item.current_stock} left</Text>
              )}
            </View>
          </View>

          {/* Details */}
          <View style={styles.cardInfo}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.product_name}
            </Text>

            {/* Variant Chips */}
            <View style={styles.variantChipsRow}>
              {item.size ? (
                <View style={styles.sizeChip}>
                  <Text style={styles.sizeChipText}>{item.size}</Text>
                </View>
              ) : null}
              {item.color ? (
                <View style={styles.colorChip}>
                  <Text style={styles.colorChipText}>{item.color}</Text>
                </View>
              ) : null}
            </View>

            {/* Price & Add Action */}
            <View style={styles.priceRow}>
              <Text style={styles.price}>
                {formatCurrency(item.selling_price, currencySymbol)}
              </Text>

              {inCartQty > 0 ? (
                <View style={styles.stepperMini}>
                  <TouchableOpacity
                    style={styles.stepBtnMini}
                    onPress={() => handleDecrement(item.variant_id)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="remove" size={12} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.stepQtyMini}>{inCartQty}</Text>
                  <TouchableOpacity
                    style={styles.stepBtnMini}
                    onPress={() => handleAddToCart(item)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="add" size={12} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.addBtn, isOutOfStock && styles.addBtnDisabled]}
                  onPress={() => !isOutOfStock && handleAddToCart(item)}
                  disabled={isOutOfStock}
                >
                  <Ionicons name="add" size={16} color={COLORS.textInverse} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe={false}>
      {/* POS Top Header */}
      <Header
        title="Point of Sale"
        subtitle="Rapid Clothing Checkout"
        rightAction={
          cartTotalItems > 0 ? (
            <TouchableOpacity
              style={styles.cartIconHeader}
              onPress={() => navigation.navigate('Checkout', { cart, setCart })}
            >
              <Ionicons name="bag-handle" size={20} color={COLORS.primary} />
              <View style={styles.cartCountBadge}>
                <Text style={styles.cartCountText}>{cartTotalItems}</Text>
              </View>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search by title, size, color, or barcode..."
        />
      </View>

      {/* Category Filter Pills */}
      <View style={styles.filterBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={POS_CATEGORIES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isSelected = selectedFilter === item.id;
            return (
              <TouchableOpacity
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedFilter(item.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Variant Grid */}
      <FlatList
        data={variants}
        renderItem={renderVariantCard}
        keyExtractor={(item) => String(item.variant_id)}
        numColumns={2}
        contentContainerStyle={[
          styles.gridContent,
          cartTotalItems > 0 && { paddingBottom: 160 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyState={
          <EmptyState
            icon="shirt-outline"
            title="No Items Available"
            message={
              searchTerm
                ? 'No sizes or items matched your search query.'
                : 'Inventory is empty. Go to Inventory tab to add your clothing products.'
            }
          />
        }
      />

      {/* Floating Bottom Cart Bar (Appears when items are selected) */}
      {cartTotalItems > 0 && (
        <View style={styles.floatingCartDock}>
          <View style={styles.cartSummaryRow}>
            <View>
              <Text style={styles.cartCountLabel}>{cartTotalItems} {cartTotalItems === 1 ? 'Item' : 'Items'} in Order</Text>
              <Text style={styles.cartSubtotalText}>
                {formatCurrency(cartSubtotal, currencySymbol)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.checkoutPillBtn}
              onPress={() => navigation.navigate('Checkout', { cart, setCart })}
              activeOpacity={0.8}
            >
              <Text style={styles.checkoutPillText}>Checkout</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.textInverse} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  filterBar: {
    paddingVertical: SPACING.sm,
  },
  filterList: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  filterChipText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  filterChipTextActive: {
    color: COLORS.textInverse,
  },
  cartIconHeader: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartCountBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartCountText: {
    color: COLORS.textInverse,
    fontSize: 10,
    fontWeight: '700',
  },
  gridContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 90,
  },
  cardWrapper: {
    width: (width - SPACING.xl * 2 - SPACING.md) / 2,
    marginBottom: SPACING.md,
    marginRight: SPACING.md,
  },
  productCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  productCardDisabled: {
    opacity: 0.6,
  },
  thumbnailBox: {
    height: 130,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.primary,
    width: 24,
    height: 24,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: COLORS.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  stockPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  stockText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  cardInfo: {
    padding: SPACING.md,
  },
  productName: {
    ...TYPOGRAPHY.h3,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  variantChipsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  sizeChip: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  sizeChipText: {
    color: COLORS.textInverse,
    fontSize: 10,
    fontWeight: '700',
  },
  colorChip: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  colorChipText: {
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    ...TYPOGRAPHY.price,
    fontSize: 14,
    color: COLORS.primary,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  stepperMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.pill,
    padding: 2,
  },
  stepBtnMini: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQtyMini: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingHorizontal: 6,
  },
  floatingCartDock: {
    position: 'absolute',
    bottom: 74, // Sits comfortably above floating bottom tab dock
    left: SPACING.xl,
    right: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.floating,
  },
  cartSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartCountLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  cartSubtotalText: {
    ...TYPOGRAPHY.priceLarge,
    color: COLORS.primary,
  },
  checkoutPillBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkoutPillText: {
    color: COLORS.textInverse,
    fontWeight: '700',
    fontSize: 14,
  },
});
