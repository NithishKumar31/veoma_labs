import React, { useState } from 'react';
import {
  LayoutDashboard, ShoppingBag, Users, ReceiptText, GraduationCap,
  Boxes, Printer, FileText, Banknote, BarChart3, ShieldCheck,
  History, Settings, LogOut, Menu, X, PlusCircle, AlertTriangle, RefreshCw
} from 'lucide-react';
import { User } from '../types';
import { apiClient } from '../services/api';

interface LayoutProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onOpenNewOrder: () => void;
  onOpenQuickExpense: () => void;
  onNavigateToCustomerRegistry?: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  onOpenNewOrder,
  onOpenQuickExpense,
  onNavigateToCustomerRegistry,
  children
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 150);
  };

  const handleSyncFirebase = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncSuccess(false);
    try {
      await apiClient.syncAllToFirebase();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (e) {
      console.error('Firebase manual sync error:', e);
    } finally {
      setSyncing(false);
    }
  };

  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const perms = user.permissions || {};

  const navItems = [
    { id: 'dashboard', label: 'Main Dashboard', icon: LayoutDashboard, visible: true },
    { id: 'orders', label: 'Order Management', icon: ShoppingBag, visible: true },
    { id: 'customers', label: 'Customers Registry', icon: Users, visible: false },
    { id: 'expenses', label: 'Daily Expenses', icon: ReceiptText, visible: true },
    { id: 'workshops', label: 'Workshops & Training', icon: GraduationCap, visible: isSuperAdmin || perms.can_manage_workshops },
    { id: 'inventory', label: 'Inventory & Filaments', icon: Boxes, visible: true },
    { id: 'printers', label: 'Printer Registry', icon: Printer, visible: true },
    { id: 'gst', label: 'GST Management', icon: FileText, visible: isSuperAdmin || perms.can_view_gst },
    { id: 'finance', label: 'Salaries & Fixed Rent', icon: Banknote, visible: isSuperAdmin || perms.can_view_salaries },
    { id: 'reports', label: 'Financial Reports (P&L)', icon: BarChart3, visible: isSuperAdmin || perms.can_view_profits },
    { id: 'users', label: 'User Management', icon: ShieldCheck, visible: isSuperAdmin },
    { id: 'audit', label: 'Audit Logs', icon: History, visible: isSuperAdmin },
    { id: 'settings', label: 'Company Settings', icon: Settings, visible: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-lg">
            V
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">VEOMA LABS</h1>
            <p className="text-[10px] text-slate-400">Business Management System</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            title="Refresh page"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-cyan-400' : ''} />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:block md:w-64 bg-slate-900 text-slate-200 flex-shrink-0 flex flex-col justify-between z-40 fixed md:sticky top-0 h-screen transition-all shadow-xl`}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="p-5 border-b border-slate-800 hidden md:flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-extrabold text-white text-xl shadow-lg">
              V
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-white uppercase">VEOMA LABS</h1>
              <button
                onClick={handleSyncFirebase}
                title="Click to sync all local data to Firebase Cloud"
                className="flex items-center space-x-1.5 mt-0.5 px-2 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-[10px] text-emerald-300 font-medium transition cursor-pointer border border-emerald-900/60"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${syncing ? 'bg-amber-400 animate-spin' : 'bg-emerald-400 animate-pulse'}`}></span>
                <span>{syncing ? 'Syncing...' : syncSuccess ? 'Cloud Synced!' : 'Firebase Cloud Sync'}</span>
                <RefreshCw size={10} className={`text-emerald-400 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* User Profile Pill */}
          <div className="p-4 mx-3 my-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
            <div className="overflow-hidden pr-2">
              <p className="text-xs font-semibold text-white truncate">{user.full_name}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    isSuperAdmin ? 'bg-cyan-400' : 'bg-amber-400'
                  }`}
                />
                <span className="text-[10px] font-medium text-slate-300 uppercase tracking-wider">
                  {isSuperAdmin ? 'Super Admin' : 'Sub Admin'}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition"
            >
              <LogOut size={16} />
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="px-4 mb-3 space-y-1.5">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenNewOrder();
              }}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 shadow-sm transition"
            >
              <PlusCircle size={15} />
              <span>+ New Order</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenQuickExpense();
              }}
              className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium flex items-center justify-center space-x-2 border border-slate-700 transition"
            >
              <ReceiptText size={14} />
              <span>+ Quick Expense</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-2 space-y-0.5 overflow-y-auto max-h-[calc(100vh-270px)]">
            {navItems
              .filter((item) => item.visible)
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id || (item.id === 'orders' && activeTab === 'customers');
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 text-[10px] text-slate-400 text-center">
          <p>Veoma Labs — Tamil Nadu</p>
          <p className="text-slate-400 mt-0.5">INR (₹) • Asia/Kolkata</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden min-h-screen flex flex-col">
        {/* Top bar on desktop */}
        <header className="hidden md:flex bg-white border-b border-slate-200 px-6 py-3 items-center justify-between sticky top-0 z-30 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-slate-800 capitalize">
              {activeTab === 'customers'
                ? 'Customer Registration & Registry'
                : navItems.find((n) => n.id === activeTab)?.label || 'Dashboard'}
            </h2>
            <p className="text-xs text-slate-500">
              Veoma Labs Business Management System • Location: Tamil Nadu, India
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Customer Registry Option with Logo - EXCLUSIVELY on Order Management page */}
            {activeTab === 'orders' && (
              <button
                onClick={() => {
                  if (onNavigateToCustomerRegistry) {
                    onNavigateToCustomerRegistry();
                  } else {
                    setActiveTab('customers');
                  }
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border shadow-xs transition cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                title="Navigate directly to Customer Registry & Registration"
              >
                <Users size={15} className="text-blue-600" />
                <span>Customer Registry</span>
              </button>
            )}

            {/* Back button when on Customer Registration page */}
            {activeTab === 'customers' && (
              <button
                onClick={() => setActiveTab('orders')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border shadow-xs transition cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
              >
                <ShoppingBag size={15} className="text-blue-600" />
                <span>← Back to Order Management</span>
              </button>
            )}

            <button
              onClick={handleRefresh}
              title="Refresh page and data"
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-blue-600 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-slate-300 shadow-xs transition cursor-pointer active:scale-95"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-600'} />
              <span>Refresh</span>
            </button>

            <button
              onClick={onOpenNewOrder}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
            >
              <PlusCircle size={15} />
              <span>Create Order</span>
            </button>
            <button
              onClick={onOpenQuickExpense}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1.5 border border-slate-300 transition cursor-pointer"
            >
              <ReceiptText size={15} />
              <span>Log Expense</span>
            </button>
          </div>
        </header>

        {/* Dynamic Child Content */}
        <div className="p-4 md:p-6 flex-1">{children}</div>
      </main>
    </div>
  );
};
