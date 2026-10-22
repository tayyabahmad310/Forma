/**
 * Suppliers & Wholesalers Directory Screen
 * Manage apparel vendors, wholesale contacts, and purchase orders.
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
  getSuppliersPaginated,
  createSupplier,
  updateSupplier,
} from '../../repositories/supplierRepository';
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

  const openEditModal = (sup) => {
    setEditingId(sup.id);
    setName(sup.name);
    setPhone(sup.phone || '');
    setEmail(sup.email || '');
    setAddress(sup.address || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Supplier or vendor name is required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
      };

      if (editingId) {
        await updateSupplier(editingId, payload);
      } else {
        await createSupplier(payload);
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
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
      <Header
        title="Vendors & Mills"
        subtitle="Wholesalers & Apparel Suppliers"
        onBack={() => navigation.goBack()}
        rightIcon="add-outline"
        onRightPress={openAddModal}
      />

      <View style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search wholesale suppliers..."
          onClear={() => setSearch('')}
        />
      </View>

      <FlatList
        data={suppliers}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Card style={styles.supplierCard}>
            <View style={styles.supplierRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="business-outline" size={20} color={COLORS.primary} />
              </View>

              <View style={styles.supplierInfo}>
                <Text style={styles.supplierName}>{item.name}</Text>
                {item.phone ? (
                  <Text style={styles.detailText}>
                    <Ionicons name="call-outline" size={12} color={COLORS.textTertiary} /> {item.phone}
                  </Text>
                ) : null}
                {item.address ? (
                  <Text style={styles.detailText}>
                    <Ionicons name="location-outline" size={12} color={COLORS.textTertiary} /> {item.address}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => openEditModal(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="business-outline"
              title="No Wholesale Vendors"
              subtitle="Add suppliers to record bulk stock replenishment and purchase orders."
              actionLabel="Add Supplier"
              onAction={openAddModal}
            />
          )
        }
      />

      {/* Add / Edit Supplier Modal */}
      <ModalSheet
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Vendor' : 'Add Wholesale Supplier'}
        subtitle="Apparel mill, manufacturer, or importer"
      >
        <Input
          label="Vendor / Mill Name *"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Sapphire Fabrics & Wholesale"
        />

        <Input
          label="Phone / WhatsApp Contact"
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. +92 300 9876543"
          keyboardType="phone-pad"
        />

        <Input
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          placeholder="e.g. sales@vendor.com"
          keyboardType="email-address"
        />

        <Input
          label="Warehouse / Factory Address"
          value={address}
          onChangeText={setAddress}
          placeholder="e.g. Industrial Area, Faisalabad"
        />

        <Button
          title="Save Supplier Profile"
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
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  supplierCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  detailText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  editBtn: {
    padding: SPACING.xs,
  },
  modalBtn: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.pill,
  },
});
