/**
 * Customers Directory & Outstanding Credit Balances Screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import {
  getCustomersPaginated,
  createCustomer,
  updateCustomer,
} from '../../repositories/customerRepository';
import { formatCurrency } from '../../utils/currency';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import Header from '../../components/common/Header';
import SearchBar from '../../components/common/SearchBar';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import ModalSheet from '../../components/common/ModalSheet';
import Input from '../../components/common/Input';
import EmptyState from '../../components/common/EmptyState';

export default function CustomerListScreen({ route, navigation }) {
  const { currencySymbol, dataVersion } = useApp();
  const filterByBalance = route.params?.filter === 'balance';

  const [hasBalanceOnly, setHasBalanceOnly] = useState(filterByBalance);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await getCustomersPaginated({
        search,
        hasBalanceOnly,
        limit: 100,
      });
      setCustomers(rows);
    } catch (err) {
      console.warn('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  }, [search, hasBalanceOnly]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers, dataVersion]);

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setNotes('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Customer name is required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      };

      if (editingId) {
        await updateCustomer(editingId, payload);
      } else {
        await createCustomer(payload);
      }

      setShowModal(false);
      loadCustomers();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Customers"
        subtitle={`${customers.length} registered customers`}
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <Ionicons name="add" size={20} color={COLORS.textInverse} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search customer name or phone..."
          onClear={() => setSearch('')}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabFilterRow}>
        <TouchableOpacity
          style={[styles.tabFilterBtn, !hasBalanceOnly && styles.tabFilterBtnActive]}
          onPress={() => setHasBalanceOnly(false)}
        >
          <Text style={[styles.tabFilterText, !hasBalanceOnly && styles.tabFilterTextActive]}>
            All Customers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabFilterBtn, hasBalanceOnly && styles.tabFilterBtnActive]}
          onPress={() => setHasBalanceOnly(true)}
        >
          <Text style={[styles.tabFilterText, hasBalanceOnly && styles.tabFilterTextActive]}>
            Credit Due Only
          </Text>
        </TouchableOpacity>
      </View>

      {customers.length === 0 && !loading ? (
        <EmptyState
          icon="people-outline"
          title="No customers found"
          description="Register customers to track credit sales, order history, and installments."
          actionTitle="Add Customer"
          onAction={openAddModal}
        />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Card
              style={styles.card}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
            >
              <View style={styles.row}>
                <View style={styles.leftCol}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.phone ? <Text style={styles.metaText}>Tel: {item.phone}</Text> : null}
                  <Text style={styles.orderCount}>
                    {item.total_orders} order{item.total_orders !== 1 ? 's' : ''}
                  </Text>
                </View>

                <View style={styles.rightCol}>
                  {item.outstanding_balance > 0 ? (
                    <View style={styles.dueBadge}>
                      <Text style={styles.dueLabel}>Credit Due</Text>
                      <Text style={styles.dueAmount}>
                        {formatCurrency(item.outstanding_balance, currencySymbol)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.noDueText}>No Balance Due</Text>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} style={{ marginTop: 8 }} />
                </View>
              </View>
            </Card>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Customer Modal */}
      <ModalSheet
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Customer' : 'Add Customer'}
        subtitle="Customer contact and store credit ledger profile"
      >
        <Input
          label="Customer Full Name *"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Tayyab Khan"
        />

        <Input
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. 0300 1234567"
          keyboardType="phone-pad"
        />

        <Input
          label="Customer Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Preferred sizes, boutique member, special discounts"
          multiline
          numberOfLines={2}
        />

        <Button
          title={editingId ? 'Save Changes' : 'Create Customer'}
          variant="primary"
          loading={saving}
          onPress={handleSave}
          style={{ marginTop: 12 }}
        />
      </ModalSheet>
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
  searchSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  tabFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  tabFilterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.sm,
    marginRight: 6,
  },
  tabFilterBtnActive: {
    backgroundColor: COLORS.primary,
  },
  tabFilterText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  tabFilterTextActive: {
    color: COLORS.textInverse,
  },
  listContent: {
    padding: SPACING.lg,
  },
  card: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftCol: {
    flex: 1,
  },
  name: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  metaText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  orderCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  dueBadge: {
    alignItems: 'flex-end',
  },
  dueLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '700',
  },
  dueAmount: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '800',
    color: COLORS.warning,
  },
  noDueText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontWeight: '600',
  },
});
