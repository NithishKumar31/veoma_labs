import axios from 'axios';
import {
  User, Customer, Order, InventoryItem, Printer, DailyExpense,
  ExpenseCategory, Employee, SalaryRecord, RentRecord, RecurringExpense,
  Workshop, DashboardSummary, AuditLog, MaterialRate
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
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

/**
 * Safely calls an API endpoint; falls back to offline/local storage
 * when deployed statically on GitHub Pages or when backend is unreachable.
 */
async function safeApiCall<T>(apiFn: () => Promise<T>, fallbackFn: () => T | Promise<T>): Promise<T> {
  try {
    return await apiFn();
  } catch (err: any) {
    if (!err.response || err.response.status === 404 || err.response.status === 405) {
      return await fallbackFn();
    }
    throw err;
  }
}

// Default Fallback Records
const DEFAULT_MATERIAL_RATES: MaterialRate[] = [
  { id: '1', material_type: 'PLA', base_rate_per_gram: 2.0, post_processing_rate_per_gram: 1.0, default_wastage_pct: 10 },
  { id: '2', material_type: 'ABS', base_rate_per_gram: 5.0, post_processing_rate_per_gram: 1.5, default_wastage_pct: 10 },
  { id: '3', material_type: 'PETG', base_rate_per_gram: 4.0, post_processing_rate_per_gram: 1.5, default_wastage_pct: 10 },
  { id: '4', material_type: 'TPU', base_rate_per_gram: 10.0, post_processing_rate_per_gram: 1.5, default_wastage_pct: 10 },
  { id: '5', material_type: 'RESIN', base_rate_per_gram: 8.0, post_processing_rate_per_gram: 2.0, default_wastage_pct: 5 }
];

const DEFAULT_PRINTERS: Printer[] = [
  { id: 'p1', name: 'Bambu Lab A1', model: 'A1 Combo', technology: 'FDM', purchase_cost: 45000, status: 'ACTIVE' },
  { id: 'p2', name: 'Bambu Lab A1 Mini', model: 'A1 Mini', technology: 'FDM', purchase_cost: 28000, status: 'ACTIVE' },
  { id: 'p3', name: 'Creality Ender 3 S1 Pro', model: 'Ender 3 S1 Pro', technology: 'FDM', purchase_cost: 32000, status: 'ACTIVE' },
  { id: 'p4', name: 'Anycubic Photon Mono 4', model: 'Photon Mono 4', technology: 'RESIN', purchase_cost: 25000, status: 'ACTIVE' }
];

const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: 'i1', material_type: 'PLA', brand: 'Bambu Lab', colour: 'Black', spool_weight_grams: 1000, current_stock_grams: 4500, min_threshold_grams: 2000, avg_cost_per_gram: 1.6, is_active: true, updated_at: new Date().toISOString() },
  { id: 'i2', material_type: 'PLA', brand: 'Bambu Lab', colour: 'White', spool_weight_grams: 1000, current_stock_grams: 3000, min_threshold_grams: 2000, avg_cost_per_gram: 1.6, is_active: true, updated_at: new Date().toISOString() },
  { id: 'i3', material_type: 'PETG', brand: 'eSun', colour: 'Grey', spool_weight_grams: 1000, current_stock_grams: 2000, min_threshold_grams: 1000, avg_cost_per_gram: 1.4, is_active: true, updated_at: new Date().toISOString() },
  { id: 'i4', material_type: 'RESIN', brand: 'Anycubic', colour: 'Grey', spool_weight_grams: 1000, current_stock_grams: 2000, min_threshold_grams: 1000, avg_cost_per_gram: 2.2, is_active: true, updated_at: new Date().toISOString() }
];

export const apiClient = {
  // Auth
  login: async (credentials: { username: string; password: string }) => {
    return safeApiCall(
      async () => {
        const res = await api.post('/api/auth/login', credentials);
        return res.data;
      },
      () => {
        if (credentials.username.trim().toLowerCase() === 'admin' && credentials.password === 'Veoma@Admin2026') {
          return {
            access_token: 'veoma-client-token-' + Date.now(),
            token_type: 'bearer',
            user: {
              id: 'admin-super-001',
              username: 'admin',
              email: 'admin@veomalabs.com',
              full_name: 'Veoma Super Admin',
              role: 'SUPER_ADMIN' as const,
              permissions: {
                can_view_profits: true,
                can_view_salaries: true,
                can_view_gst: true,
                can_manage_users: true,
                can_delete_financials: true,
                can_manage_inventory: true,
                can_manage_workshops: true,
                can_backup_database: true
              },
              is_active: true
            }
          };
        }
        throw new Error('Invalid username or password');
      }
    );
  },

  getCurrentUser: async (): Promise<User> => {
    return safeApiCall(
      async () => {
        const res = await api.get('/api/auth/me');
        return res.data;
      },
      () => {
        const saved = localStorage.getItem('veoma_user');
        if (saved) return JSON.parse(saved);
        return {
          id: 'admin-super-001',
          username: 'admin',
          email: 'admin@veomalabs.com',
          full_name: 'Veoma Super Admin',
          role: 'SUPER_ADMIN',
          permissions: {},
          is_active: true
        };
      }
    );
  },

  changePassword: async (data: any) => {
    const res = await api.post('/api/auth/change-password', data);
    return res.data;
  },

  // Users
  listUsers: async (): Promise<User[]> => {
    return safeApiCall(
      async () => (await api.get('/api/users')).data,
      () => {
        const saved = localStorage.getItem('veoma_user');
        return saved ? [JSON.parse(saved)] : [];
      }
    );
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
    return safeApiCall(
      async () => (await api.get('/api/customers', { params: { search } })).data,
      () => {
        const raw = localStorage.getItem('veoma_local_customers');
        let list: Customer[] = raw ? JSON.parse(raw) : [];
        if (search) {
          const s = search.toLowerCase();
          list = list.filter((c) => c.name.toLowerCase().includes(s) || c.phone.includes(s));
        }
        return list;
      }
    );
  },

  createCustomer: async (customer: any): Promise<Customer> => {
    return safeApiCall(
      async () => (await api.post('/api/customers', customer)).data,
      () => {
        const newCust: Customer = {
          id: 'cust-' + Date.now(),
          customer_code: 'CUST-' + Math.floor(1000 + Math.random() * 9000),
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          gstin: customer.gstin,
          customer_type: customer.customer_type || (customer.gstin ? 'BUSINESS' : 'INDIVIDUAL'),
          notes: customer.notes,
          created_at: new Date().toISOString()
        };
        const raw = localStorage.getItem('veoma_local_customers');
        const list: Customer[] = raw ? JSON.parse(raw) : [];
        list.push(newCust);
        localStorage.setItem('veoma_local_customers', JSON.stringify(list));
        return newCust;
      }
    );
  },

  getCustomerDetails: async (id: string) => {
    return safeApiCall(
      async () => (await api.get(`/api/customers/${id}`)).data,
      () => {
        const raw = localStorage.getItem('veoma_local_customers');
        const list: Customer[] = raw ? JSON.parse(raw) : [];
        return list.find((c) => c.id === id) || null;
      }
    );
  },

  updateCustomer: async (id: string, customer: any): Promise<Customer> => {
    return safeApiCall(
      async () => (await api.put(`/api/customers/${id}`, customer)).data,
      () => {
        const raw = localStorage.getItem('veoma_local_customers');
        const list: Customer[] = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex((c) => c.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...customer };
          localStorage.setItem('veoma_local_customers', JSON.stringify(list));
          return list[idx];
        }
        return customer;
      }
    );
  },

  // Orders
  listOrders: async (filters?: any): Promise<Order[]> => {
    return safeApiCall(
      async () => (await api.get('/api/orders', { params: filters })).data,
      () => {
        const raw = localStorage.getItem('veoma_local_orders');
        return raw ? JSON.parse(raw) : [];
      }
    );
  },

  getOrder: async (id: string): Promise<Order> => {
    return safeApiCall(
      async () => (await api.get(`/api/orders/${id}`)).data,
      () => {
        const raw = localStorage.getItem('veoma_local_orders');
        const list: Order[] = raw ? JSON.parse(raw) : [];
        const found = list.find((o) => o.id === id || o.order_id === id);
        if (found) return found;
        throw new Error('Order not found');
      }
    );
  },

  suggestPrice: async (data: any) => {
    return safeApiCall(
      async () => (await api.post('/api/orders/suggest-price', data)).data,
      () => {
        const cost = Number(data.total_direct_cost) || 100;
        return { suggested_price: Math.round(cost * 1.5) };
      }
    );
  },

  createOrder: async (order: any): Promise<Order> => {
    return safeApiCall(
      async () => (await api.post('/api/orders', order)).data,
      () => {
        const price = Number(order.agreed_selling_price) || 0;
        const courier = Number(order.courier_charge) || 0;
        const isGst = !!order.gst_applicable;
        const gstRate = Number(order.gst_rate) || 18;
        const gstAmount = isGst ? (price * gstRate) / 100 : 0;
        const total = price + gstAmount + courier;

        const newOrd: Order = {
          id: 'ord-' + Date.now(),
          order_id: `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          customer_id: order.customer_id || 'cust-1',
          customer_name: order.customer_name || 'Customer',
          customer_phone: order.customer_phone || '',
          customer_gstin: order.customer_gstin,
          order_date: new Date().toISOString(),
          expected_delivery_date: order.expected_delivery_date,
          model_name: order.model_name || '3D Print Job',
          image_url: order.image_url,
          description: order.description,
          quantity: Number(order.quantity) || 1,
          order_status: 'PENDING',
          designing_required: !!order.designing_required,
          designing_cost: Number(order.designing_cost) || 0,
          courier_charge: courier,
          packing_cost: Number(order.packing_cost) || 0,
          other_direct_costs: Number(order.other_direct_costs) || 0,
          base_production_cost: 150,
          post_processing_cost: 50,
          total_direct_cost: 200,
          agreed_selling_price: price,
          gross_profit: Math.max(0, price - 200),
          profit_margin_pct: price > 0 ? Math.round(((price - 200) / price) * 100) : 0,
          gst_applicable: isGst,
          place_of_supply: order.place_of_supply || 'Tamil Nadu',
          taxable_value: price,
          gst_rate: gstRate,
          cgst_amount: isGst ? gstAmount / 2 : 0,
          sgst_amount: isGst ? gstAmount / 2 : 0,
          igst_amount: 0,
          total_invoice_amount: total,
          invoice_number: `INV-2026-${Math.floor(10000 + Math.random() * 90000)}`,
          payment_status: 'UNPAID',
          total_paid: 0,
          remaining_balance: total,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          production_items: order.production_items || [],
          payments: []
        };
        const raw = localStorage.getItem('veoma_local_orders');
        const list: Order[] = raw ? JSON.parse(raw) : [];
        list.unshift(newOrd);
        localStorage.setItem('veoma_local_orders', JSON.stringify(list));
        return newOrd;
      }
    );
  },

  updateOrderStatus: async (id: string, status: string, notes?: string): Promise<Order> => {
    return safeApiCall(
      async () => (await api.patch(`/api/orders/${id}/status`, { order_status: status, notes })).data,
      () => {
        const raw = localStorage.getItem('veoma_local_orders');
        const list: Order[] = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex((o) => o.id === id || o.order_id === id);
        if (idx !== -1) {
          list[idx].order_status = status;
          list[idx].updated_at = new Date().toISOString();
          localStorage.setItem('veoma_local_orders', JSON.stringify(list));
          return list[idx];
        }
        throw new Error('Order not found');
      }
    );
  },

  recordPayment: async (orderId: string, payment: any) => {
    return safeApiCall(
      async () => (await api.post(`/api/orders/${orderId}/payments`, payment)).data,
      () => {
        const raw = localStorage.getItem('veoma_local_orders');
        const list: Order[] = raw ? JSON.parse(raw) : [];
        const ord = list.find((o) => o.id === orderId || o.order_id === orderId);
        if (ord) {
          const amt = Number(payment.amount) || 0;
          ord.total_paid = (Number(ord.total_paid) || 0) + amt;
          ord.remaining_balance = Math.max(0, (Number(ord.total_invoice_amount) || 0) - ord.total_paid);
          ord.payment_status = ord.remaining_balance <= 0 ? 'FULLY_PAID' : 'PARTIALLY_PAID';
          ord.payments = ord.payments || [];
          ord.payments.push({
            id: 'pay-' + Date.now(),
            order_id: ord.id,
            payment_code: 'PAY-' + Math.floor(1000 + Math.random() * 9000),
            amount: amt,
            payment_date: new Date().toISOString(),
            payment_method: payment.payment_method || 'UPI',
            transaction_ref: payment.transaction_ref,
            created_at: new Date().toISOString()
          });
          localStorage.setItem('veoma_local_orders', JSON.stringify(list));
        }
        return { success: true };
      }
    );
  },

  reconcileConsumption: async (orderId: string, data: any) => {
    const res = await api.post(`/api/orders/${orderId}/reconcile-consumption`, data);
    return res.data;
  },

  deleteOrder: async (orderId: string) => {
    return safeApiCall(
      async () => (await api.delete(`/api/orders/${orderId}`)).data,
      () => {
        const raw = localStorage.getItem('veoma_local_orders');
        const list: Order[] = raw ? JSON.parse(raw) : [];
        const filtered = list.filter((o) => o.id !== orderId && o.order_id !== orderId);
        localStorage.setItem('veoma_local_orders', JSON.stringify(filtered));
        return { success: true };
      }
    );
  },

  getOrderInvoiceData: async (orderId: string) => {
    return safeApiCall(
      async () => (await api.get(`/api/orders/${orderId}/invoice-data`)).data,
      () => {
        const raw = localStorage.getItem('veoma_local_orders');
        const list: Order[] = raw ? JSON.parse(raw) : [];
        const ord = list.find((o) => o.id === orderId || o.order_id === orderId);
        if (!ord) throw new Error('Order not found');
        return {
          company_name: 'VEOMA LABS',
          company_gstin: '33HGMPK9319D1Z7',
          company_address: '97, Kundalakeshi street, Camp road, Tambaram',
          phone: '+91 70101 77745',
          invoice_no: ord.invoice_number || 'INV-2026-001',
          invoice_date: new Date(ord.order_date).toLocaleDateString('en-GB'),
          customer_name: (ord.customer_name || 'Customer').toUpperCase(),
          customer_address: (ord.place_of_supply || 'Tamil Nadu').toUpperCase(),
          customer_gstin: ord.customer_gstin,
          items: [{ description: `3D Printing - ${ord.model_name}`, qty: `${ord.quantity} nos`, unit_price: Number(ord.agreed_selling_price) / (Number(ord.quantity) || 1), total: Number(ord.agreed_selling_price) }],
          subtotal: Number(ord.agreed_selling_price),
          gst: ord.cgst_amount + ord.sgst_amount + ord.igst_amount,
          courier_charge: ord.courier_charge,
          total: ord.total_invoice_amount,
          grand_total: ord.total_invoice_amount
        };
      }
    );
  },

  getOrderInvoicePdfUrl: (orderId: string) => {
    const token = localStorage.getItem('veoma_token');
    return `/api/orders/${orderId}/invoice-pdf?token=${token || ''}`;
  },

  // Inventory
  listInventory: async (materialType?: string): Promise<InventoryItem[]> => {
    return safeApiCall(
      async () => (await api.get('/api/inventory', { params: { material_type: materialType } })).data,
      () => DEFAULT_INVENTORY
    );
  },

  listLowStock: async (): Promise<InventoryItem[]> => {
    return safeApiCall(
      async () => (await api.get('/api/inventory/low-stock')).data,
      () => []
    );
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
    return safeApiCall(
      async () => (await api.get('/api/inventory/movements', { params: { item_id: itemId } })).data,
      () => []
    );
  },

  // Printers
  listPrinters: async (): Promise<Printer[]> => {
    return safeApiCall(
      async () => (await api.get('/api/printers')).data,
      () => DEFAULT_PRINTERS
    );
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
    return safeApiCall(
      async () => (await api.get('/api/expenses', { params: filters })).data,
      () => []
    );
  },

  createExpense: async (expense: any): Promise<DailyExpense> => {
    const res = await api.post('/api/expenses', expense);
    return res.data;
  },

  uploadReceipt: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return safeApiCall(
      async () => (await api.post('/api/expenses/upload-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })).data,
      async () => {
        try {
          const { uploadFileToFirebase } = await import('./firebase');
          const url = await uploadFileToFirebase(file, 'receipts');
          return { url };
        } catch {
          return { url: URL.createObjectURL(file) };
        }
      }
    );
  },

  deleteExpense: async (id: string) => {
    return safeApiCall(
      async () => (await api.delete(`/api/expenses/${id}`)).data,
      () => ({ success: true })
    );
  },

  getDailySummary: async (date: string) => {
    return safeApiCall(
      async () => (await api.get('/api/expenses/daily-summary', { params: { date } })).data,
      () => ({ date, total_expense: 0, items: [] })
    );
  },

  listCategories: async (): Promise<ExpenseCategory[]> => {
    return safeApiCall(
      async () => (await api.get('/api/expenses/categories')).data,
      () => [
        { id: 'c1', name: 'Raw Material' },
        { id: 'c2', name: 'Shipping / Courier' },
        { id: 'c3', name: 'Maintenance & Spares' },
        { id: 'c4', name: 'Electricity' },
        { id: 'c5', name: 'Marketing & Ads' }
      ]
    );
  },

  addCategory: async (name: string): Promise<ExpenseCategory> => {
    const res = await api.post('/api/expenses/categories', { name });
    return res.data;
  },

  // Finance / Salaries
  listEmployees: async (): Promise<Employee[]> => {
    return safeApiCall(
      async () => (await api.get('/api/finance/employees')).data,
      () => []
    );
  },

  addEmployee: async (emp: any): Promise<Employee> => {
    const res = await api.post('/api/finance/employees', emp);
    return res.data;
  },

  listSalaries: async (month?: string): Promise<SalaryRecord[]> => {
    return safeApiCall(
      async () => (await api.get('/api/finance/salaries', { params: { month } })).data,
      () => []
    );
  },

  recordSalary: async (sal: any): Promise<SalaryRecord> => {
    const res = await api.post('/api/finance/salaries', sal);
    return res.data;
  },

  listRentRecords: async (): Promise<RentRecord[]> => {
    return safeApiCall(
      async () => (await api.get('/api/finance/rent')).data,
      () => []
    );
  },

  recordRent: async (rent: any): Promise<RentRecord> => {
    const res = await api.post('/api/finance/rent', rent);
    return res.data;
  },

  listRecurringExpenses: async (): Promise<RecurringExpense[]> => {
    return safeApiCall(
      async () => (await api.get('/api/finance/recurring')).data,
      () => []
    );
  },

  addRecurringExpense: async (rec: any): Promise<RecurringExpense> => {
    const res = await api.post('/api/finance/recurring', rec);
    return res.data;
  },

  // Workshops
  listWorkshops: async (filters?: any): Promise<Workshop[]> => {
    return safeApiCall(
      async () => (await api.get('/api/workshops', { params: filters })).data,
      () => []
    );
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
    return safeApiCall(
      async () => (await api.get('/api/gst/sales-register', { params: { month } })).data,
      () => ({ month: month || 'Current', invoices: [], total_taxable: 0, total_cgst: 0, total_sgst: 0, total_igst: 0, total_tax: 0 })
    );
  },

  // Reports & Dashboard
  getDashboardSummary: async (filterType?: string, startDate?: string, endDate?: string): Promise<DashboardSummary> => {
    return safeApiCall(
      async () => (await api.get('/api/reports/dashboard', { params: { filter_type: filterType, start_date: startDate, end_date: endDate } })).data,
      () => {
        const raw = localStorage.getItem('veoma_local_orders');
        const orders: Order[] = raw ? JSON.parse(raw) : [];
        const rev = orders.reduce((s, o) => s + (Number(o.agreed_selling_price) || 0), 0);
        const profit = orders.reduce((s, o) => s + (Number(o.gross_profit) || 0), 0);
        return {
          total_revenue: rev,
          total_profit: profit,
          profit_margin_pct: rev > 0 ? Math.round((profit / rev) * 100) : 0,
          active_orders_count: orders.filter((o) => o.order_status !== 'DELIVERED' && o.order_status !== 'CANCELLED').length,
          completed_orders_count: orders.filter((o) => o.order_status === 'DELIVERED').length,
          pending_payments_total: orders.reduce((s, o) => s + (Number(o.remaining_balance) || 0), 0),
          monthly_expenses_total: 0,
          net_profit: profit,
          recent_orders: orders.slice(0, 5),
          revenue_by_month: []
        };
      }
    );
  },

  getProfitAndLoss: async (filterType?: string, startDate?: string, endDate?: string) => {
    return safeApiCall(
      async () => (await api.get('/api/reports/profit-and-loss', { params: { filter_type: filterType, start_date: startDate, end_date: endDate } })).data,
      () => ({ total_revenue: 0, total_cogs: 0, gross_profit: 0, total_operating_expenses: 0, net_profit: 0 })
    );
  },

  exportExcelUrl: (reportType: string, startDate?: string, endDate?: string) => {
    return `/api/reports/export/excel?report_type=${reportType}${startDate ? `&start_date=${startDate}` : ''}${endDate ? `&end_date=${endDate}` : ''}`;
  },

  exportPdfUrl: (reportType: string, startDate?: string, endDate?: string) => {
    return `/api/reports/export/pdf?report_type=${reportType}${startDate ? `&start_date=${startDate}` : ''}${endDate ? `&end_date=${endDate}` : ''}`;
  },

  // Settings
  getSettings: async () => {
    return safeApiCall(
      async () => (await api.get('/api/settings')).data,
      () => ({
        company_settings: {
          COMPANY_NAME: 'VEOMA LABS',
          COMPANY_GSTIN: '33HGMPK9319D1Z7',
          COMPANY_ADDRESS: '97, Kundalakeshi street, Camp road, Tambaram',
          SUPPLIER_STATE: 'Tamil Nadu'
        },
        material_rates: DEFAULT_MATERIAL_RATES
      })
    );
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
    return safeApiCall(
      async () => (await api.get('/api/audit', { params: { module, action } })).data,
      () => []
    );
  },

  // Backups
  listBackups: async () => {
    return safeApiCall(
      async () => (await api.get('/api/backup')).data,
      () => []
    );
  },

  createBackup: async () => {
    const res = await api.post('/api/backup/create');
    return res.data;
  },
};
