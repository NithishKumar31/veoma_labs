import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, ShoppingBag,
  CheckCircle2, Clock, Calendar, ArrowUpRight, ShieldCheck,
  AlertCircle, Info, RefreshCw, BarChart2
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { apiClient } from '../services/api';
import { DashboardSummary } from '../types';
import { formatCurrency, formatWeight } from '../utils/formatters';

const COLORS = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

export const DashboardView: React.FC = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('THIS_MONTH');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const summary = await apiClient.getDashboardSummary(
        filterType,
        customStart || undefined,
        customEnd || undefined
      );
      setData(summary);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [filterType]);

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    setFilterType('CUSTOM');
    fetchDashboard();
    setIsCustomOpen(false);
  };

  const filterButtons = [
    { id: 'TODAY', label: 'Today' },
    { id: 'YESTERDAY', label: 'Yesterday' },
    { id: 'THIS_WEEK', label: 'This Week' },
    { id: 'THIS_MONTH', label: 'This Month' },
    { id: 'LAST_MONTH', label: 'Last Month' },
    { id: 'THIS_YEAR', label: 'This Year' },
  ];

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-slate-500">Loading Veoma Labs business metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Calendar size={18} className="text-blue-600" />
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Reporting Period:
          </span>
          {data && (
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {data.date_start} to {data.date_end}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {filterButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => {
                setFilterType(btn.id);
                setCustomStart('');
                setCustomEnd('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterType === btn.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
          <button
            onClick={() => setIsCustomOpen(!isCustomOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterType === 'CUSTOM'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Custom Range...
          </button>
          <button
            onClick={fetchDashboard}
            title="Refresh Data"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Custom Date Modal */}
      {isCustomOpen && (
        <form
          onSubmit={handleApplyCustom}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-md flex flex-wrap items-center gap-3"
        >
          <span className="text-xs font-medium text-slate-600">Start Date:</span>
          <input
            type="date"
            required
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
          />
          <span className="text-xs font-medium text-slate-600">End Date:</span>
          <input
            type="date"
            required
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
          >
            Apply Filter
          </button>
        </form>
      )}

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Total Revenue Earned
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(data?.total_revenue)}
            </p>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Orders: {formatCurrency(data?.order_revenue)} • Workshops: {formatCurrency(data?.total_workshop_revenue)}
          </p>
        </div>

        {/* Total Business Expenses */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Total Business Expenses
            </span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(data?.total_expenses)}
            </p>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Direct production + Daily + Workshop + Rent + Salaries
          </p>
        </div>

        {/* Gross Contribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Gross Contribution
            </span>
            <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(data?.gross_profit)}
            </p>
          </div>
          <p className="text-[11px] text-cyan-600 mt-1">
            Order Profit + Workshop Profit before shared rent & salaries
          </p>
        </div>

        {/* Net Business Profit */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-950 p-5 rounded-xl text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">
              Net Business Profit
            </span>
            <div className="p-2 rounded-lg bg-white/10 text-cyan-300">
              <Wallet size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            {data?.can_view_profits ? (
              <p className="text-2xl font-bold text-white">
                {formatCurrency(data?.net_business_profit)}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">Super Admin Restricted</p>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Gross Contribution minus General Expenses, Rent & Salaries
          </p>
        </div>
      </div>

      {/* Cash Flow vs Receivables & Operational Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Payments Received */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Actual Payments Collected</span>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {formatCurrency(data?.total_payments_received)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Cash/UPI/Bank tranches received in period</p>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Outstanding Receivables</span>
          <p className="text-xl font-bold text-amber-600 mt-1">
            {formatCurrency(data?.outstanding_customer_payments)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Unpaid customer order balances</p>
        </div>

        {/* Order Counts */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Orders in Period</span>
          <div className="flex items-center space-x-3 mt-1">
            <span className="text-xl font-bold text-slate-900">{data?.total_orders}</span>
            <span className="text-xs text-emerald-600 font-medium">✓ {data?.completed_orders} Done</span>
            <span className="text-xs text-amber-600 font-medium">⏳ {data?.pending_orders} Active</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Active & completed production pipeline</p>
        </div>

        {/* GST Collected */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">GST Tax Collected</span>
          <p className="text-xl font-bold text-blue-600 mt-1">
            {formatCurrency(data?.gst_collected)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Statutory liability (held for tax remittance)</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Revenue vs Expenses Area Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Daily Revenue vs Expenditure Trend</h3>
              <p className="text-xs text-slate-400">Order revenue compared against daily business expenses</p>
            </div>
            <span className="text-xs font-medium text-slate-500">Last 14 Days</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.daily_revenue_chart || []}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `₹${val}`} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Order Revenue" stroke="#2563eb" fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="expenses" name="Daily Expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Expense Categories</h3>
          <p className="text-xs text-slate-400 mb-4">Breakdown of operational daily spending</p>
          <div className="h-64">
            {data?.expense_category_chart && data.expense_category_chart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.expense_category_chart}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {data.expense_category_chart.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No expense entries recorded for this period
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Printer Activity Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Printer-Wise Production Activity</h3>
        <p className="text-xs text-slate-400 mb-4">Total estimated filament consumption (grams) per printer</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.printer_activity_chart || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="printer" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `${val}g`} />
              <Tooltip formatter={(value: any) => `${value} grams`} />
              <Bar dataKey="grams" name="Filament Consumed (g)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
