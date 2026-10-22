/**
 * Sales Invoices & Transaction History Screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { getSalesPaginated } from '../../repositories/saleRepository';
import { formatCurrency } from '../../utils/currency';
import { formatDate, getDateRange } from '../../utils/date';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/theme';
import Header from '../../components/common/Header';
import SearchBar from '../../components/common/SearchBar';
import DateFilterBar from '../../components/common/DateFilterBar';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';

const PAGE_SIZE = 25;

export default function SalesHistoryScreen({ navigation }) {
  const { currencySymbol, dataVersion } = useApp();

  const [dateRangeKey, setDateRangeKey] = useState('all');
  const [search, setSearch] = useState('');
  const [sales, setSales] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSales = useCallback(
    async (reset = false) => {
      const offset = reset ? 0 : page * PAGE_SIZE;
      const { startDate, endDate } = getDateRange(dateRangeKey);

      try {
        if (reset) setLoading(true);
        else setLoadingMore(true);

        const rows = await getSalesPaginated({
          startDate: dateRangeKey === 'all' ? null : startDate,
          endDate: dateRangeKey === 'all' ? null : endDate,
          searchInvoice: search,
          limit: PAGE_SIZE,
          offset,
        });

        if (reset) {
          setSales(rows);
          setPage(1);
          setHasMore(rows.length === PAGE_SIZE);
        } else {
          setSales((prev) => [...prev, ...rows]);
          setPage((prev) => prev + 1);
          setHasMore(rows.length === PAGE_SIZE);
        }
      } catch (err) {
        console.warn('Error loading sales:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [dateRangeKey, search, page]
  );

  useEffect(() => {
    loadSales(true);
  }, [dateRangeKey, search, dataVersion]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSales(true);
  };

  const onEndReached = () => {
    if (!loading && !loadingMore && hasMore) {
      loadSales(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Sales History" onBack={() => navigation.goBack()} />

      <View style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by invoice number or customer..."
          onClear={() => setSearch('')}
        />
      </View>

      <DateFilterBar selectedRange={dateRangeKey} onSelectRange={setDateRangeKey} />

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : sales.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No sales transactions found"
          description="Try selecting a different date range or search keyword."
          actionTitle="Open POS"
          onAction={() => navigation.navigate('POSTab')}
        />
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            let badgeVariant = 'success';
            if (item.status === 'RETURNED') badgeVariant = 'danger';
            else if (item.status === 'PARTIALLY_RETURNED') badgeVariant = 'warning';
            else if (item.payment_status === 'UNPAID') badgeVariant = 'danger';
            else if (item.payment_status === 'PARTIAL') badgeVariant = 'warning';

            return (
              <Card
                style={styles.saleCard}
                onPress={() => navigation.navigate('SaleDetail', { saleId: item.id })}
              >
                <View style={styles.saleRow}>
                  <View style={styles.saleLeft}>
                    <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
                    <Text style={styles.customerName}>
                      {item.customer_name_snapshot || 'Walk-in Customer'}
                    </Text>
                    <Text style={styles.saleDate}>
                      {formatDate(item.sale_date)} • {item.payment_method}
                    </Text>
                  </View>

                  <View style={styles.saleRight}>
                    <Text style={styles.totalAmount}>
                      {formatCurrency(item.total_amount, currencySymbol)}
                    </Text>
                    <Badge
                      label={item.status !== 'COMPLETED' ? item.status : item.payment_status}
                      variant={badgeVariant}
                      size="sm"
                    />
                    {item.balance_amount > 0 && (
                      <Text style={styles.balanceText}>
                        Due: {formatCurrency(item.balance_amount, currencySymbol)}
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
  searchSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  listContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saleCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleLeft: {
    flex: 1,
  },
  invoiceNumber: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  customerName: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  saleDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  saleRight: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  balanceText: {
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
