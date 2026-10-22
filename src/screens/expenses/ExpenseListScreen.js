/**
 * Operating Business Expenses Screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
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
    setPaymentMethod(exp.payment_method);
    setNotes(exp.notes || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter expense title.');
      return;
    }
    const minor = toMinorUnits(amount);
    if (minor <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        category,
        amount: minor,
        expenseDate,
        paymentMethod,
        notes: notes.trim() || null,
      };

      if (editingId) {
        await updateExpense(editingId, payload);
      } else {
        await createExpense(payload);
      }

      setShowModal(false);
      notifyDataChanged();
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

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Operating Expenses"
        subtitle={`Total: ${formatCurrency(totalExpenseAmount, currencySymbol)}`}
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <Ionicons name="add" size={20} color={COLORS.textInverse} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        }
      />

      <DateFilterBar selectedRange={dateRangeKey} onSelectRange={setDateRangeKey} />

      {/* Category Pills */}
      <View style={styles.categoryPillsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPills}>
          {['All', ...EXPENSE_CATEGORIES].map((c) => {
            const isSelected = selectedCategory === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.catPill, isSelected && styles.catPillSelected]}
                onPress={() => setSelectedCategory(c)}
              >
                <Text style={[styles.catPillText, isSelected && styles.catPillTextSelected]}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {expenses.length === 0 && !loading ? (
        <EmptyState
          icon="wallet-outline"
          title="No expenses recorded"
          description="Log daily shop running costs such as rent, utility bills, tea, and packaging."
          actionTitle="Record Expense"
          onAction={openAddModal}
        />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Card style={styles.card} onPress={() => openEditModal(item)}>
              <View style={styles.row}>
                <View style={styles.leftCol}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.metaText}>
                    {item.category} • {formatDate(item.expense_date)} • {item.payment_method}
                  </Text>
                  {item.notes ? <Text style={styles.notesText}>{item.notes}</Text> : null}
                </View>

                <View style={styles.rightCol}>
                  <Text style={styles.amount}>
                    {formatCurrency(item.amount, currencySymbol)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginTop: 6 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Expense Modal */}
      <ModalSheet
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Expense' : 'Record Operating Expense'}
        subtitle="Shop operating expense entry"
      >
        <Input
          label="Expense Title *"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Electricity Bill Oct 2026"
        />

        <Text style={styles.fieldLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalPillsRow}>
          {EXPENSE_CATEGORIES.map((c) => {
            const isSelected = category === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.modalChip, isSelected && styles.modalChipSelected]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.modalChipText, isSelected && styles.modalChipTextSelected]}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Input
          label={`Amount (${currencySymbol}) *`}
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="numeric"
        />

        <Input
          label="Expense Date (YYYY-MM-DD)"
          value={expenseDate}
          onChangeText={setExpenseDate}
          placeholder="YYYY-MM-DD"
        />

        <Input
          label="Notes / Memo"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Paid in cash by store manager"
        />

        <Button
          title={editingId ? 'Save Changes' : 'Record Expense'}
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
  categoryPillsBar: {
    paddingVertical: SPACING.xs,
  },
  categoryPills: {
    paddingHorizontal: SPACING.lg,
  },
  catPill: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSubtle,
    marginRight: SPACING.xs,
  },
  catPillSelected: {
    backgroundColor: COLORS.primary,
  },
  catPillText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  catPillTextSelected: {
    color: COLORS.textInverse,
    fontWeight: '700',
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
    marginRight: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  metaText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  notesText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  amount: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: COLORS.danger,
  },
  fieldLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  modalPillsRow: {
    marginBottom: SPACING.md,
  },
  modalChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
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
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
  },
  modalChipTextSelected: {
    color: COLORS.textInverse,
    fontWeight: '700',
  },
});
