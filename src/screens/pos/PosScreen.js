/**
 * Point of Sale (POS) Screen
 * Fast, intuitive clothing item and variant selection with active cart drawer.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { searchVariantsForPOS } from '../../repositories/productRepository';
import { formatCurrency } from '../../utils/currency';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import Header from '../../components/common/Header';
import SearchBar from '../../components/common/SearchBar';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';

export default function PosScreen({ navigation }) {
  const { currencySymbol, dataVersion } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [variants, setVariants] = useState([]);
  const [cart, setCart] = useState([]); // array of { variantId, productId, productName, variantName, size, color, sellingPrice, unitCost, currentStock, quantity, customUnitPrice, discountAmount, subtotal }

  const loadVariants = useCallback(async () => {
    try {
      const items = await searchVariantsForPOS(searchTerm, 40);
      setVariants(items);
    } catch (err) {
      console.warn('Error loading variants for POS:', err);
    }
  }, [searchTerm]);

  useEffect(() => {
    loadVariants();
  }, [loadVariants, dataVersion]);

  const handleAddToCart = (variant) => {
    if (variant.current_stock <= 0) {
      Alert.alert('Out of Stock', `"${variant.product_name} (${variant.size} / ${variant.color})" is out of stock.`);
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
        const lineTotal = (existing.customUnitPrice || existing.sellingPrice) * newQty - (existing.discountAmount || 0);
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          subtotal: Math.max(0, lineTotal),
        };
        return updated;
      } else {
        const itemSubtotal = variant.selling_price;
        return [
          ...prev,
          {
            variantId: variant.variant_id,
            productId: variant.product_id,
            productName: variant.product_name,
            variantName: `Size: ${variant.size}, Color: ${variant.color}`,
            size: variant.size,
            color: variant.color,
            sellingPrice: variant.selling_price,
            unitCost: variant.purchase_cost || 0,
            currentStock: variant.current_stock,
            quantity: 1,
            customUnitPrice: null,
            discountAmount: 0,
            subtotal: itemSubtotal,
          },
        ];
      }
    });
  };

  const totalCartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Point of Sale"
        subtitle="Select clothing items for sale"
        rightAction={
          cart.length > 0 ? (
            <TouchableOpacity onPress={() => setCart([])} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear Cart</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <View style={styles.searchBarContainer}>
        <SearchBar
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search by name, SKU, size, or color..."
          onClear={() => setSearchTerm('')}
        />
      </View>

      {/* POS Items Grid */}
      {variants.length === 0 ? (
        <EmptyState
          icon="shirt-outline"
          title="No clothing items found"
          description="Ensure you have active products and variants in inventory."
          actionTitle="Create Product"
          onAction={() => navigation.navigate('ProductForm', {})}
        />
      ) : (
        <FlatList
          data={variants}
          keyExtractor={(item) => String(item.variant_id)}
          renderItem={({ item }) => {
            const inCart = cart.find((c) => c.variantId === item.variant_id);
            const isOutOfStock = item.current_stock <= 0;

            return (
              <TouchableOpacity
                style={[styles.itemCard, inCart && styles.itemCardInCart]}
                onPress={() => handleAddToCart(item)}
                disabled={isOutOfStock}
                activeOpacity={0.7}
              >
                <View style={styles.itemRow}>
                  <View style={styles.thumbnail}>
                    <Ionicons
                      name="shirt"
                      size={24}
                      color={isOutOfStock ? COLORS.textTertiary : COLORS.primary}
                    />
                  </View>

                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.product_name}
                    </Text>

                    <View style={styles.variantTags}>
                      <View style={styles.pillTag}>
                        <Text style={styles.pillTagText}>{item.size}</Text>
                      </View>
                      <View style={styles.pillTag}>
                        <Text style={styles.pillTagText}>{item.color}</Text>
                      </View>
                    </View>

                    <Text style={styles.priceText}>
                      {formatCurrency(item.selling_price, currencySymbol)}
                    </Text>
                  </View>

                  <View style={styles.rightStockCol}>
                    <Badge
                      label={isOutOfStock ? 'Out' : `${item.current_stock} left`}
                      variant={isOutOfStock ? 'danger' : item.current_stock <= 3 ? 'warning' : 'success'}
                      size="sm"
                    />

                    {inCart && (
                      <View style={styles.cartQtyBadge}>
                        <Text style={styles.cartQtyText}>{inCart.quantity} in cart</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Bottom Cart Bar */}
      {cart.length > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.cartSummary}>
            <Text style={styles.cartUnitsText}>
              {totalCartUnits} item{totalCartUnits !== 1 ? 's' : ''} in cart
            </Text>
            <Text style={styles.cartTotalText}>
              {formatCurrency(totalCartAmount, currencySymbol)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() =>
              navigation.navigate('Checkout', {
                cart,
                onUpdateCart: (updated) => setCart(updated),
                onClearCart: () => setCart([]),
              })
            }
          >
            <Text style={styles.checkoutBtnText}>Checkout</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.textInverse} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchBarContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  clearBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  clearBtnText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  itemCardInCart: {
    borderColor: COLORS.primary,
    backgroundColor: '#FAFAFA',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  variantTags: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pillTag: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.xs,
    marginRight: 4,
  },
  pillTagText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  priceText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  rightStockCol: {
    alignItems: 'flex-end',
  },
  cartQtyBadge: {
    marginTop: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  cartQtyText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    ...SHADOWS.modal,
  },
  cartSummary: {
    flex: 1,
  },
  cartUnitsText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  cartTotalText: {
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  checkoutBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textInverse,
    marginRight: 6,
  },
});
