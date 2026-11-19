import React, { useState, useEffect } from 'react';
import {
  ReceiptText, Plus, Search, Calendar, Upload, FileText,
  DollarSign, TrendingDown, Trash2, X, AlertCircle, Eye
} from 'lucide-react';
import { apiClient } from '../services/api';
import { DailyExpense, ExpenseCategory, User } from '../types';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

interface ExpensesViewProps {
  currentUser: User;
  isQuickModalOpen: boolean;
  onCloseQuickModal: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  currentUser,
  isQuickModalOpen,
  onCloseQuickModal
}) => {
  const [expenses, setExpenses] = useState<DailyExpense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [localQuickOpen, setLocalQuickOpen] = useState(false);

  // Daily Summary State
  const [summaryDate, setSummaryDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailySummary, setDailySummary] = useState<any | null>(null);
  const [showDailySummaryModal, setShowDailySummaryModal] = useState(false);

  // Form State
  const [category, setCategory] = useState('Tea');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paidBy, setPaidBy] = useState('Company Account');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listExpenses({
        category: selectedCategory || undefined
      });
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    apiClient.listCategories().then(setCategories).catch(console.error);
  }, [selectedCategory]);

  const handleFetchDailySummary = async (dateStr: string) => {
    setSummaryDate(dateStr);
    try {
      const sum = await apiClient.getDailySummary(dateStr);
      setDailySummary(sum);
      setShowDailySummaryModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let finalReceiptUrl = receiptUrl;
      if (receiptFile) {
        const uploadRes = await apiClient.uploadReceipt(receiptFile);
        finalReceiptUrl = uploadRes.url;
      }

      await apiClient.createExpense({
        category,
        description: description.trim(),
        amount: Number(amount),
        payment_method: paymentMethod,
        paid_by: paidBy,
        receipt_url: finalReceiptUrl || undefined,
        notes: notes.trim() || undefined
      });

      setDescription('');
      setAmount('');
      setNotes('');
      setReceiptFile(null);
      setReceiptUrl('');
      onCloseQuickModal();
      fetchExpenses();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Are you sure you want to archive this expense record?')) return;
    try {
      await apiClient.deleteExpense(id);
      fetchExpenses();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to archive expense');
    }
  };

  const totalFilteredAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-5">
      {/* Top Action and Reconciliation Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium"
          >
            <option value="">All Expense Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500">Date Reconciliation:</span>
            <input
              type="date"
              value={summaryDate}
              onChange={(e) => handleFetchDailySummary(e.target.value)}
              className="text-xs border-0 bg-transparent text-slate-800 font-semibold focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Filtered Spending</span>
            <span className="text-sm font-bold text-slate-900">{formatCurrency(totalFilteredAmount)}</span>
          </div>

          <button
            onClick={() => setLocalQuickOpen(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
          >
            <Plus size={15} />
            <span>+ Quick Entry</span>
          </button>
        </div>
      </div>

      {/* Expenses List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Code & Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3">Paid By</th>
                <th className="px-4 py-3">Receipt</th>
                {isSuperAdmin && <th className="px-4 py-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No expense entries found for this category.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{e.expense_code}</div>
                      <div className="text-[10px] text-slate-400">{formatDate(e.expense_date)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] uppercase">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[240px] truncate" title={e.description}>
                      {e.description}
                    </td>
                    <td className="px-4 py-3 font-bold text-rose-600">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {e.payment_method}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {e.paid_by}
                    </td>
                    <td className="px-4 py-3">
                      {e.receipt_url ? (
                        <a
                          href={e.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <FileText size={14} />
                          <span>View</span>
                        </a>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteExpense(e.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Archive Expense"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Date-wise Reconciliation Report Modal */}
      {showDailySummaryModal && dailySummary && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Daily Financial Reconciliation</h3>
                <p className="text-xs text-cyan-300">Activity on {dailySummary.date}</p>
              </div>
              <button onClick={() => setShowDailySummaryModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Orders Revenue</span>
                  <p className="text-sm font-bold text-slate-900 mt-1">{formatCurrency(dailySummary.total_order_revenue)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Cash Collected</span>
                  <p className="text-sm font-bold text-emerald-600 mt-1">{formatCurrency(dailySummary.total_payments_collected)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Daily Expenses</span>
                  <p className="text-sm font-bold text-rose-600 mt-1">{formatCurrency(dailySummary.total_expenses)}</p>
                </div>
                <div className="bg-slate-900 text-white p-3 rounded-lg">
                  <span className="text-[10px] text-cyan-300 uppercase font-semibold">Net Day Result</span>
                  <p className="text-sm font-bold text-cyan-400 mt-1">{formatCurrency(dailySummary.net_day_result)}</p>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 uppercase tracking-wide text-[10px] block">
                  Category Breakdown for {dailySummary.date}
                </span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(dailySummary.category_breakdown).map(([cat, val]: any) => (
                    <span key={cat} className="px-2.5 py-1 bg-white border border-slate-300 rounded font-medium">
                      {cat}: <strong>{formatCurrency(val)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Entry Drawer / Modal */}
      {(isQuickModalOpen || localQuickOpen) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ReceiptText size={18} className="text-cyan-400" />
                <h3 className="text-sm font-bold">Quick Daily Expense Entry (&lt; 5s)</h3>
              </div>
              <button
                onClick={() => {
                  setLocalQuickOpen(false);
                  onCloseQuickModal();
                }}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="e.g. 150"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tea & snacks for 3D printer calibration workshop"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="UPI">UPI (GPay / PhonePe)</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Paid By</label>
                  <input
                    type="text"
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Receipt / Bill Upload (Optional)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={onCloseQuickModal}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
