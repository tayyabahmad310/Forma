/**
 * Suppliers Directory Screen
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
  getSuppliersPaginated,
  createSupplier,
  updateSupplier,
} from '../../repositories/supplierRepository';
import { formatCurrency } from '../../utils/currency';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import Header from '../../components/common/Header';
import SearchBar from '../../components/common/SearchBar';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import ModalSheet from '../../components/common/ModalSheet';
import Input from '../../components/common/Input';
import EmptyState from '../../components/common/EmptyState';

export default function SupplierListScreen({ navigation }) {
  const { currencySymbol, dataVersion } = useApp();

  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await getSuppliersPaginated({ search, limit: 100 });
      setSuppliers(rows);
    } catch (err) {
      console.warn('Error loading suppliers:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers, dataVersion]);

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setShowModal(true);
  };

  const openEditModal = (supp) => {
    setEditingId(supp.id);
    setName(supp.name);
    setPhone(supp.phone || '');
    setEmail(supp.email || '');
    setAddress(supp.address || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Supplier name is required.');
      return;
    }

    try {
      setSaving(true);
      const data = {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
      };

      if (editingId) {
        await updateSupplier(editingId, data);
      } else {
        await createSupplier(data);
      }

      setShowModal(false);
      loadSuppliers();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Suppliers"
        subtitle={`${suppliers.length} vendors`}
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
          placeholder="Search supplier name or phone..."
          onClear={() => setSearch('')}
        />
      </View>

      {suppliers.length === 0 && !loading ? (
        <EmptyState
          icon="business-outline"
          title="No suppliers found"
          description="Save clothing manufacturers and wholesale distributors."
          actionTitle="Add Supplier"
          onAction={openAddModal}
        />
      ) : (
        <FlatList
          data={suppliers}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Card style={styles.card} onPress={() => openEditModal(item)}>
              <View style={styles.row}>
                <View style={styles.leftCol}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.phone ? <Text style={styles.metaText}>Tel: {item.phone}</Text> : null}
                  {item.address ? <Text style={styles.metaText}>{item.address}</Text> : null}
                  <Text style={styles.orderCountText}>
                    {item.purchase_count} purchase order{item.purchase_count !== 1 ? 's' : ''}
                  </Text>
                </View>

                <View style={styles.rightCol}>
                  {item.outstanding_balance > 0 ? (
                    <View style={styles.balanceBadge}>
                      <Text style={styles.balanceLabel}>Payable Due</Text>
                      <Text style={styles.balanceAmount}>
                        {formatCurrency(item.outstanding_balance, currencySymbol)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.settledText}>Balance Settled</Text>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} style={{ marginTop: 8 }} />
                </View>
              </View>
            </Card>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Supplier Modal */}
      <ModalSheet
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Supplier' : 'Add New Supplier'}
        subtitle="Wholesale clothing vendor & distributor profile"
      >
        <Input
          label="Supplier / Business Name *"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Master Fabrics & Textiles"
        />

        <Input
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. 0321 1234567"
          keyboardType="phone-pad"
        />

        <Input
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          placeholder="supplier@example.com"
          keyboardType="email-address"
        />

        <Input
          label="Shop / Warehouse Address"
          value={address}
          onChangeText={setAddress}
          placeholder="e.g. Market Hall #4, Cloth Market"
        />

        <Button
          title={editingId ? 'Save Changes' : 'Create Supplier'}
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
    paddingVertical: SPACING.sm,
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
  orderCountText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  balanceBadge: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '600',
  },
  balanceAmount: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.warning,
  },
  settledText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontWeight: '600',
  },
});
