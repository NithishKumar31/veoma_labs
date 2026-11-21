import React, { useState, useEffect } from 'react';
import { Printer as PrinterIcon, Plus, CheckCircle, Wrench, AlertCircle, X, Trash2 } from 'lucide-react';
import { apiClient } from '../services/api';
import { Printer, User } from '../types';
import { formatCurrency, formatWeight, formatDate } from '../utils/formatters';

interface PrintersViewProps {
  currentUser: User;
}

export const PrintersView: React.FC<PrintersViewProps> = ({ currentUser }) => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [technology, setTechnology] = useState('FDM');
  const [purchaseCost, setPurchaseCost] = useState('35000');
  const [status, setStatus] = useState<'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'>('ACTIVE');
  const [notes, setNotes] = useState('');

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  const fetchPrinters = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listPrinters();
      setPrinters(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrinters();
  }, []);

  const handleAddPrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.addPrinter({
        name: name.trim(),
        model: model.trim(),
        technology,
        purchase_cost: Number(purchaseCost),
        status,
        notes: notes || undefined
      });
      setAddModalOpen(false);
      setName('');
      setModel('');
      fetchPrinters();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add printer');
    }
  };

  const handleToggleStatus = async (printer: Printer, newStatus: any) => {
    try {
      await apiClient.updatePrinter(printer.id, { status: newStatus });
      fetchPrinters();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePrinter = async (id: string, printerName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete printer "${printerName}"?`)) return;
    try {
      await apiClient.deletePrinter(id);
      fetchPrinters();
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || 'Failed to delete printer');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Printer Registry & Machine Utilization</h3>
          <p className="text-xs text-slate-400">
            Track print jobs completed, total material consumed, and maintenance schedules
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
          >
            <Plus size={15} />
            <span>Add Printer</span>
          </button>
        )}
      </div>

      {/* Printer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {printers.map((p) => {
          const isMaintenance = p.status === 'MAINTENANCE';
          const isActive = p.status === 'ACTIVE';

          return (
            <div
              key={p.id}
              className={`bg-white p-5 rounded-xl border shadow-xs transition space-y-4 ${
                isMaintenance ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">
                    {p.technology}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{p.name}</h4>
                  <p className="text-xs text-slate-400">{p.model}</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <PrinterIcon size={20} />
                </div>
              </div>

              {/* Status Badge & Toggle */}
              <div className="flex items-center justify-between">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : isMaintenance
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {p.status}
                </span>

                {isSuperAdmin && (
                  <div className="flex items-center space-x-1.5">
                    <select
                      value={p.status}
                      onChange={(e) => handleToggleStatus(p, e.target.value)}
                      className="p-1 border border-slate-300 rounded text-[11px] font-medium"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                    <button
                      onClick={() => handleDeletePrinter(p.id, p.name)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete Printer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>

              {/* Utilization Metrics */}
              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Orders Completed:</span>
                  <span className="font-bold text-slate-800">{p.completed_orders_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Material Consumed:</span>
                  <span className="font-bold text-cyan-700">{formatWeight(p.total_grams_consumed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Production Value:</span>
                  <span className="font-bold text-blue-700">{formatCurrency(p.total_production_value)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Printer Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Register New 3D Printer</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddPrinter} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Printer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bambu Lab X1 Carbon"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Model / Serial *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. X1-C Combo"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Technology</label>
                  <select
                    value={technology}
                    onChange={(e) => setTechnology(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="FDM">FDM</option>
                    <option value="RESIN">Resin (SLA/DLP)</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cost (₹)</label>
                  <input
                    type="number"
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  Register Printer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
