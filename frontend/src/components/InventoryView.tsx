import React, { useState, useEffect } from 'react';
import {
  Boxes, Plus, AlertTriangle, ArrowUpRight, ArrowDownLeft,
  Search, ShieldAlert, History, Package, X
} from 'lucide-react';
import { apiClient } from '../services/api';
import { InventoryItem, InventoryMovement, User } from '../types';
import { formatCurrency, formatWeight, formatDateTime } from '../utils/formatters';

interface InventoryViewProps {
  currentUser: User;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ currentUser }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState('');

  // Modals
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<InventoryItem | null>(null);

  // Purchase Form
  const [supplier, setSupplier] = useState('');
  const [brand, setBrand] = useState('eSUN');
  const [materialType, setMaterialType] = useState('PLA');
  const [colour, setColour] = useState('Black');
  const [spoolWeightGrams, setSpoolWeightGrams] = useState('1000');
  const [quantitySpools, setQuantitySpools] = useState('1');
  const [purchasePrice, setPurchasePrice] = useState('1200');
  const [invoiceRef, setInvoiceRef] = useState('');

  // Adjustment Form
  const [adjustType, setAdjustType] = useState('MANUAL_ADD');
  const [adjustGrams, setAdjustGrams] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const canManageInventory = currentUser.role === 'SUPER_ADMIN' || (currentUser.permissions || {}).can_manage_inventory;

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const invData = await apiClient.listInventory(selectedMaterial || undefined);
      setItems(invData);
      const moveData = await apiClient.listMovements();
      setMovements(moveData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedMaterial]);

  const handleRecordPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.recordPurchase({
        supplier: supplier.trim(),
        brand: brand.trim(),
        material_type: materialType,
        colour: colour.trim(),
        spool_weight_grams: Number(spoolWeightGrams),
        quantity_spools: Number(quantitySpools),
        purchase_price: Number(purchasePrice),
        invoice_ref: invoiceRef.trim() || undefined
      });
      setPurchaseModalOpen(false);
      setSupplier('');
      setInvoiceRef('');
      fetchInventory();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to record purchase');
    }
  };

  const handleStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAdjust) return;
    try {
      await apiClient.manualStockAdjustment({
        inventory_item_id: selectedItemForAdjust.id,
        adjustment_type: adjustType,
        quantity_grams: Number(adjustGrams),
        reason: adjustReason.trim()
      });
      setAdjustModalOpen(false);
      setAdjustGrams('');
      setAdjustReason('');
      fetchInventory();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to adjust stock');
    }
  };

  const totalStockGrams = items.reduce((acc, i) => acc + Number(i.current_stock_grams), 0);
  const totalStockValue = items.reduce((acc, i) => acc + (Number(i.current_stock_grams) * Number(i.avg_cost_per_gram)), 0);
  const lowStockCount = items.filter((i) => Number(i.current_stock_grams) <= Number(i.min_threshold_grams)).length;

  return (
    <div className="space-y-5">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold uppercase">Total Filament Stock</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatWeight(totalStockGrams)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Across all materials & colours</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold uppercase">Estimated Stock Value</span>
          <p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(totalStockValue)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Weighted average purchasing cost</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold uppercase">Low Stock Alerts</span>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {lowStockCount}
            </span>
            {lowStockCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
                Reorder Required
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Below minimum threshold limit</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <select
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium"
          >
            <option value="">All Materials</option>
            <option value="PLA">PLA</option>
            <option value="ABS">ABS</option>
            <option value="PETG">PETG</option>
            <option value="TPU">TPU</option>
            <option value="RESIN">Resin</option>
          </select>
        </div>

        {canManageInventory && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPurchaseModalOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
            >
              <Plus size={15} />
              <span>Record Purchase</span>
            </button>
          </div>
        )}
      </div>

      {/* Inventory Stock Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Material Type</th>
                <th className="px-4 py-3">Brand & Colour</th>
                <th className="px-4 py-3">Current Stock</th>
                <th className="px-4 py-3">Min Alert Threshold</th>
                <th className="px-4 py-3">Avg Cost / Gram</th>
                <th className="px-4 py-3">Stock Value</th>
                <th className="px-4 py-3">Stock Status</th>
                {canManageInventory && <th className="px-4 py-3 text-right">Adjustment</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item) => {
                const isLow = Number(item.current_stock_grams) <= Number(item.min_threshold_grams);
                const stockVal = Number(item.current_stock_grams) * Number(item.avg_cost_per_gram);
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">{item.material_type}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{item.brand}</div>
                      <div className="text-[10px] text-slate-400">Colour: {item.colour}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-blue-900">
                      {formatWeight(item.current_stock_grams)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatWeight(item.min_threshold_grams)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      ₹{Number(item.avg_cost_per_gram).toFixed(2)}/g
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {formatCurrency(stockVal)}
                    </td>
                    <td className="px-4 py-3">
                      {isLow ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1 w-max">
                          <AlertTriangle size={11} />
                          <span>Low Stock</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700">
                          Adequate
                        </span>
                      )}
                    </td>
                    {canManageInventory && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedItemForAdjust(item);
                            setAdjustModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition"
                        >
                          Adjust
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Stock Movements Audit Trail */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs">
          Recent Inventory Stock Movements (Audit Trail)
        </h4>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-500 font-semibold text-[11px]">
              <tr>
                <th className="p-2.5">Date & Time</th>
                <th className="p-2.5">Movement Type</th>
                <th className="p-2.5">Quantity</th>
                <th className="p-2.5">Before → After</th>
                <th className="p-2.5">Reference & Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {movements.slice(0, 15).map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="p-2.5 text-slate-500">{formatDateTime(m.created_at)}</td>
                  <td className="p-2.5 font-bold text-slate-800">{m.movement_type}</td>
                  <td className="p-2.5 font-bold">
                    <span className={Number(m.quantity_grams) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {Number(m.quantity_grams) >= 0 ? `+${m.quantity_grams}g` : `${m.quantity_grams}g`}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-600">
                    {m.previous_stock_grams}g → {m.new_stock_grams}g
                  </td>
                  <td className="p-2.5 text-slate-700 max-w-[280px] truncate" title={m.reason}>
                    {m.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Purchase Modal */}
      {purchaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Record Filament Purchase</h3>
              <button onClick={() => setPurchaseModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPurchase} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Robocraze / Wol3D"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Material Type</label>
                  <select
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="PLA">PLA</option>
                    <option value="ABS">ABS</option>
                    <option value="PETG">PETG</option>
                    <option value="TPU">TPU</option>
                    <option value="RESIN">Resin</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Colour</label>
                  <input
                    type="text"
                    value={colour}
                    onChange={(e) => setColour(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Spool Wt (g)</label>
                  <input
                    type="number"
                    value={spoolWeightGrams}
                    onChange={(e) => setSpoolWeightGrams(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantitySpools}
                    onChange={(e) => setQuantitySpools(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Price (₹)</label>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Invoice / Ref Number</label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-987"
                  value={invoiceRef}
                  onChange={(e) => setInvoiceRef(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPurchaseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  Confirm Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Stock Adjustment Modal */}
      {adjustModalOpen && selectedItemForAdjust && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Manual Stock Correction</h3>
              <button onClick={() => setAdjustModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStockAdjust} className="p-5 space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-600">
                Item: <strong>{selectedItemForAdjust.material_type} ({selectedItemForAdjust.colour})</strong><br />
                Current Stock: <strong>{selectedItemForAdjust.current_stock_grams} grams</strong>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Correction Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="MANUAL_ADD">Add Stock (+)</option>
                  <option value="MANUAL_REDUCE">Reduce Stock (-)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adjustment Quantity (Grams) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 50"
                  value={adjustGrams}
                  onChange={(e) => setAdjustGrams(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Adjustment (Mandatory for Audit) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Physical inventory count reconciliation"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
