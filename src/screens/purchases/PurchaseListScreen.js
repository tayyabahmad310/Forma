/**
 * Purchase Orders & Stock Inward Screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { getPurchasesPaginated } from '../../repositories/purchaseRepository';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
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
  }, [loadPurchases, dataVersion]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPurchases(true);
  };

  const onEndReached = () => {
    if (!loading && !loadingMore && hasMore) {
      loadPurchases(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Stock Purchases"
        subtitle="Inward orders & supplier bills"
        rightAction={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('PurchaseForm', {})}
          >
            <Ionicons name="add" size={20} color={COLORS.textInverse} />
            <Text style={styles.addBtnText}>New Purchase</Text>
          </TouchableOpacity>
        }
      />

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : purchases.length === 0 ? (
        <EmptyState
          icon="cart-outline"
          title="No purchase orders recorded"
          description="Record an inward stock purchase from your clothing suppliers."
          actionTitle="Create Purchase"
          onAction={() => navigation.navigate('PurchaseForm', {})}
        />
      ) : (
        <FlatList
          data={purchases}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const isCancelled = item.status === 'CANCELLED';
            return (
              <Card
                style={styles.purchaseCard}
                onPress={() => navigation.navigate('PurchaseDetail', { purchaseId: item.id })}
              >
                <View style={styles.purchaseRow}>
                  <View style={styles.leftCol}>
                    <Text style={styles.invNumber}>{item.invoice_number}</Text>
                    <Text style={styles.supplierText}>
                      {item.supplier_name ? item.supplier_name : 'No Supplier Specified'}
                    </Text>
                    <Text style={styles.dateMeta}>
                      {formatDate(item.purchase_date)} • {item.item_count} item{item.item_count !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  <View style={styles.rightCol}>
                    <Text style={styles.totalAmount}>
                      {formatCurrency(item.total_amount, currencySymbol)}
                    </Text>
                    <Badge
                      label={isCancelled ? 'CANCELLED' : item.payment_status}
                      variant={isCancelled ? 'danger' : item.payment_status === 'PAID' ? 'success' : 'warning'}
                      size="sm"
                    />
                    {item.balance_amount > 0 && !isCancelled && (
                      <Text style={styles.payableDueText}>
                        Payable: {formatCurrency(item.balance_amount, currencySymbol)}
                      </Text>
                    )}
                  </View>
                </View>
              </Card>
            );
          }}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  addBtnText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textInverse,
    fontWeight: '600',
    marginLeft: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: SPACING.lg,
  },
  purchaseCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  purchaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftCol: {
    flex: 1,
  },
  invNumber: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  supplierText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dateMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  payableDueText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.warning,
    fontWeight: '600',
    marginTop: 2,
  },
  footerLoader: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
});
