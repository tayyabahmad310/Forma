/**
 * Business Dashboard Screen
 * High-level operational overview: sales, profit, inventory value, alerts, and quick actions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { getDashboardData } from '../../repositories/reportRepository';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import StatCard from '../../components/common/StatCard';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';

export default function DashboardScreen({ navigation }) {
  const { currencySymbol, businessName, dataVersion } = useApp();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await getDashboardData();
      setData(result);
    } catch (err) {
      console.warn('Error loading dashboard data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, dataVersion]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const today = data?.today || {};
  const inventory = data?.inventory || {};
  const lowStockAlerts = data?.lowStockAlerts || [];
  const recentSales = data?.recentSales || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Profile */}
        <View style={styles.header}>
          <View>
            <Text style={styles.businessTitle}>{businessName}</Text>
            <Text style={styles.subtitle}>Daily Operations & POS Overview</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigation.navigate('SettingsTab')}
          >
            <Ionicons name="settings-outline" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions Bar */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.posActionButton]}
            onPress={() => navigation.navigate('POSTab')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconCirclePrimary}>
              <Ionicons name="cash" size={20} color={COLORS.textInverse} />
            </View>
            <Text style={styles.actionButtonTextPrimary}>New Sale</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ProductForm', {})}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="shirt-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.actionButtonText}>Add Product</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('PurchaseForm', {})}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="cart-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.actionButtonText}>Add Purchase</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ExpensesScreen')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="receipt-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.actionButtonText}>Add Expense</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Key Metrics */}
        <Text style={styles.sectionHeader}>Today's Snapshot</Text>
        <View style={styles.gridRow}>
          <StatCard
            title="Today's Sales"
            value={formatCurrency(today.netSales || 0, currencySymbol)}
            subtitle={`${today.transactionCount || 0} order${today.transactionCount !== 1 ? 's' : ''}`}
            icon="cart"
            iconColor={COLORS.info}
            iconBg={COLORS.infoLight}
            onPress={() => navigation.navigate('SalesHistory')}
          />
          <StatCard
            title="Today's Profit"
            value={formatCurrency(today.netOperatingProfit || 0, currencySymbol)}
            subtitle={`Gross: ${formatCurrency(today.grossProfit || 0, currencySymbol)}`}
            icon="trending-up"
            iconColor={today.netOperatingProfit >= 0 ? COLORS.success : COLORS.danger}
            iconBg={today.netOperatingProfit >= 0 ? COLORS.successLight : COLORS.dangerLight}
            onPress={() => navigation.navigate('ReportsTab')}
          />
        </View>

        <View style={styles.gridRow}>
          <StatCard
            title="Today's Expenses"
            value={formatCurrency(today.operatingExpenses || 0, currencySymbol)}
            icon="wallet"
            iconColor={COLORS.danger}
            iconBg={COLORS.dangerLight}
            onPress={() => navigation.navigate('ExpensesScreen')}
          />
          <StatCard
            title="Customer Credit"
            value={formatCurrency(data?.totalCustomerReceivables || 0, currencySymbol)}
            subtitle="Outstanding balance"
            icon="people"
            iconColor={COLORS.warning}
            iconBg={COLORS.warningLight}
            onPress={() => navigation.navigate('CustomerList', { filter: 'balance' })}
          />
        </View>

        {/* Inventory Overview Card */}
        <Card style={styles.inventoryCard} onPress={() => navigation.navigate('ProductsTab')}>
          <View style={styles.inventoryHeader}>
            <View>
              <Text style={styles.cardHeaderTitle}>Inventory Valuation</Text>
              <Text style={styles.cardHeaderSubtitle}>
                {inventory.totalProducts || 0} products • {inventory.totalUnitsInStock || 0} units in stock
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
          </View>

          <View style={styles.inventoryMetricsRow}>
            <View style={styles.invMetric}>
              <Text style={styles.invMetricLabel}>Cost Value</Text>
              <Text style={styles.invMetricValue}>
                {formatCurrency(inventory.totalCostValue || 0, currencySymbol)}
              </Text>
            </View>
            <View style={styles.invDivider} />
            <View style={styles.invMetric}>
              <Text style={styles.invMetricLabel}>Retail Value</Text>
              <Text style={styles.invMetricValue}>
                {formatCurrency(inventory.totalRetailValue || 0, currencySymbol)}
              </Text>
            </View>
            <View style={styles.invDivider} />
            <View style={styles.invMetric}>
              <Text style={styles.invMetricLabel}>Low Stock Items</Text>
              <Text
                style={[
                  styles.invMetricValue,
                  (inventory.lowStockCount || 0) > 0 && { color: COLORS.warning },
                ]}
              >
                {inventory.lowStockCount || 0}
              </Text>
            </View>
          </View>
        </Card>

        {/* Low Stock Alerts */}
        {lowStockAlerts.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionHeader}>Low Stock Warnings</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ProductsTab', { filter: 'low_stock' })}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {lowStockAlerts.map((item) => (
              <Card
                key={item.id}
                style={styles.alertCard}
                onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
              >
                <View style={styles.alertRow}>
                  <View style={styles.alertIconCircle}>
                    <Ionicons name="alert-circle" size={20} color={COLORS.warning} />
                  </View>
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.alertSubtitle}>
                      Alert threshold: {item.min_stock_alert} units
                    </Text>
                  </View>
                  <Badge
                    label={`${item.current_stock} left`}
                    variant={item.current_stock === 0 ? 'danger' : 'warning'}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionHeader}>Recent Sales</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SalesHistory')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentSales.length === 0 ? (
            <EmptyState
              icon="cart-outline"
              title="No sales recorded yet"
              description="Open POS to start processing customer sales orders."
              actionTitle="Open POS"
              onAction={() => navigation.navigate('POSTab')}
            />
          ) : (
            recentSales.map((sale) => (
              <Card
                key={sale.id}
                style={styles.recentSaleCard}
                onPress={() => navigation.navigate('SaleDetail', { saleId: sale.id })}
              >
                <View style={styles.saleRow}>
                  <View style={styles.saleLeft}>
                    <Text style={styles.saleInvoice}>{sale.invoice_number}</Text>
                    <Text style={styles.saleCustomer}>
                      {sale.customer_name_snapshot || 'Walk-in Customer'} • {formatDate(sale.sale_date)}
                    </Text>
                  </View>
                  <View style={styles.saleRight}>
                    <Text style={styles.saleTotal}>
                      {formatCurrency(sale.total_amount, currencySymbol)}
                    </Text>
                    <Badge
                      label={sale.payment_status}
                      variant={
                        sale.payment_status === 'PAID'
                          ? 'success'
                          : sale.payment_status === 'PARTIAL'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    />
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  businessTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  posActionButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionIconCirclePrimary: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  actionButtonTextPrimary: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  sectionHeader: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  viewAllText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.accent,
    fontWeight: '600',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  inventoryCard: {
    marginVertical: SPACING.sm,
    padding: SPACING.lg,
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardHeaderTitle: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardHeaderSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  inventoryMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  invMetric: {
    flex: 1,
    alignItems: 'center',
  },
  invMetricLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  invMetricValue: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  invDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.borderLight,
  },
  sectionContainer: {
    marginTop: SPACING.lg,
  },
  alertCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderColor: COLORS.warningLight,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  alertSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  recentSaleCard: {
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
  saleInvoice: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  saleCustomer: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  saleRight: {
    alignItems: 'flex-end',
  },
  saleTotal: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
});
