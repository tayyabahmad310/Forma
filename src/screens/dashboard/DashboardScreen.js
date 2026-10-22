/**
 * Luxury Fashion Boutique Dashboard Screen
 * Directly embodies the reference design:
 * Location/Boutique header, search bar with filter, promo hero banner,
 * horizontal category avatars, daily financial stat cards, and 2-column clothing grid.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import SearchBar from '../../components/common/SearchBar';
import StatCard from '../../components/common/StatCard';
import ProductCard from '../../components/product/ProductCard';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import { useApp } from '../../context/AppContext';
import { getDashboardData } from '../../repositories/reportRepository';
import { getProductsPaginated } from '../../repositories/productRepository';
import { getAllCategories } from '../../repositories/categoryRepository';
import { formatCurrency } from '../../utils/currency';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');

const CATEGORY_ICONS = [
  { id: null, name: 'All', icon: 'grid-outline' },
  { id: 1, name: 'Shirts', icon: 'shirt-outline' },
  { id: 2, name: 'Trousers', icon: 'cut-outline' },
  { id: 3, name: 'T-Shirts', icon: 'color-palette-outline' },
  { id: 4, name: 'Dresses', icon: 'rose-outline' },
  { id: 5, name: 'Outerwear', icon: 'umbrella-outline' },
  { id: 6, name: 'Formal', icon: 'sparkles-outline' },
  { id: 7, name: 'Traditional', icon: 'ribbon-outline' },
  { id: 8, name: 'Accessories', icon: 'watch-outline' },
];

export default function DashboardScreen({ navigation }) {
  const { currencySymbol, businessName, dataVersion } = useApp();

  const [dashboardData, setDashboardData] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [dashResult, prodResult, catResult] = await Promise.all([
        getDashboardData(),
        getProductsPaginated({ limit: 10, categoryId: selectedCategory, search: searchQuery }),
        getAllCategories(),
      ]);
      setDashboardData(dashResult);
      setProducts(prodResult.items || []);
      setCategories(catResult || []);
    } catch (err) {
      console.warn('Dashboard load error:', err);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    loadAll();
  }, [loadAll, dataVersion]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const today = dashboardData?.today || {};
  const inventory = dashboardData?.inventory || {};
  const lowStockAlerts = dashboardData?.lowStockAlerts || [];
  const recentSales = dashboardData?.recentSales || [];

  return (
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe={false}>
      {/* Top Location / Boutique Name Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.locationSelector}
          onPress={() => navigation.navigate('SettingsTab')}
          activeOpacity={0.7}
        >
          <Ionicons name="location" size={18} color={COLORS.primary} style={styles.locIcon} />
          <View>
            <Text style={styles.locationLabel}>Location</Text>
            <View style={styles.locationRow}>
              <Text style={styles.locationName} numberOfLines={1}>
                {businessName}
              </Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.textPrimary} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.notificationBtn}
          onPress={() => navigation.navigate('SettingsTab')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar with Filter Button */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search products, SKU, categories..."
          onFilterPress={() => navigation.navigate('ProductsTab')}
          style={styles.searchBar}
        />

        {/* Hero Promo Banner (Warm Sand/Mocha Card matching reference image) */}
        <View style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>POS QUICK SALE</Text>
            </View>
            <Text style={styles.heroTitle}>Boutique Checkout</Text>
            <Text style={styles.heroSubtitle}>
              Tap, ring up variants, and generate printable receipts instantly.
            </Text>
            <TouchableOpacity
              style={styles.heroCta}
              onPress={() => navigation.navigate('POSTab')}
              activeOpacity={0.8}
            >
              <Text style={styles.heroCtaText}>Open POS</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.textInverse} />
            </TouchableOpacity>
          </View>
          <View style={styles.heroArtCircle}>
            <Ionicons name="bag-handle" size={44} color={COLORS.primary} />
          </View>
        </View>

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ProductsTab')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORY_ICONS.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id || 'all'}
                style={styles.categoryItem}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.categoryAvatar,
                    isSelected && styles.categoryAvatarActive,
                  ]}
                >
                  <Ionicons
                    name={cat.icon}
                    size={20}
                    color={isSelected ? COLORS.textInverse : COLORS.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && styles.categoryTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Daily Operations & Business Financial Pulse */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Operations</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ReportsTab')}>
            <Text style={styles.seeAllText}>Full Reports</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Today's Sales"
            value={formatCurrency(today.net_sales || 0, currencySymbol)}
            subtitle={`${today.sale_count || 0} orders today`}
            icon="receipt-outline"
            variant="primary"
            style={styles.statCardHalf}
          />
          <StatCard
            title="Estimated Profit"
            value={formatCurrency(today.estimated_profit || 0, currencySymbol)}
            subtitle="Gross Margin"
            icon="trending-up-outline"
            variant="success"
            style={styles.statCardHalf}
          />
        </View>

        {/* Quick Operations Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickOpsRow}>
          <TouchableOpacity
            style={styles.quickOpChip}
            onPress={() => navigation.navigate('POSTab')}
            activeOpacity={0.8}
          >
            <Ionicons name="card-outline" size={16} color={COLORS.primary} />
            <Text style={styles.quickOpText}>New Sale</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickOpChip}
            onPress={() => navigation.navigate('PurchaseForm')}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
            <Text style={styles.quickOpText}>Inward Stock</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickOpChip}
            onPress={() => navigation.navigate('ExpensesScreen')}
            activeOpacity={0.8}
          >
            <Ionicons name="wallet-outline" size={16} color={COLORS.primary} />
            <Text style={styles.quickOpText}>Expenses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickOpChip}
            onPress={() => navigation.navigate('CustomerList')}
            activeOpacity={0.8}
          >
            <Ionicons name="people-outline" size={16} color={COLORS.primary} />
            <Text style={styles.quickOpText}>Clientele</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickOpChip}
            onPress={() => navigation.navigate('SalesHistory')}
            activeOpacity={0.8}
          >
            <Ionicons name="receipt-outline" size={16} color={COLORS.primary} />
            <Text style={styles.quickOpText}>Invoices</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickOpChip}
            onPress={() => navigation.navigate('SupplierList')}
            activeOpacity={0.8}
          >
            <Ionicons name="business-outline" size={16} color={COLORS.primary} />
            <Text style={styles.quickOpText}>Vendors</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* 2-Column Product Grid (Featured Boutique Collection) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Boutique Inventory</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ProductForm', {})}>
            <Text style={styles.seeAllText}>+ Add Product</Text>
          </TouchableOpacity>
        </View>

        {products.length === 0 ? (
          <EmptyState
            icon="shirt-outline"
            title="No Products Found"
            message={
              searchQuery
                ? 'No items matched your search query.'
                : 'Your store inventory is empty. Tap "+ Add Product" or use the Setup Wizard to get started!'
            }
            actionLabel="+ Add First Product"
            onAction={() => navigation.navigate('ProductForm', {})}
          />
        ) : (
          <View style={styles.productsGrid}>
            {products.map((item) => (
              <View key={item.id} style={styles.productCardWrapper}>
                <ProductCard
                  product={item}
                  currencySymbol={currencySymbol}
                  onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                  onQuickAdd={() => navigation.navigate('POSTab', { selectProductId: item.id })}
                />
              </View>
            ))}
          </View>
        )}

        {/* Low Stock Alerts (if any) */}
        {lowStockAlerts.length > 0 && (
          <View style={styles.alertSection}>
            <View style={styles.alertHeaderRow}>
              <View style={styles.alertTitleRow}>
                <Ionicons name="warning-outline" size={18} color={COLORS.warning} />
                <Text style={styles.alertSectionTitle}>Low Stock Warning</Text>
              </View>
              <Badge label={`${lowStockAlerts.length} items`} variant="warning" size="sm" />
            </View>

            {lowStockAlerts.slice(0, 3).map((alert) => (
              <TouchableOpacity
                key={alert.variant_id}
                style={styles.alertRow}
                onPress={() => navigation.navigate('StockAdjustment', { variantId: alert.variant_id })}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={styles.alertProductName}>{alert.product_name}</Text>
                  <Text style={styles.alertVariantText}>
                    Size: {alert.size || 'N/A'} • Color: {alert.color || 'N/A'}
                  </Text>
                </View>
                <View style={styles.alertStockBox}>
                  <Text style={styles.alertStockText}>{alert.stock} left</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locIcon: {
    marginRight: SPACING.sm,
  },
  locationLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    maxWidth: 220,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.subtle,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 90, // Room for floating bottom tab bar
  },
  searchBar: {
    marginBottom: SPACING.lg,
  },
  heroBanner: {
    backgroundColor: COLORS.bannerCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xxl,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  heroContent: {
    flex: 1,
    marginRight: SPACING.md,
  },
  heroBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
    marginBottom: SPACING.xs,
  },
  heroBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  heroTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.bannerCardText,
    marginBottom: 4,
  },
  heroSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.bannerCardText,
    opacity: 0.85,
    marginBottom: SPACING.md,
    lineHeight: 15,
  },
  heroCta: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  heroCtaText: {
    color: COLORS.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  heroArtCircle: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  seeAllText: {
    ...TYPOGRAPHY.bodySmallMedium,
    color: COLORS.primary,
    fontWeight: '600',
  },
  categoryScroll: {
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  categoryItem: {
    alignItems: 'center',
    width: 64,
  },
  categoryAvatar: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...SHADOWS.subtle,
  },
  categoryAvatarActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontSize: 11,
  },
  categoryTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  statCardHalf: {
    flex: 1,
  },
  quickOpsRow: {
    gap: 8,
    paddingBottom: SPACING.lg,
  },
  quickOpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  quickOpText: {
    ...TYPOGRAPHY.captionSmall,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  productCardWrapper: {
    width: (width - SPACING.xl * 2 - SPACING.md) / 2,
  },
  alertSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.warningLight,
    marginBottom: SPACING.xl,
    ...SHADOWS.subtle,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  alertSectionTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  alertProductName: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  alertVariantText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  alertStockBox: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  alertStockText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.dangerText,
  },
});
