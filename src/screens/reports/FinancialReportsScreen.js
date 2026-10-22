/**
 * Financial Reports & Profit/Loss Analytics Screen
 * High-performance SQL aggregations for Net Sales, COGS, Gross Profit, and Net Operating Profit.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import {
  getFinancialSummary,
  getInventoryValuation,
  getBestSellingProducts,
  getExpensesByCategory,
} from '../../repositories/reportRepository';
import { formatCurrency } from '../../utils/currency';
import { getDateRange } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import ScreenContainer from '../../components/common/ScreenContainer';
import Header from '../../components/common/Header';
import DateFilterBar from '../../components/common/DateFilterBar';
import Card from '../../components/common/Card';
import StatCard from '../../components/common/StatCard';

export default function FinancialReportsScreen({ navigation }) {
  const { currencySymbol, dataVersion } = useApp();

  const [dateRangeKey, setDateRangeKey] = useState('this_month');
  const [summary, setSummary] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [bestSellers, setBestSellers] = useState([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadReportData = useCallback(async () => {
    try {
      const { startDate, endDate } = getDateRange(dateRangeKey);
      const sum = await getFinancialSummary({ startDate, endDate });
      const inv = await getInventoryValuation();
      const topProducts = await getBestSellingProducts({ startDate, endDate, limit: 5 });
      const expCat = await getExpensesByCategory({ startDate, endDate });

      setSummary(sum);
      setInventory(inv);
      setBestSellers(topProducts);
      setExpenseBreakdown(expCat);
    } catch (err) {
      console.warn('Error loading financial reports:', err);
    }
  }, [dateRangeKey]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData, dataVersion]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const isNetProfit = (summary?.netOperatingProfit || 0) >= 0;

  return (
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
      <Header
        title="Financial Intelligence"
        subtitle="Revenue, Cost & Profit Accounting"
        onBack={() => navigation.goBack()}
      />

      <DateFilterBar selectedRange={dateRangeKey} onSelectRange={setDateRangeKey} />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Profit Highlights */}
        <View style={styles.gridRow}>
          <StatCard
            title="Net Operating Profit"
            value={formatCurrency(summary?.netOperatingProfit || 0, currencySymbol)}
            subtitle="Gross profit minus expenses"
            icon="trending-up"
            iconColor={isNetProfit ? COLORS.success : COLORS.danger}
            iconBg={isNetProfit ? 'rgba(74, 124, 89, 0.12)' : 'rgba(197, 83, 62, 0.12)'}
          />
          <StatCard
            title="Gross Margin"
            value={formatCurrency(summary?.grossProfit || 0, currencySymbol)}
            subtitle="Net sales minus COGS"
            icon="pie-chart"
            iconColor={COLORS.primary}
            iconBg={COLORS.primarySurface}
          />
        </View>

        <View style={styles.gridRow}>
          <StatCard
            title="Net Sales"
            value={formatCurrency(summary?.netSales || 0, currencySymbol)}
            subtitle={`${summary?.transactionCount || 0} completed receipts`}
            icon="receipt-outline"
            iconColor={COLORS.secondary}
            iconBg={COLORS.surfaceSubtle}
          />
          <StatCard
            title="Stock Sold (COGS)"
            value={formatCurrency(summary?.netCogs || 0, currencySymbol)}
            subtitle="Purchase cost of units sold"
            icon="cube-outline"
            iconColor={COLORS.textSecondary}
            iconBg={COLORS.surfaceSubtle}
          />
        </View>

        {/* Accounting Statement Breakdown */}
        <Card style={styles.card}>
          <View style={styles.statementHeader}>
            <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>P&L Income Statement</Text>
          </View>

          <View style={styles.statementRow}>
            <Text style={styles.stLabel}>Gross Retail Sales</Text>
            <Text style={styles.stVal}>{formatCurrency(summary?.grossSales || 0, currencySymbol)}</Text>
          </View>

          <View style={styles.statementRow}>
            <Text style={styles.stSubLabel}>Less: Sales Discounts Allowed</Text>
            <Text style={styles.stNegVal}>-{formatCurrency(summary?.discounts || 0, currencySymbol)}</Text>
          </View>

          <View style={styles.statementRow}>
            <Text style={styles.stSubLabel}>Less: Customer Returns & Refunds</Text>
            <Text style={styles.stNegVal}>-{formatCurrency(summary?.returnedSales || 0, currencySymbol)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statementRow}>
            <Text style={styles.stBoldLabel}>= Net Revenue</Text>
            <Text style={styles.stBoldVal}>{formatCurrency(summary?.netSales || 0, currencySymbol)}</Text>
          </View>

          <View style={styles.statementRow}>
            <Text style={styles.stSubLabel}>Less: Cost of Goods Sold (COGS)</Text>
            <Text style={styles.stNegVal}>-{formatCurrency(summary?.netCogs || 0, currencySymbol)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statementRow}>
            <Text style={styles.stBoldLabel}>= Gross Profit</Text>
            <Text style={styles.stBoldVal}>{formatCurrency(summary?.grossProfit || 0, currencySymbol)}</Text>
          </View>

          <View style={styles.statementRow}>
            <Text style={styles.stSubLabel}>Less: Store Operating Expenses</Text>
            <Text style={styles.stNegVal}>-{formatCurrency(summary?.operatingExpenses || 0, currencySymbol)}</Text>
          </View>

          <View style={styles.doubleDivider} />

          <View style={styles.statementRow}>
            <Text style={styles.stNetProfitLabel}>= Net Boutique Profit</Text>
            <Text
              style={[
                styles.stNetProfitVal,
                isNetProfit ? { color: COLORS.success } : { color: COLORS.danger },
              ]}
            >
              {formatCurrency(summary?.netOperatingProfit || 0, currencySymbol)}
            </Text>
          </View>
        </Card>

        {/* Inventory Valuation Card */}
        <Card style={styles.card}>
          <View style={styles.statementHeader}>
            <Ionicons name="pricetags-outline" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Inventory Health & Valuation</Text>
          </View>

          <View style={styles.statementRow}>
            <Text style={styles.stLabel}>Total Units in Stock</Text>
            <Text style={styles.stVal}>{inventory?.totalUnitsInStock || 0} pcs</Text>
          </View>
          <View style={styles.statementRow}>
            <Text style={styles.stLabel}>Inventory at Wholesale Cost</Text>
            <Text style={styles.stVal}>{formatCurrency(inventory?.totalCostValue || 0, currencySymbol)}</Text>
          </View>
          <View style={styles.statementRow}>
            <Text style={styles.stLabel}>Inventory at Retail Value</Text>
            <Text style={styles.stVal}>{formatCurrency(inventory?.totalRetailValue || 0, currencySymbol)}</Text>
          </View>
          <View style={styles.statementRow}>
            <Text style={styles.stLabel}>Potential Retail Profit</Text>
            <Text style={[styles.stVal, { color: COLORS.success, fontWeight: '800' }]}>
              {formatCurrency(inventory?.potentialProfit || 0, currencySymbol)}
            </Text>
          </View>
        </Card>

        {/* Best Selling Products */}
        <Card style={styles.card}>
          <View style={styles.statementHeader}>
            <Ionicons name="sparkles-outline" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Top Selling Items</Text>
          </View>

          {bestSellers && bestSellers.length > 0 ? (
            bestSellers.map((item, index) => (
              <View key={item.id || index} style={styles.bestSellerRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.bsInfo}>
                  <Text style={styles.bsName}>{item.product_name || item.name}</Text>
                  <Text style={styles.bsDetail}>
                    {item.total_quantity_sold || item.unitsSold || 0} units sold
                  </Text>
                </View>
                <Text style={styles.bsRevenue}>
                  {formatCurrency(item.total_revenue || item.revenue || 0, currencySymbol)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No sales recorded for this period.</Text>
          )}
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  gridRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  card: {
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
  },
  statementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  statementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  stLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
  },
  stSubLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    paddingLeft: SPACING.sm,
  },
  stVal: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  stNegVal: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.danger,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.xs,
  },
  doubleDivider: {
    height: 2,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  stBoldLabel: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stBoldVal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stNetProfitLabel: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  stNetProfitVal: {
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
  },
  bestSellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  rankText: {
    ...TYPOGRAPHY.captionSmall,
    fontWeight: '800',
    color: COLORS.primary,
  },
  bsInfo: {
    flex: 1,
  },
  bsName: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  bsDetail: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  bsRevenue: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '800',
    color: COLORS.primary,
  },
  emptyText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
    paddingVertical: SPACING.md,
  },
});
