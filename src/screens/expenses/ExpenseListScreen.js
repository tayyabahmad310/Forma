/**
 * Operating Business Expenses Screen
 * Luxury boutique store ledger with safe-area insets and category pills.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import {
  getExpensesPaginated,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../../repositories/expenseRepository';
import { EXPENSE_CATEGORIES } from '../../constants/config';
import { formatCurrency, toMinorUnits, toMajorUnits } from '../../utils/currency';
import { formatDate, getTodayDateString, getDateRange } from '../../utils/date';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../constants/theme';
import ScreenContainer from '../../components/common/ScreenContainer';
import Header from '../../components/common/Header';
import DateFilterBar from '../../components/common/DateFilterBar';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import ModalSheet from '../../components/common/ModalSheet';
import Input from '../../components/common/Input';
import EmptyState from '../../components/common/EmptyState';

export default function ExpenseListScreen({ navigation }) {
  const { currencySymbol, dataVersion, notifyDataChanged } = useApp();

  const [dateRangeKey, setDateRangeKey] = useState('this_month');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(getTodayDateString());
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(dateRangeKey);
      const rows = await getExpensesPaginated({
        category: selectedCategory === 'All' ? null : selectedCategory,
        startDate: dateRangeKey === 'all' ? null : startDate,
        endDate: dateRangeKey === 'all' ? null : endDate,
        limit: 100,
      });
      setExpenses(rows);
    } catch (err) {
      console.warn('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRangeKey, selectedCategory]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses, dataVersion]);

  const openAddModal = () => {
    setEditingId(null);
    setTitle('');
    setCategory(EXPENSE_CATEGORIES[0]);
    setAmount('');
    setExpenseDate(getTodayDateString());
    setPaymentMethod('CASH');
    setNotes('');
    setShowModal(true);
  };

  const openEditModal = (exp) => {
    setEditingId(exp.id);
    setTitle(exp.title);
    setCategory(exp.category);
    setAmount(String(toMajorUnits(exp.amount)));
    setExpenseDate(exp.expense_date);
    setPaymentMethod(exp.payment_method || 'CASH');
    setNotes(exp.notes || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter an expense title.');
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive expense amount.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        category,
        amount: toMinorUnits(amount),
        expenseDate,
        paymentMethod,
        notes: notes.trim() || null,
      };

      if (editingId) {
        await updateExpense(editingId, payload);
      } else {
        await createExpense(payload);
      }

      notifyDataChanged();
      setShowModal(false);
      loadExpenses();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteExpense(id);
          notifyDataChanged();
          loadExpenses();
        },
      },
    ]);
  };

  const totalExpenseMinor = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <ScreenContainer backgroundColor={COLORS.background} topSafe bottomSafe>
      <Header
        title="Store Expenses"
        subtitle="Operational Overhead & Bills"
        onBack={() => navigation.goBack()}
        rightIcon="add-outline"
        onRightPress={openAddModal}
      />

      <DateFilterBar selectedRange={dateRangeKey} onSelectRange={setDateRangeKey} />

      {/* Category Pills */}
      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPills}>
          {['All', ...EXPENSE_CATEGORIES].map((c) => {
            const isSelected = selectedCategory === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.catPill, isSelected && styles.catPillSelected]}
                onPress={() => setSelectedCategory(c)}
                activeOpacity={0.8}
              >
                <Text style={[styles.catPillText, isSelected && styles.catPillTextSelected]}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Total Banner */}
      <View style={styles.totalBanner}>
        <Text style={styles.totalLabel}>Total Period Expenses</Text>
        <Text style={styles.totalVal}>{formatCurrency(totalExpenseMinor, currencySymbol)}</Text>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Card style={styles.expenseCard}>
            <View style={styles.expenseRow}>
              <View style={styles.expenseLeft}>
                <View style={styles.tagRow}>
                  <View style={styles.catBadge}>
                    <Text style={styles.catText}>{item.category}</Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(item.expense_date)}</Text>
                </View>

                <Text style={styles.expenseTitle}>{item.title}</Text>
                {item.notes ? <Text style={styles.notesText}>"{item.notes}"</Text> : null}
              </View>

              <View style={styles.expenseRight}>
                <Text style={styles.expenseAmount}>
                  -{formatCurrency(item.amount, currencySymbol)}
                </Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconBtn}>
                    <Ionicons name="create-outline" size={16} color={COLORS.textTertiary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="wallet-outline"
              title="No Expenses Logged"
              subtitle="Keep track of store rent, utilities, electricity, and salaries for accurate net profit."
              actionLabel="Add Expense"
              onAction={openAddModal}
            />
          )
        }
      />

      {/* Add / Edit Expense Modal */}
      <ModalSheet
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Expense' : 'Log Store Expense'}
        subtitle="Record shop operational cost"
      >
        <Input
          label="Expense Title *"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Electricity Bill or Shop Rent"
        />

        <Text style={styles.fieldLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalPills}>
          {EXPENSE_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.modalChip, category === cat && styles.modalChipSelected]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.modalChipText, category === cat && styles.modalChipTextSelected]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Input
          label={`Amount (${currencySymbol}) *`}
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="numeric"
        />

        <Input
          label="Notes / Voucher Reference"
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional notes or receipt number"
        />

        <Button
          title="Save Expense Record"
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
  categoryBar: {
    paddingVertical: SPACING.xs,
  },
  categoryPills: {
    paddingHorizontal: SPACING.lg,
    gap: 8,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catPillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catPillText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  catPillTextSelected: {
    color: COLORS.textInverse,
  },
  totalBanner: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalVal: {
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
    color: COLORS.danger,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  expenseCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  catBadge: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  catText: {
    ...TYPOGRAPHY.captionSmall,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  dateText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
  },
  expenseTitle: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  notesText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  expenseRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  expenseAmount: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: COLORS.danger,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    padding: 2,
  },
  fieldLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
  },
  modalPills: {
    marginBottom: SPACING.md,
  },
  modalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSubtle,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modalChipText: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.textPrimary,
  },
  modalChipTextSelected: {
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  modalBtn: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.pill,
  },
});
