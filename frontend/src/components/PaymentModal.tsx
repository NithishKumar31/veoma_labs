import React, { useState } from 'react';
import { X, CreditCard, AlertCircle } from 'lucide-react';
import { apiClient } from '../services/api';
import { Order } from '../types';
import { formatCurrency } from '../utils/formatters';

interface PaymentModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  order,
  isOpen,
  onClose,
  onPaymentSuccess
}) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.recordPayment(order.id, {
        amount: Number(amount),
        payment_method: paymentMethod,
        transaction_ref: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined
      });
      onPaymentSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard size={18} className="text-cyan-400" />
            <h3 className="text-sm font-bold">Record Customer Payment</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Order Summary banner */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Order ID:</span>
              <span className="font-semibold text-slate-800">{order.order_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Agreed Price:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(order.agreed_selling_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Paid So Far:</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(order.total_paid)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
              <span className="text-slate-700">Remaining Balance:</span>
              <span className="text-amber-600">{formatCurrency(order.remaining_balance)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Amount (₹) *
            </label>
            <input
              type="number"
              min="1"
              step="any"
              required
              placeholder={`Max: ₹${order.remaining_balance}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
            >
              <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transaction / Reference ID (Prevents accidental duplicates)
            </label>
            <input
              type="text"
              placeholder="e.g. UPI Ref / Bank UTR / Receipt No"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Part payment before delivery"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
