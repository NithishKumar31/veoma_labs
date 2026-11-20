import axios from 'axios';
import {
  User, Customer, Order, InventoryItem, Printer, DailyExpense,
  ExpenseCategory, Employee, SalaryRecord, RentRecord, RecurringExpense,
  Workshop, DashboardSummary, AuditLog, MaterialRate
} from '../types';

const api = axios.create({
  baseURL: '',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('veoma_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('veoma_token');
      localStorage.removeItem('veoma_user');
      window.dispatchEvent(new Event('veoma_auth_change'));
    }
    return Promise.reject(error);
  }
);

export const apiClient = {
  // Auth
  login: async (credentials: { username: string; password: string }) => {
    const res = await api.post('/api/auth/login', credentials);
    return res.data;
  },
  getCurrentUser: async (): Promise<User> => {
    const res = await api.get('/api/auth/me');
    return res.data;
  },
  changePassword: async (data: any) => {
    const res = await api.post('/api/auth/change-password', data);
    return res.data;
  },

  // Users
  listUsers: async (): Promise<User[]> => {
    const res = await api.get('/api/users');
    return res.data;
  },
  createUser: async (user: any): Promise<User> => {
    const res = await api.post('/api/users', user);
    return res.data;
  },
  updateUser: async (id: string, user: any): Promise<User> => {
    const res = await api.put(`/api/users/${id}`, user);
    return res.data;
  },
  deleteUser: async (id: string): Promise<any> => {
    const res = await api.delete(`/api/users/${id}`);
    return res.data;
  },

  // Customers
  listCustomers: async (search?: string): Promise<Customer[]> => {
    const res = await api.get('/api/customers', { params: { search } });
    return res.data;
  },
  createCustomer: async (customer: any): Promise<Customer> => {
    const res = await api.post('/api/customers', customer);
    return res.data;
  },
  getCustomerDetails: async (id: string) => {
    const res = await api.get(`/api/customers/${id}`);
    return res.data;
  },
  updateCustomer: async (id: string, customer: any): Promise<Customer> => {
    const res = await api.put(`/api/customers/${id}`, customer);
    return res.data;
  },

  // Orders
  listOrders: async (filters?: any): Promise<Order[]> => {
    const res = await api.get('/api/orders', { params: filters });
    return res.data;
  },
  getOrder: async (id: string): Promise<Order> => {
    const res = await api.get(`/api/orders/${id}`);
    return res.data;
  },
  suggestPrice: async (data: any) => {
    const res = await api.post('/api/orders/suggest-price', data);
    return res.data;
  },
  createOrder: async (order: any): Promise<Order> => {
    const res = await api.post('/api/orders', order);
    return res.data;
  },
  updateOrderStatus: async (id: string, status: string, notes?: string): Promise<Order> => {
    const res = await api.patch(`/api/orders/${id}/status`, { order_status: status, notes });
    return res.data;
  },
  recordPayment: async (orderId: string, payment: any) => {
    const res = await api.post(`/api/orders/${orderId}/payments`, payment);
    return res.data;
  },
  reconcileConsumption: async (orderId: string, data: any) => {
    const res = await api.post(`/api/orders/${orderId}/reconcile-consumption`, data);
    return res.data;
  },
  deleteOrder: async (orderId: string) => {
    const res = await api.delete(`/api/orders/${orderId}`);
    return res.data;
  },
  getOrderInvoiceData: async (orderId: string) => {
    const res = await api.get(`/api/orders/${orderId}/invoice-data`);
    return res.data;
  },
  getOrderInvoicePdfUrl: (orderId: string) => {
    const token = localStorage.getItem('veoma_token');
    return `/api/orders/${orderId}/invoice-pdf?token=${token || ''}`;
  },

  // Inventory
  listInventory: async (materialType?: string): Promise<InventoryItem[]> => {
    const res = await api.get('/api/inventory', { params: { material_type: materialType } });
    return res.data;
  },
  listLowStock: async (): Promise<InventoryItem[]> => {
    const res = await api.get('/api/inventory/low-stock');
    return res.data;
  },
  recordPurchase: async (purchase: any) => {
    const res = await api.post('/api/inventory/purchases', purchase);
    return res.data;
  },
  manualStockAdjustment: async (adjustment: any) => {
    const res = await api.post('/api/inventory/adjustments', adjustment);
    return res.data;
  },
  listMovements: async (itemId?: string) => {
    const res = await api.get('/api/inventory/movements', { params: { item_id: itemId } });
    return res.data;
  },

  // Printers
  listPrinters: async (): Promise<Printer[]> => {
    const res = await api.get('/api/printers');
    return res.data;
  },
  addPrinter: async (printer: any): Promise<Printer> => {
    const res = await api.post('/api/printers', printer);
    return res.data;
  },
  updatePrinter: async (id: string, printer: any): Promise<Printer> => {
    const res = await api.put(`/api/printers/${id}`, printer);
    return res.data;
  },

  // Expenses
  listExpenses: async (filters?: any): Promise<DailyExpense[]> => {
    const res = await api.get('/api/expenses', { params: filters });
    return res.data;
  },
  createExpense: async (expense: any): Promise<DailyExpense> => {
    const res = await api.post('/api/expenses', expense);
    return res.data;
  },
  getDailySummary: async (date: string) => {
    const res = await api.get('/api/expenses/daily-summary', { params: { date } });
    return res.data;
  },
  listCategories: async (): Promise<ExpenseCategory[]> => {
    const res = await api.get('/api/expenses/categories');
    return res.data;
  },
  addCategory: async (name: string): Promise<ExpenseCategory> => {
    const res = await api.post('/api/expenses/categories', { name });
    return res.data;
  },
  uploadReceipt: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/api/expenses/upload-receipt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  deleteExpense: async (id: string) => {
    const res = await api.delete(`/api/expenses/${id}`);
    return res.data;
  },

  // Finance & Salaries
  listEmployees: async (): Promise<Employee[]> => {
    const res = await api.get('/api/finance/employees');
    return res.data;
  },
  addEmployee: async (emp: any): Promise<Employee> => {
    const res = await api.post('/api/finance/employees', emp);
    return res.data;
  },
  listSalaries: async (month?: string): Promise<SalaryRecord[]> => {
    const res = await api.get('/api/finance/salaries', { params: { month } });
    return res.data;
  },
  recordSalary: async (sal: any): Promise<SalaryRecord> => {
    const res = await api.post('/api/finance/salaries', sal);
    return res.data;
  },
  listRentRecords: async (): Promise<RentRecord[]> => {
    const res = await api.get('/api/finance/rent');
    return res.data;
  },
  recordRent: async (rent: any): Promise<RentRecord> => {
    const res = await api.post('/api/finance/rent', rent);
    return res.data;
  },
  listRecurringExpenses: async (): Promise<RecurringExpense[]> => {
    const res = await api.get('/api/finance/recurring');
    return res.data;
  },
  addRecurringExpense: async (rec: any): Promise<RecurringExpense> => {
    const res = await api.post('/api/finance/recurring', rec);
    return res.data;
  },

  // Workshops
  listWorkshops: async (filters?: any): Promise<Workshop[]> => {
    const res = await api.get('/api/workshops', { params: filters });
    return res.data;
  },
  getWorkshop: async (id: string): Promise<Workshop> => {
    const res = await api.get(`/api/workshops/${id}`);
    return res.data;
  },
  createWorkshop: async (ws: any): Promise<Workshop> => {
    const res = await api.post('/api/workshops', ws);
    return res.data;
  },
  addParticipant: async (wsId: string, part: any) => {
    const res = await api.post(`/api/workshops/${wsId}/participants`, part);
    return res.data;
  },
  addWorkshopExpense: async (wsId: string, exp: any) => {
    const res = await api.post(`/api/workshops/${wsId}/expenses`, exp);
    return res.data;
  },

  // GST
  getGSTSalesRegister: async (month?: string) => {
    const res = await api.get('/api/gst/sales-register', { params: { month } });
    return res.data;
  },

  // Reports & Dashboard
  getDashboardSummary: async (filterType?: string, startDate?: string, endDate?: string): Promise<DashboardSummary> => {
    const res = await api.get('/api/reports/dashboard', {
      params: { filter_type: filterType, start_date: startDate, end_date: endDate }
    });
    return res.data;
  },
  getProfitAndLoss: async (filterType?: string, startDate?: string, endDate?: string) => {
    const res = await api.get('/api/reports/profit-and-loss', {
      params: { filter_type: filterType, start_date: startDate, end_date: endDate }
    });
    return res.data;
  },
  exportExcelUrl: (reportType: string, startDate?: string, endDate?: string) => {
    return `/api/reports/export/excel?report_type=${reportType}${startDate ? `&start_date=${startDate}` : ''}${endDate ? `&end_date=${endDate}` : ''}`;
  },
  exportPdfUrl: (reportType: string, startDate?: string, endDate?: string) => {
    return `/api/reports/export/pdf?report_type=${reportType}${startDate ? `&start_date=${startDate}` : ''}${endDate ? `&end_date=${endDate}` : ''}`;
  },

  // Settings
  getSettings: async () => {
    const res = await api.get('/api/settings');
    return res.data;
  },
  updateCompanySettings: async (settings: any) => {
    const res = await api.post('/api/settings/company', settings);
    return res.data;
  },
  updateMaterialRate: async (id: string, rate: any) => {
    const res = await api.put(`/api/settings/material-rates/${id}`, rate);
    return res.data;
  },

  // Audit Logs
  listAuditLogs: async (module?: string, action?: string): Promise<AuditLog[]> => {
    const res = await api.get('/api/audit', { params: { module, action } });
    return res.data;
  },

  // Backups
  listBackups: async () => {
    const res = await api.get('/api/backup');
    return res.data;
  },
  createBackup: async () => {
    const res = await api.post('/api/backup/create');
    return res.data;
  },
};
