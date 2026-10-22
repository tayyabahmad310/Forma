/**
 * Sales Invoices & Transaction History Screen
 * Safe-area aware boutique order history and transaction ledger.
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
import { getSalesPaginated } from '../../repositories/saleRepository';
import { formatCurrency } from '../../utils/currency';
import { formatDate, getDateRange } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import ScreenContainer from '../../components/common/ScreenContainer';
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
    [page, dateRangeKey, search]
  );

  useEffect(() => {
    loadSales(true);
  }, [loadSales, dataVersion]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSales(true);
  };

  return (
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
      <Header
        title="Sales Invoices"
        subtitle="Completed Customer Receipts"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by invoice # or client name..."
          onClear={() => setSearch('')}
        />
      </View>

      <DateFilterBar selectedRange={dateRangeKey} onSelectRange={setDateRangeKey} />

      <FlatList
        data={sales}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={() => {
          if (!loadingMore && hasMore) loadSales(false);
        }}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => {
          const isReturned = item.status === 'RETURNED';
          const isCredit = item.total_amount > (item.paid_amount || 0);

          return (
            <Card style={styles.card}>
              <TouchableOpacity
                onPress={() => navigation.navigate('SaleDetail', { saleId: item.id })}
                activeOpacity={0.7}
              >
                <View style={styles.topRow}>
                  <View>
                    <Text style={styles.invoiceNum}>#{item.invoice_number}</Text>
                    <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                  </View>
                  <Badge
                    label={isReturned ? 'RETURNED' : isCredit ? 'DUE' : 'PAID'}
                    variant={isReturned ? 'warning' : isCredit ? 'danger' : 'success'}
                  />
                </View>

                <View style={styles.bottomRow}>
                  <View style={styles.customerCol}>
                    <Text style={styles.customerName}>
                      {item.customer_name || 'Walk-in Guest'}
                    </Text>
                    <Text style={styles.paymentMethodText}>
                      {item.payment_method || 'CASH'} • {item.total_items_count || 1} items
                    </Text>
                  </View>

                  <View style={styles.amountCol}>
                    <Text style={styles.amountVal}>
                      {formatCurrency(item.total_amount, currencySymbol)}
                    </Text>
                    {isCredit && (
                      <Text style={styles.dueVal}>
                        due: {formatCurrency(item.total_amount - (item.paid_amount || 0), currencySymbol)}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Card>
          );
        }}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="receipt-outline"
              title="No Invoices Found"
              subtitle="Checkout sales from the POS screen to record transactions and track orders."
              actionLabel="Go to POS Register"
              onAction={() => navigation.navigate('POSTab')}
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
  searchSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
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
  invoiceNum: {
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
  customerCol: {
    flex: 1,
  },
  customerName: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  paymentMethodText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: COLORS.primary,
  },
  dueVal: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.danger,
    fontWeight: '700',
    marginTop: 2,
  },
  footerLoader: {
    marginVertical: SPACING.md,
  },
});
