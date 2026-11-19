import React, { useState, useEffect } from 'react';
import { History, Search, Shield, Filter, AlertCircle, RefreshCw } from 'lucide-react';
import { apiClient } from '../services/api';
import { AuditLog } from '../types';
import { formatDateTime } from '../utils/formatters';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listAuditLogs(
        selectedModule || undefined,
        selectedAction || undefined
      );
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedModule, selectedAction]);

  const getActionBadge = (action: string) => {
    const map: Record<string, string> = {
      CREATE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      UPDATE: 'bg-blue-50 text-blue-700 border-blue-200',
      DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
      STATUS_CHANGE: 'bg-purple-50 text-purple-700 border-purple-200',
      OVERRIDE: 'bg-amber-50 text-amber-700 border-amber-200',
      LOGIN: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      BACKUP: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    };
    const c = map[action] || 'bg-slate-100 text-slate-700 border-slate-200';
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${c}`}>
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header and Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">System Audit Trail & Security Logs</h3>
          <p className="text-xs text-slate-400">
            Immutable log of all operational changes, status transitions, inventory deductions and financial actions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium"
          >
            <option value="">All Modules</option>
            <option value="ORDERS">Orders</option>
            <option value="PAYMENTS">Payments</option>
            <option value="INVENTORY">Inventory</option>
            <option value="EXPENSES">Expenses</option>
            <option value="WORKSHOPS">Workshops</option>
            <option value="SALARIES">Salaries</option>
            <option value="RENT">Rent</option>
            <option value="USERS">Users</option>
            <option value="AUTH">Auth</option>
            <option value="SETTINGS">Settings</option>
          </select>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium"
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="STATUS_CHANGE">Status Change</option>
            <option value="OVERRIDE">Override</option>
            <option value="LOGIN">Login</option>
            <option value="BACKUP">Backup</option>
          </select>

          <button
            onClick={fetchLogs}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition"
            title="Refresh Logs"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Timestamp (Kolkata)</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Record ID</th>
                <th className="px-4 py-3">Remarks / Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No audit records found matching the filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {log.username}
                    </td>
                    <td className="px-4 py-3">{getActionBadge(log.action)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {log.module}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {log.record_id || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-800 max-w-[360px] truncate" title={log.remarks || ''}>
                      {log.remarks || '-'}
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
