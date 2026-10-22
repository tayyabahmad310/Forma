/**
 * Purchase Orders & Stock Inward Screen
 * High-end inventory replenishment and vendor invoice registry.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { getPurchasesPaginated } from '../../repositories/purchaseRepository';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import ScreenContainer from '../../components/common/ScreenContainer';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';

const PAGE_SIZE = 25;

export default function PurchaseListScreen({ navigation }) {
  const { currencySymbol, dataVersion } = useApp();

  const [purchases, setPurchases] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadPurchases = useCallback(
    async (reset = false) => {
      const offset = reset ? 0 : page * PAGE_SIZE;
      try {
        if (reset) setLoading(true);
        else setLoadingMore(true);

        const rows = await getPurchasesPaginated({
          limit: PAGE_SIZE,
          offset,
        });

        if (reset) {
          setPurchases(rows);
          setPage(1);
          setHasMore(rows.length === PAGE_SIZE);
        } else {
          setPurchases((prev) => [...prev, ...rows]);
          setPage((prev) => prev + 1);
          setHasMore(rows.length === PAGE_SIZE);
        }
      } catch (err) {
        console.warn('Error loading purchases:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [page]
  );

  useEffect(() => {
    loadPurchases(true);
  }, [dataVersion]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPurchases(true);
  };

  return (
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
      <Header
        title="Stock Inward & POs"
        subtitle="Wholesale Procurements"
        onBack={() => navigation.goBack()}
        rightIcon="add-outline"
        onRightPress={() => navigation.navigate('PurchaseForm')}
      />

      <FlatList
        data={purchases}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={() => {
          if (!loadingMore && hasMore) loadPurchases(false);
        }}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => {
          const isReceived = item.status === 'RECEIVED';
          return (
            <Card style={styles.card}>
              <TouchableOpacity
                onPress={() => navigation.navigate('PurchaseDetail', { purchaseId: item.id })}
                activeOpacity={0.7}
              >
                <View style={styles.topRow}>
                  <View>
                    <Text style={styles.poNumber}>PO #{item.po_number || item.id}</Text>
                    <Text style={styles.dateText}>{formatDate(item.purchase_date || item.created_at)}</Text>
                  </View>
                  <Badge
                    label={item.status || 'RECEIVED'}
                    variant={isReceived ? 'success' : 'warning'}
                  />
                </View>

                <View style={styles.bottomRow}>
                  <View style={styles.supplierCol}>
                    <Text style={styles.supplierLabel}>Vendor</Text>
                    <Text style={styles.supplierName}>{item.supplier_name || 'Direct Wholesale'}</Text>
                  </View>

                  <View style={styles.amountCol}>
                    <Text style={styles.amountLabel}>Total Cost</Text>
                    <Text style={styles.amountVal}>
                      {formatCurrency(item.total_cost || 0, currencySymbol)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Card>
          );
        }}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="cart-outline"
              title="No Inward Purchases"
              subtitle="Record wholesale stock batches from suppliers to automatically increase variant inventory."
              actionLabel="Create Inward PO"
              onAction={() => navigation.navigate('PurchaseForm')}
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footerLoader} color={COLORS.primary} />
          ) : null
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  card: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  poNumber: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  dateText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  supplierCol: {
    flex: 1,
  },
  supplierLabel: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  supplierName: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  amountVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: COLORS.primary,
  },
  footerLoader: {
    marginVertical: SPACING.md,
  },
});
