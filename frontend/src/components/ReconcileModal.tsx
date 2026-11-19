import React, { useState } from 'react';
import { X, Scale, AlertCircle } from 'lucide-react';
import { apiClient } from '../services/api';
import { Order, ProductionItem } from '../types';

interface ReconcileModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onReconcileSuccess: () => void;
}

export const ReconcileModal: React.FC<ReconcileModalProps> = ({
  order,
  isOpen,
  onClose,
  onReconcileSuccess
}) => {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [actualGrams, setActualGrams] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const currentItem = order.production_items.find(
    (p) => p.id === (selectedItemId || order.production_items[0]?.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem?.id) return;
    setLoading(true);
    setError(null);

    try {
      await apiClient.reconcileConsumption(order.id, {
        production_item_id: currentItem.id,
        actual_consumed_grams: Number(actualGrams),
        notes: notes.trim() || undefined
      });
      onReconcileSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reconcile consumption');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scale size={18} className="text-cyan-400" />
            <h3 className="text-sm font-bold">Reconcile Actual Consumption</h3>
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

          <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg text-xs text-cyan-900 leading-relaxed">
            <strong>Inventory Reconciliation Engine:</strong> If actual post-print consumption differs from estimated, the system adjusts only the incremental difference from inventory stock, preventing double-deduction.
          </div>

          {order.production_items.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Part / Production Item
              </label>
              <select
                value={selectedItemId || order.production_items[0]?.id}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              >
                {order.production_items.map((p, idx) => (
                  <option key={p.id} value={p.id}>
                    Part {idx + 1}: {p.material_type} ({p.total_estimated_grams}g estimated)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Material Type:</span>
              <span className="font-semibold text-slate-800">{currentItem?.material_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Model Weight:</span>
              <span className="font-semibold text-slate-800">{currentItem?.model_weight_grams} g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Wastage Allowance (10%):</span>
              <span className="font-semibold text-slate-800">
                {((currentItem?.model_weight_grams || 0) * 0.1).toFixed(1)} g
              </span>
            </div>
            <div className="flex justify-between font-bold border-t border-slate-200 pt-1">
              <span className="text-slate-700">Estimated Stock Deducted:</span>
              <span className="text-blue-700">{currentItem?.total_estimated_grams} g</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Actual Weighed Consumption (Grams) *
            </label>
            <input
              type="number"
              min="1"
              step="any"
              required
              placeholder="e.g. 115"
              value={actualGrams}
              onChange={(e) => setActualGrams(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reconciliation Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Tree support required additional 5g"
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
              {loading ? 'Reconciling...' : 'Confirm Reconciliation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
