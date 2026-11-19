import React, { useState, useEffect } from 'react';
import {
  BarChart3, Download, Calendar, DollarSign, TrendingUp,
  TrendingDown, FileSpreadsheet, FileText, CheckCircle2
} from 'lucide-react';
import { apiClient } from '../services/api';
import { formatCurrency } from '../utils/formatters';

export const ReportsView: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('THIS_MONTH');

  const fetchPNL = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getProfitAndLoss(filterType);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPNL();
  }, [filterType]);

  const filterButtons = [
    { id: 'THIS_WEEK', label: 'This Week' },
    { id: 'THIS_MONTH', label: 'This Month' },
    { id: 'LAST_MONTH', label: 'Last Month' },
    { id: 'THIS_YEAR', label: 'This Year' },
  ];

  return (
    <div className="space-y-6">
      {/* Control & Date Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Calendar size={18} className="text-blue-600" />
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Reporting Period:
          </span>
          {data && (
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {data.period}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {filterButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterType(btn.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterType === btn.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}

          <div className="flex items-center space-x-1.5 ml-2">
            <a
              href={apiClient.exportExcelUrl('PNL')}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-xs transition"
            >
              <FileSpreadsheet size={14} />
              <span>Export Excel</span>
            </a>
            <a
              href={apiClient.exportPdfUrl('PNL')}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-xs transition"
            >
              <FileText size={14} />
              <span>Export PDF</span>
            </a>
          </div>
        </div>
      </div>

      {/* Structured P&L Statement */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-5">
          <h3 className="text-base font-bold">VEOMA LABS — PROFIT & LOSS STATEMENT</h3>
          <p className="text-xs text-cyan-300 mt-0.5">
            Statement of Operations & Financial Contribution • Period: {data?.period}
          </p>
        </div>

        <div className="p-6 space-y-6 text-xs divide-y divide-slate-100">
          {/* Section 1: Order Operations */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wide flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>1. 3D Printing & Designing Services</span>
            </h4>
            <div className="pl-4 space-y-2">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Total Order Revenue Earned (Taxable Value):</span>
                <span className="font-bold text-slate-900 text-sm">{formatCurrency(data?.order_revenue)}</span>
              </div>
              <div className="flex justify-between items-center py-1 text-rose-600">
                <span>Less: Total Direct Production Costs (Filament, Machine, Courier, Packing, Design):</span>
                <span className="font-semibold">- {formatCurrency(data?.order_direct_costs)}</span>
              </div>
              <div className="flex justify-between items-center py-2 bg-blue-50/60 px-3 rounded-lg font-bold text-blue-900">
                <span>Order Gross Contribution:</span>
                <span>{formatCurrency(data?.order_gross_contribution)}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Technical Workshops Operations */}
          <div className="space-y-3 pt-4">
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wide flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-600" />
              <span>2. Technical Workshops & Training Operations</span>
            </h4>
            <div className="pl-4 space-y-2">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Total Workshop Registration Fees Earned:</span>
                <span className="font-bold text-slate-900 text-sm">{formatCurrency(data?.workshop_revenue)}</span>
              </div>
              <div className="flex justify-between items-center py-1 text-rose-600">
                <span>Less: Direct Workshop Expenses (Trainer, Venue, Refreshments, Materials):</span>
                <span className="font-semibold">- {formatCurrency(data?.workshop_expenses)}</span>
              </div>
              <div className="flex justify-between items-center py-2 bg-cyan-50/60 px-3 rounded-lg font-bold text-cyan-900">
                <span>Workshop Gross Contribution:</span>
                <span>{formatCurrency(data?.workshop_gross_contribution)}</span>
              </div>
            </div>
          </div>

          {/* Subtotal: Total Gross Business Contribution */}
          <div className="pt-4">
            <div className="flex justify-between items-center py-3 bg-slate-100 px-4 rounded-xl font-extrabold text-slate-900 text-sm">
              <span>TOTAL COMBINED GROSS CONTRIBUTION (1 + 2):</span>
              <span className="text-blue-900 text-base">{formatCurrency(data?.total_gross_contribution)}</span>
            </div>
          </div>

          {/* Section 3: Shared Business Operating Expenses */}
          <div className="space-y-3 pt-4">
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wide flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
              <span>3. Shared Business Overheads & Fixed Expenses</span>
            </h4>
            <div className="pl-4 space-y-2">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">General Daily Business Expenses (Office, Travel, Food, Courier):</span>
                <span className="font-medium text-slate-800">{formatCurrency(data?.general_expenses)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Fixed Monthly Rent (Veoma Labs Facility):</span>
                <span className="font-medium text-slate-800">{formatCurrency(data?.rent_expenses)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Employee Salaries & Wages:</span>
                <span className="font-medium text-slate-800">{formatCurrency(data?.salary_expenses)}</span>
              </div>
              <div className="flex justify-between items-center py-2 bg-amber-50/60 px-3 rounded-lg font-bold text-amber-900">
                <span>Total Shared Operating Overheads:</span>
                <span>- {formatCurrency(data?.total_shared_overheads)}</span>
              </div>
            </div>
          </div>

          {/* Final Net Business Profit */}
          <div className="pt-6">
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 rounded-2xl flex items-center justify-between shadow-lg">
              <div>
                <span className="text-xs uppercase font-extrabold text-cyan-300 tracking-wider">
                  Net Business Operating Profit
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Gross Contribution minus All Operating Overheads, Rent & Salaries
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-cyan-400">
                  {formatCurrency(data?.net_business_profit)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
