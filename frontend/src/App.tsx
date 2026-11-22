import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './components/DashboardView';
import { OrdersView } from './components/OrdersView';
import { CustomersView } from './components/CustomersView';
import { ExpensesView } from './components/ExpensesView';
import { WorkshopsView } from './components/WorkshopsView';
import { InventoryView } from './components/InventoryView';
import { PrintersView } from './components/PrintersView';
import { GSTView } from './components/GSTView';
import { FinanceView } from './components/FinanceView';
import { ReportsView } from './components/ReportsView';
import { UserManagementView } from './components/UserManagementView';
import { AuditLogsView } from './components/AuditLogsView';
import { SettingsView } from './components/SettingsView';
import { CreateOrderModal } from './components/CreateOrderModal';
import { User } from './types';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Global Modals
  const [createOrderModalOpen, setCreateOrderModalOpen] = useState(false);
  const [quickExpenseModalOpen, setQuickExpenseModalOpen] = useState(false);
  const [openCustomerModal, setOpenCustomerModal] = useState(false);

  const handleNavigateToCustomerRegistry = () => {
    setActiveTab('customers');
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('veoma_user');
    const savedToken = localStorage.getItem('veoma_token');
    if (savedUser && savedToken) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('veoma_user');
        localStorage.removeItem('veoma_token');
      }
    }

    const handleAuthChange = () => {
      setCurrentUser(null);
    };

    window.addEventListener('veoma_auth_change', handleAuthChange);
    return () => window.removeEventListener('veoma_auth_change', handleAuthChange);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('veoma_token');
    localStorage.removeItem('veoma_user');
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <>
      <Layout
        user={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onOpenNewOrder={() => setCreateOrderModalOpen(true)}
        onOpenQuickExpense={() => setQuickExpenseModalOpen(true)}
        onNavigateToCustomerRegistry={handleNavigateToCustomerRegistry}
      >
        {activeTab === 'dashboard' && <DashboardView currentUser={currentUser} />}
        {activeTab === 'orders' && (
          <OrdersView
            currentUser={currentUser}
            onOpenCreateOrder={() => setCreateOrderModalOpen(true)}
            onNavigateToCustomerRegistry={handleNavigateToCustomerRegistry}
          />
        )}
        {activeTab === 'customers' && (
          <CustomersView
            initialOpenRegister={openCustomerModal}
            onRegisterClosed={() => setOpenCustomerModal(false)}
            onNavigateToOrders={() => setActiveTab('orders')}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpensesView
            currentUser={currentUser}
            isQuickModalOpen={quickExpenseModalOpen}
            onCloseQuickModal={() => setQuickExpenseModalOpen(false)}
          />
        )}
        {activeTab === 'workshops' && <WorkshopsView />}
        {activeTab === 'inventory' && <InventoryView currentUser={currentUser} />}
        {activeTab === 'printers' && <PrintersView currentUser={currentUser} />}
        {activeTab === 'gst' && <GSTView />}
        {activeTab === 'finance' && <FinanceView currentUser={currentUser} />}
        {activeTab === 'reports' && <ReportsView />}
        {activeTab === 'users' && <UserManagementView />}
        {activeTab === 'audit' && <AuditLogsView />}
        {activeTab === 'settings' && <SettingsView />}
      </Layout>

      {/* Global Order Creation Modal */}
      <CreateOrderModal
        isOpen={createOrderModalOpen}
        onClose={() => setCreateOrderModalOpen(false)}
        onOrderCreated={() => {
          // If on orders tab, it will refresh or navigate
          setActiveTab('orders');
        }}
      />

      {/* Global Quick Expense Modal if not on expenses tab */}
      {activeTab !== 'expenses' && (
        <ExpensesView
          currentUser={currentUser}
          isQuickModalOpen={quickExpenseModalOpen}
          onCloseQuickModal={() => setQuickExpenseModalOpen(false)}
        />
      )}
    </>
  );
}

export default App;
