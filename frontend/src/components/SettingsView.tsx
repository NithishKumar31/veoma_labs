import React, { useState, useEffect } from 'react';
import { Settings, Save, Database, Download, RefreshCw, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { apiClient } from '../services/api';
import { MaterialRate } from '../types';
import { formatCurrency } from '../utils/formatters';

export const SettingsView: React.FC = () => {
  const [companySettings, setCompanySettings] = useState<Record<string, string>>({});
  const [materialRates, setMaterialRates] = useState<MaterialRate[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingBackup, setSavingBackup] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchSettingsAndBackups = async () => {
    setLoading(true);
    try {
      const s = await apiClient.getSettings();
      setCompanySettings(s.company_settings);
      setMaterialRates(s.material_rates);
      const b = await apiClient.listBackups();
      setBackups(b);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndBackups();
  }, []);

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setMessage(null);
    try {
      await apiClient.updateCompanySettings(companySettings);
      setMessage('Company settings updated successfully.');
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update company settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateRate = async (rate: MaterialRate, field: string, value: any) => {
    try {
      await apiClient.updateMaterialRate(rate.id, { [field]: value });
      fetchSettingsAndBackups();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update rate');
    }
  };

  const handleDeleteRate = async (id: string, mat: string) => {
    if (!window.confirm(`Are you sure you want to delete material rate for ${mat}?`)) return;
    try {
      await apiClient.deleteMaterialRate(id);
      fetchSettingsAndBackups();
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || 'Failed to delete material rate');
    }
  };

  const handleCreateBackup = async () => {
    setSavingBackup(true);
    try {
      const res = await apiClient.createBackup();
      alert(`Database backup created: ${res.filename} (${res.size_kb} KB)`);
      fetchSettingsAndBackups();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create backup');
    } finally {
      setSavingBackup(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center space-x-2">
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* Company Profile Settings */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">Company Profile & Global Defaults</h3>
          <p className="text-xs text-slate-400">Configure business details, GSTIN, default monthly rent and default wastage</p>
        </div>

        <form onSubmit={handleSaveCompanySettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Legal Name</label>
              <input
                type="text"
                value={companySettings.company_name || 'Veoma Labs'}
                onChange={(e) => setCompanySettings({ ...companySettings, company_name: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company GSTIN</label>
              <input
                type="text"
                value={companySettings.company_gstin || '33ABCDE1234F1Z5'}
                onChange={(e) => setCompanySettings({ ...companySettings, company_gstin: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supplier State (Place of Business)</label>
              <input
                type="text"
                value={companySettings.supplier_state || 'Tamil Nadu'}
                onChange={(e) => setCompanySettings({ ...companySettings, supplier_state: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Monthly Rent (₹)</label>
              <input
                type="number"
                value={companySettings.default_monthly_rent || '12000'}
                onChange={(e) => setCompanySettings({ ...companySettings, default_monthly_rent: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Production Wastage (%)</label>
              <input
                type="number"
                value={companySettings.default_wastage_pct || '10'}
                onChange={(e) => setCompanySettings({ ...companySettings, default_wastage_pct: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
            >
              <Save size={14} />
              <span>{savingSettings ? 'Saving...' : 'Save Company Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Confirmed Material Base Rates Engine */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">Configurable Material Production Rates</h3>
          <p className="text-xs text-slate-400">
            Confirmed rates: Base rates include filament, electricity, machine depreciation, labor, print time & overheads.
          </p>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Base Production Rate / g (₹)</th>
                <th className="px-4 py-3">Post-Processing Rate / g (₹)</th>
                <th className="px-4 py-3">Default Wastage %</th>
                <th className="px-4 py-3">Description / Overheads Included</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {materialRates.map((rate) => (
                <tr key={rate.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">{rate.material_type}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="any"
                      defaultValue={rate.base_rate_per_gram}
                      onBlur={(e) => handleUpdateRate(rate, 'base_rate_per_gram', Number(e.target.value))}
                      className="w-24 p-1.5 border border-slate-300 rounded text-xs font-bold text-blue-900"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="any"
                      defaultValue={rate.post_processing_rate_per_gram}
                      onBlur={(e) => handleUpdateRate(rate, 'post_processing_rate_per_gram', Number(e.target.value))}
                      className="w-24 p-1.5 border border-slate-300 rounded text-xs font-bold text-slate-700"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      defaultValue={rate.default_wastage_pct}
                      onBlur={(e) => handleUpdateRate(rate, 'default_wastage_pct', Number(e.target.value))}
                      className="w-20 p-1.5 border border-slate-300 rounded text-xs"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-[11px]">
                    Includes filament, machine depreciation, electricity, labor & time.
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteRate(rate.id, rate.material_type)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete Rate"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Database Backup & Restore */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Database size={16} className="text-blue-600" />
              <span>Database Backups & Disaster Recovery</span>
            </h3>
            <p className="text-xs text-slate-400">
              Point-in-time database snapshots preserving all orders, payments, customers and financial records
            </p>
          </div>

          <button
            onClick={handleCreateBackup}
            disabled={savingBackup}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
          >
            <Download size={14} />
            <span>{savingBackup ? 'Backing Up...' : 'Create Database Backup Now'}</span>
          </button>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Backup Filename</th>
                <th className="px-4 py-3">Created Timestamp</th>
                <th className="px-4 py-3">File Size</th>
                <th className="px-4 py-3 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No backup files created yet. Click "Create Database Backup Now" to generate one.
                  </td>
                </tr>
              ) : (
                backups.map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{b.filename}</td>
                    <td className="px-4 py-3 text-slate-600">{b.created_at}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{b.size_kb} KB</td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/api/backup/download/${b.filename}`}
                        download
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold inline-flex items-center space-x-1"
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
