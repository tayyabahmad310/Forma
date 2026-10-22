/**
 * Customers Directory & Outstanding Credit Balances Screen
 * High-end boutique customer directory with credit tracking.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
import ScreenContainer from '../../components/common/ScreenContainer';
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
      if (editingId) {
        await updateCustomer(editingId, {
          name: name.trim(),
          phone: phone.trim() || null,
          notes: notes.trim() || null,
        });
      } else {
        await createCustomer({
          name: name.trim(),
          phone: phone.trim() || null,
          notes: notes.trim() || null,
        });
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
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
      <Header
        title="Clientele Directory"
        subtitle="VIP Customers & Balances"
        onBack={() => navigation.goBack()}
        rightIcon="person-add-outline"
        onRightPress={openAddModal}
      />

      <View style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by client name or phone..."
          onClear={() => setSearch('')}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterPill, !hasBalanceOnly && styles.filterPillActive]}
          onPress={() => setHasBalanceOnly(false)}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterPillText, !hasBalanceOnly && styles.filterPillTextActive]}>
            All Clientele
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterPill, hasBalanceOnly && styles.filterPillActive]}
          onPress={() => setHasBalanceOnly(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterPillText, hasBalanceOnly && styles.filterPillTextActive]}>
            Due Credit Balances
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={customers}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const hasBalance = item.current_balance > 0;
          return (
            <Card style={styles.customerCard}>
              <TouchableOpacity
                style={styles.cardPressable}
                onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
                activeOpacity={0.7}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {(item.name || 'C').charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{item.name}</Text>
                  {item.phone ? (
                    <Text style={styles.customerPhone}>
                      <Ionicons name="call-outline" size={12} color={COLORS.textTertiary} /> {item.phone}
                    </Text>
                  ) : null}
                  <Text style={styles.spentText}>
                    Total Purchases: {formatCurrency(item.total_spent || 0, currencySymbol)}
                  </Text>
                </View>

                <View style={styles.balanceCol}>
                  {hasBalance ? (
                    <View style={styles.balancePill}>
                      <Text style={styles.balanceLabel}>Due Balance</Text>
                      <Text style={styles.balanceVal}>
                        {formatCurrency(item.current_balance, currencySymbol)}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.settledPill}>
                      <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                      <Text style={styles.settledText}>Settled</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} style={styles.chev} />
                </View>
              </TouchableOpacity>
            </Card>
          );
        }}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="people-outline"
              title="No Clientele Found"
              subtitle="Add your regular customers to track personalized sizing, sales history, and credit."
              actionLabel="Add Customer"
              onAction={openAddModal}
            />
          )
        }
      />

      {/* Add / Edit Customer Modal */}
      <ModalSheet
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Customer' : 'Add New VIP Customer'}
        subtitle="Manage client profile and contact notes"
      >
        <Input
          label="Customer Full Name *"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Ayesha Khan"
        />

        <Input
          label="Mobile Phone / WhatsApp"
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. +92 300 1234567"
          keyboardType="phone-pad"
        />

        <Input
          label="Preferences / Sizing Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Prefers Medium, silk fabrics only."
          multiline
          numberOfLines={2}
        />

        <Button
          title="Save Customer Profile"
          variant="primary"
          loading={saving}
          onPress={handleSave}
          style={styles.modalBtn}
        />
      </ModalSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: 8,
    marginVertical: SPACING.sm,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: COLORS.textInverse,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  customerCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  cardPressable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarInitial: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '800',
    color: COLORS.primary,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  customerPhone: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  spentText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  balanceCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  balancePill: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.danger,
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  balanceVal: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '800',
    color: COLORS.danger,
  },
  settledPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settledText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.success,
    fontWeight: '700',
  },
  chev: {
    marginTop: 2,
  },
  modalBtn: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.pill,
  },
});
