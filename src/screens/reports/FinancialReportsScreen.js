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
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import {
  getFinancialSummary,
  getInventoryValuation,
  getBestSellingProducts,
  getExpensesByCategory,
} from '../../repositories/reportRepository';
import { formatCurrency } from '../../utils/currency';
import { getDateRange } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
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
    <SafeAreaView style={styles.safeArea}>
      <Header title="Financial & Profit Reports" onBack={() => navigation.goBack()} />

      <DateFilterBar selectedRange={dateRangeKey} onSelectRange={setDateRangeKey} />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
            iconBg={isNetProfit ? COLORS.successLight : COLORS.dangerLight}
          />
          <StatCard
            title="Gross Profit"
            value={formatCurrency(summary?.grossProfit || 0, currencySymbol)}
            subtitle="Net sales minus COGS"
            icon="pie-chart"
            iconColor={COLORS.accent}
            iconBg={COLORS.accentLight}
          />
        </View>

        <View style={styles.gridRow}>
          <StatCard
            title="Net Sales"
            value={formatCurrency(summary?.netSales || 0, currencySymbol)}
            subtitle={`${summary?.transactionCount || 0} completed orders`}
            icon="cart"
            iconColor={COLORS.info}
            iconBg={COLORS.infoLight}
          />
          <StatCard
            title="Cost of Goods (COGS)"
            value={formatCurrency(summary?.netCogs || 0, currencySymbol)}
            subtitle="Historical stock cost sold"
            icon="cube"
            iconColor={COLORS.textSecondary}
            iconBg={COLORS.surfaceSubtle}
          />
        </View>

        {/* Accounting Statement Breakdown */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Profit & Loss Statement</Text>

          <View style={styles.statementRow}>
            <Text style={styles.stLabel}>Gross Sales</Text>
            <Text style={styles.stVal}>{formatCurrency(summary?.grossSales || 0, currencySymbol)}</Text>
          </View>

          <View style={styles.statementRow}>
            <Text style={styles.stSubLabel}>Less: Sales Discounts</Text>
            <Text style={styles.stNegVal}>-{formatCurrency(summary?.discounts || 0, currencySymbol)}</Text>
          </View>

          <View style={styles.statementRow}>
            <Text style={styles.stSubLabel}>Less: Customer Returns & Refunds</Text>
            <Text style={styles.stNegVal}>-{formatCurrency(summary?.returnedSales || 0, currencySymbol)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statementRow}>
            <Text style={styles.stBoldLabel}>= Net Sales</Text>
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
            <Text style={styles.stSubLabel}>Less: Operating Expenses</Text>
            <Text style={styles.stNegVal}>-{formatCurrency(summary?.operatingExpenses || 0, currencySymbol)}</Text>
          </View>

          <View style={styles.doubleDivider} />

          <View style={styles.statementRow}>
            <Text style={styles.stNetProfitLabel}>= Net Operating Profit</Text>
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
          <Text style={styles.cardTitle}>Inventory Health & Valuation</Text>
          <View style={styles.statementRow}>
            <Text style={styles.stLabel}>Total Sellable Units</Text>
            <Text style={styles.stVal}>{inventory?.totalUnitsInStock || 0} pcs</Text>
          </View>
          <View style={styles.statementRow}>
            <Text style={styles.stLabel}>Stock Value at Purchase Cost</Text>
            <Text style={styles.stVal}>{formatCurrency(inventory?.totalCostValue || 0, currencySymbol)}</Text>
          </View>
          <View style={styles.statementRow}>
            <Text style={styles.stLabel}>Stock Value at Retail Price</Text>
            <Text style={styles.stVal}>{formatCurrency(inventory?.totalRetailValue || 0, currencySymbol)}</Text>
          </View>
          <View style={styles.statementRow}>
            <Text style={styles.stLabel}>Unrealized Inventory Profit Margin</Text>
            <Text style={[styles.stVal, { color: COLORS.success }]}>
              {formatCurrency(inventory?.potentialProfit || 0, currencySymbol)}
            </Text>
          </View>
        </Card>

        {/* Best Selling Products */}
        {bestSellers.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Top Selling Clothing Items</Text>
            {bestSellers.map((item, idx) => (
              <View key={item.product_id} style={styles.bestSellerRow}>
                <View style={styles.bestSellerIndex}>
                  <Text style={styles.indexText}>#{idx + 1}</Text>
                </View>
                <View style={styles.bestSellerInfo}>
                  <Text style={styles.bsName}>{item.product_name}</Text>
                  <Text style={styles.bsCategory}>{item.category_name || 'General'}</Text>
                </View>
                <View style={styles.bestSellerStats}>
                  <Text style={styles.bsUnits}>{item.units_sold} sold</Text>
                  <Text style={styles.bsRevenue}>
                    {formatCurrency(item.total_revenue, currencySymbol)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Operating Expenses Breakdown */}
        {expenseBreakdown.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Expenses by Category</Text>
            {expenseBreakdown.map((exp) => (
              <View key={exp.category} style={styles.expRow}>
                <Text style={styles.expCat}>{exp.category}</Text>
                <Text style={styles.expAmount}>
                  {formatCurrency(exp.total_amount, currencySymbol)}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  card: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  statementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
  },
  stVal: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  stSubLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    paddingLeft: SPACING.sm,
  },
  stNegVal: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.danger,
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
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  stNetProfitVal: {
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.xs + 2,
  },
  doubleDivider: {
    height: 2,
    backgroundColor: COLORS.borderDark,
    marginVertical: SPACING.sm,
  },
  bestSellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  bestSellerIndex: {
    width: 28,
    alignItems: 'center',
  },
  indexText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.accent,
  },
  bestSellerInfo: {
    flex: 1,
    marginLeft: 4,
  },
  bsName: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  bsCategory: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  bestSellerStats: {
    alignItems: 'flex-end',
  },
  bsUnits: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  bsRevenue: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  expRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  expCat: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  expAmount: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.danger,
  },
});
