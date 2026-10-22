/**
 * Product Catalog & Inventory Listing Screen
 * High-performance paginated listing with SQL filtering.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { getProductsPaginated } from '../../repositories/productRepository';
import { getAllCategories } from '../../repositories/categoryRepository';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import ScreenContainer from '../../components/common/ScreenContainer';
import Header from '../../components/common/Header';
import SearchBar from '../../components/common/SearchBar';
import ProductCard from '../../components/product/ProductCard';
import EmptyState from '../../components/common/EmptyState';

const STOCK_FILTERS = [
  { id: 'all', label: 'All Items' },
  { id: 'in_stock', label: 'In Stock' },
  { id: 'low_stock', label: 'Low Stock' },
  { id: 'out_of_stock', label: 'Out of Stock' },
];

const PAGE_SIZE = 25;

export default function ProductListScreen({ route, navigation }) {
  const { currencySymbol, dataVersion } = useApp();
  const initialFilter = route.params?.filter || 'all';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [stockStatus, setStockStatus] = useState(initialFilter);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load categories
  useEffect(() => {
    (async () => {
      try {
        const cats = await getAllCategories();
        setCategories(cats);
      } catch (err) {
        console.warn('Error loading categories:', err);
      }
    })();
  }, [dataVersion]);

  // Load products query
  const loadProducts = useCallback(
    async (resetPage = false) => {
      const currentOffset = resetPage ? 0 : page * PAGE_SIZE;
      try {
        if (resetPage) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const rows = await getProductsPaginated({
          search,
          categoryId: selectedCategory,
          stockStatus,
          limit: PAGE_SIZE,
          offset: currentOffset,
        });

        if (resetPage) {
          setProducts(rows);
          setPage(1);
          setHasMore(rows.length === PAGE_SIZE);
        } else {
          setProducts((prev) => [...prev, ...rows]);
          setPage((prev) => prev + 1);
          setHasMore(rows.length === PAGE_SIZE);
        }
      } catch (err) {
        console.warn('Error fetching products:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [search, selectedCategory, stockStatus, page]
  );

  useEffect(() => {
    loadProducts(true);
  }, [search, selectedCategory, stockStatus, dataVersion]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts(true);
  };

  const onEndReached = () => {
    if (!loading && !loadingMore && hasMore) {
      loadProducts(false);
    }
  };

  return (
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe={false}>
      <Header
        title="Inventory"
        subtitle={`${products.length} clothing items`}
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('ProductForm', {})}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={COLORS.textInverse} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search products or SKU..."
          onClear={() => setSearch('')}
        />
      </View>

      {/* Stock Status Pills */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPills}>
          {STOCK_FILTERS.map((f) => {
            const isSelected = stockStatus === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => setStockStatus(f.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Categories Filter Pills */}
      {categories.length > 0 && (
        <View style={styles.categoriesBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPills}>
            <TouchableOpacity
              style={[styles.catPill, selectedCategory === null && styles.catPillSelected]}
              onPress={() => setSelectedCategory(null)}
              activeOpacity={0.7}
            >
              <Text style={[styles.catPillText, selectedCategory === null && styles.catPillTextSelected]}>
                All Categories
              </Text>
            </TouchableOpacity>
            {categories.map((c) => {
              const isSelected = selectedCategory === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.catPill, isSelected && styles.catPillSelected]}
                  onPress={() => setSelectedCategory(c.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.catPillText, isSelected && styles.catPillTextSelected]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Product Grid */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : products.length === 0 ? (
        <EmptyState
          icon="shirt-outline"
          title="No products found"
          message="Try adjusting your search or stock status filter, or add a new clothing product."
          actionLabel="+ Add Product"
          onAction={() => navigation.navigate('ProductForm', {})}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          renderItem={({ item }) => (
            <View style={styles.productCardWrapper}>
              <ProductCard
                product={item}
                currencySymbol={currencySymbol}
                onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                onQuickAdd={() => navigation.navigate('POSTab', { selectProductId: item.id })}
              />
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    gap: 4,
  },
  addButtonText: {
    color: COLORS.textInverse,
    fontWeight: '700',
    fontSize: 12,
  },
  searchSection: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  filterBar: {
    paddingVertical: SPACING.xs,
  },
  categoriesBar: {
    paddingBottom: SPACING.sm,
  },
  filterPills: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.xs,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: SPACING.xs,
  },
  pillSelected: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  pillText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  pillTextSelected: {
    color: COLORS.textInverse,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.xs,
  },
  catPillSelected: {
    backgroundColor: COLORS.primarySurface,
    borderColor: COLORS.primary,
  },
  catPillText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  catPillTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 90,
  },
  productCardWrapper: {
    flex: 0.5,
    margin: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoader: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
});
