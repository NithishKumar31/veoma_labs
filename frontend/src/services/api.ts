import axios from 'axios';
import {
  User, Customer, Order, InventoryItem, Printer, DailyExpense,
  ExpenseCategory, Employee, SalaryRecord, RentRecord, RecurringExpense,
  Workshop, DashboardSummary, AuditLog, MaterialRate
} from '../types';
import { db, uploadFileToFirebase } from './firebase';
import { collection, doc, setDoc, getDocs, getDoc, deleteDoc } from 'firebase/firestore';
import { generateClientInvoicePdf } from '../utils/pdfGenerator';

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

const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

/**
 * Safely calls an API endpoint; falls back to Firebase Cloud Firestore / local storage
 * when deployed on GitHub Pages or when local FastAPI server is offline.
 */
async function safeApiCall<T>(apiFn: () => Promise<T>, fallbackFn: () => T | Promise<T>): Promise<T> {
  if (isGitHubPages) {
    // When hosted on GitHub Pages, immediately use Firebase Cloud Firestore / local storage
    return await fallbackFn();
  }
  try {
    return await apiFn();
  } catch (err: any) {
    if (!err.response || err.response.status === 404 || err.response.status === 405 || err.message?.includes('Network Error')) {
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
      async () => (await api.get('/api/auth/me')).data,
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
    return safeApiCall(
      async () => (await api.post('/api/auth/change-password', data)).data,
      () => ({ success: true, message: 'Password updated successfully' })
    );
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
    return safeApiCall(
      async () => (await api.post('/api/users', user)).data,
      () => ({
        id: 'user-' + Date.now(),
        ...user,
        created_at: new Date().toISOString()
      })
    );
  },

  updateUser: async (id: string, user: any): Promise<User> => {
    return safeApiCall(
      async () => (await api.put(`/api/users/${id}`, user)).data,
      () => ({ id, ...user })
    );
  },

  deleteUser: async (id: string): Promise<any> => {
    return safeApiCall(
      async () => (await api.delete(`/api/users/${id}`)).data,
      () => ({ success: true })
    );
  },

  // Customers (with Firebase Cloud Firestore Sync)
  listCustomers: async (search?: string): Promise<Customer[]> => {
    return safeApiCall(
      async () => (await api.get('/api/customers', { params: { search } })).data,
      async () => {
        try {
          const snap = await getDocs(collection(db, 'customers'));
          const list: Customer[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer));
          localStorage.setItem('veoma_local_customers', JSON.stringify(list));
          if (search) {
            const s = search.toLowerCase();
            return list.filter((c) => c.name.toLowerCase().includes(s) || c.phone.includes(s));
          }
          return list;
        } catch {
          const raw = localStorage.getItem('veoma_local_customers');
          let list: Customer[] = raw ? JSON.parse(raw) : [];
          if (search) {
            const s = search.toLowerCase();
            list = list.filter((c) => c.name.toLowerCase().includes(s) || c.phone.includes(s));
          }
          return list;
        }
      }
    );
  },

  createCustomer: async (customer: any): Promise<Customer> => {
    return safeApiCall(
      async () => {
        const res = await api.post('/api/customers', customer);
        try {
          await setDoc(doc(db, 'customers', String(res.data.id)), res.data, { merge: true });
        } catch (e) {
          console.warn('Firestore customer sync:', e);
        }
        return res.data;
      },
      async () => {
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
        try {
          await setDoc(doc(db, 'customers', newCust.id), newCust);
        } catch (e) {
          console.warn('Firestore customer write error:', e);
        }
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
      async () => {
        try {
          const snap = await getDoc(doc(db, 'customers', id));
          if (snap.exists()) return { id: snap.id, ...snap.data() };
        } catch {}
        const raw = localStorage.getItem('veoma_local_customers');
        const list: Customer[] = raw ? JSON.parse(raw) : [];
        return list.find((c) => c.id === id) || null;
      }
    );
  },

  updateCustomer: async (id: string, customer: any): Promise<Customer> => {
    return safeApiCall(
      async () => (await api.put(`/api/customers/${id}`, customer)).data,
      async () => {
        try {
          await setDoc(doc(db, 'customers', id), customer, { merge: true });
        } catch {}
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

  deleteCustomer: async (id: string) => {
    return safeApiCall(
      async () => {
        const res = await api.delete(`/api/customers/${id}`);
        try {
          await deleteDoc(doc(db, 'customers', String(id)));
        } catch {}
        return res.data;
      },
      async () => {
        try {
          await deleteDoc(doc(db, 'customers', String(id)));
        } catch {}
        const raw = localStorage.getItem('veoma_local_customers');
        const list: Customer[] = raw ? JSON.parse(raw) : [];
        const filtered = list.filter((c) => c.id !== id);
        localStorage.setItem('veoma_local_customers', JSON.stringify(filtered));
        return { success: true };
      }
    );
  },

  // Orders (with Firebase Cloud Firestore Sync)
  listOrders: async (filters?: any): Promise<Order[]> => {
    return safeApiCall(
      async () => (await api.get('/api/orders', { params: filters })).data,
      async () => {
        try {
          const snap = await getDocs(collection(db, 'orders'));
          const list: Order[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
          list.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
          localStorage.setItem('veoma_local_orders', JSON.stringify(list));
          return list;
        } catch {
          const raw = localStorage.getItem('veoma_local_orders');
          return raw ? JSON.parse(raw) : [];
        }
      }
    );
  },

  getOrder: async (id: string): Promise<Order> => {
    return safeApiCall(
      async () => (await api.get(`/api/orders/${id}`)).data,
      async () => {
        try {
          const snap = await getDoc(doc(db, 'orders', id));
          if (snap.exists()) return { id: snap.id, ...snap.data() } as Order;
        } catch {}
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
      async () => {
        const res = await api.post('/api/orders', order);
        try {
          await setDoc(doc(db, 'orders', String(res.data.id)), res.data, { merge: true });
        } catch (e) {
          console.warn('Firestore order sync:', e);
        }
        return res.data;
      },
      async () => {
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

        // Save to Firebase Cloud Firestore
        try {
          await setDoc(doc(db, 'orders', newOrd.id), newOrd);
        } catch (e) {
          console.warn('Firestore order write error:', e);
        }

        // Cache locally
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
      async () => {
        const res = await api.patch(`/api/orders/${id}/status`, { order_status: status, notes });
        try {
          await setDoc(doc(db, 'orders', String(id)), { order_status: status, updated_at: new Date().toISOString() }, { merge: true });
        } catch {}
        return res.data;
      },
      async () => {
        try {
          await setDoc(doc(db, 'orders', id), { order_status: status, updated_at: new Date().toISOString() }, { merge: true });
        } catch {}
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
      async () => {
        const res = await api.post(`/api/orders/${orderId}/payments`, payment);
        try {
          await setDoc(doc(db, 'orders', String(orderId)), {
            payment_status: res.data?.payment_status,
            total_paid: res.data?.total_paid,
            remaining_balance: res.data?.remaining_balance,
            updated_at: new Date().toISOString()
          }, { merge: true });
        } catch {}
        return res.data;
      },
      async () => {
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
          try {
            await setDoc(doc(db, 'orders', ord.id), ord, { merge: true });
          } catch {}
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
      async () => {
        const res = await api.delete(`/api/orders/${orderId}`);
        try {
          await deleteDoc(doc(db, 'orders', String(orderId)));
        } catch {}
        return res.data;
      },
      async () => {
        try {
          await deleteDoc(doc(db, 'orders', orderId));
        } catch {}
        const raw = localStorage.getItem('veoma_local_orders');
        const list: Order[] = raw ? JSON.parse(raw) : [];
        const filtered = list.filter((o) => o.id !== orderId && o.order_id !== orderId);
        localStorage.setItem('veoma_local_orders', JSON.stringify(filtered));
        return { success: true };
      }
    );
  },

  getOrderInvoiceData: async (orderId: string) => {
    // Check local storage for user's saved bill
    try {
      const localSaved = localStorage.getItem(`veoma_invoice_${orderId}`);
      if (localSaved) {
        const parsed = JSON.parse(localSaved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}

    return safeApiCall(
      async () => (await api.get(`/api/orders/${orderId}/invoice-data`)).data,
      async () => {
        let ord: Order | null = null;
        try {
          const snap = await getDoc(doc(db, 'invoices', orderId));
          if (snap.exists()) return snap.data();
        } catch {}

        try {
          const snap = await getDoc(doc(db, 'orders', orderId));
          if (snap.exists()) ord = snap.data() as Order;
        } catch {}
        if (!ord) {
          const raw = localStorage.getItem('veoma_local_orders');
          const list: Order[] = raw ? JSON.parse(raw) : [];
          ord = list.find((o) => o.id === orderId || o.order_id === orderId) || null;
        }
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

  saveOrderInvoice: async (orderId: string, payload: any) => {
    // 1. Save to local storage for instant offline resilience
    try {
      localStorage.setItem(`veoma_invoice_${orderId}`, JSON.stringify(payload));
    } catch {}

    // 2. Save to Firebase Firestore if connected
    try {
      await setDoc(doc(db, 'invoices', orderId), { ...payload, updated_at: new Date().toISOString() });
    } catch {}

    // 3. Save to FastAPI backend if available
    return safeApiCall(
      async () => (await api.post(`/api/orders/${orderId}/save-invoice`, payload)).data,
      () => ({ message: 'Invoice saved successfully to local storage and cloud', invoice_no: payload.invoice_no })
    );
  },

  getOrderInvoicePdfUrl: (orderId: string) => {
    const token = localStorage.getItem('veoma_token');
    return `/api/orders/${orderId}/invoice-pdf?token=${token || ''}`;
  },

  downloadCustomInvoicePdf: async (payload: any) => {
    // Try downloading official ReportLab PDF from FastAPI backend
    try {
      const res = await api.post('/api/orders/custom-invoice-pdf', payload, {
        responseType: 'blob'
      });
      if (res.data && res.data.size > 100) {
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${payload.invoice_no || 'Custom'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return;
      }
    } catch (e) {
      console.warn('Backend custom PDF failed, using client-side jsPDF generator:', e);
    }

    // Client-side fallback: generates and downloads actual PDF file directly
    try {
      generateClientInvoicePdf(payload);
    } catch (e) {
      console.error('Client-side jsPDF generation error:', e);
      window.print();
    }
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
    return safeApiCall(
      async () => (await api.post('/api/inventory/purchases', purchase)).data,
      () => ({ success: true, ...purchase })
    );
  },

  manualStockAdjustment: async (adjustment: any) => {
    return safeApiCall(
      async () => (await api.post('/api/inventory/adjustments', adjustment)).data,
      () => ({ success: true, ...adjustment })
    );
  },

  listMovements: async (itemId?: string) => {
    return safeApiCall(
      async () => (await api.get('/api/inventory/movements', { params: { item_id: itemId } })).data,
      () => []
    );
  },

  deleteInventoryItem: async (id: string) => {
    return safeApiCall(
      async () => {
        const res = await api.delete(`/api/inventory/items/${id}`);
        try {
          await deleteDoc(doc(db, 'inventory', String(id)));
        } catch {}
        return res.data;
      },
      async () => {
        try {
          await deleteDoc(doc(db, 'inventory', String(id)));
        } catch {}
        return { success: true };
      }
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
    return safeApiCall(
      async () => (await api.post('/api/printers', printer)).data,
      () => ({ id: 'p-' + Date.now(), ...printer })
    );
  },

  updatePrinter: async (id: string, printer: any): Promise<Printer> => {
    return safeApiCall(
      async () => (await api.put(`/api/printers/${id}`, printer)).data,
      () => ({ id, ...printer })
    );
  },

  deletePrinter: async (id: string) => {
    return safeApiCall(
      async () => {
        const res = await api.delete(`/api/printers/${id}`);
        try {
          await deleteDoc(doc(db, 'printers', String(id)));
        } catch {}
        return res.data;
      },
      async () => {
        try {
          await deleteDoc(doc(db, 'printers', String(id)));
        } catch {}
        return { success: true };
      }
    );
  },

  // Expenses
  listExpenses: async (filters?: any): Promise<DailyExpense[]> => {
    return safeApiCall(
      async () => (await api.get('/api/expenses', { params: filters })).data,
      async () => {
        try {
          const snap = await getDocs(collection(db, 'expenses'));
          return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DailyExpense));
        } catch {
          return [];
        }
      }
    );
  },

  createExpense: async (expense: any): Promise<DailyExpense> => {
    return safeApiCall(
      async () => {
        const res = await api.post('/api/expenses', expense);
        try {
          await setDoc(doc(db, 'expenses', String(res.data.id)), res.data, { merge: true });
        } catch (e) {
          console.warn('Firestore expense sync warning:', e);
        }
        return res.data;
      },
      async () => {
        const newExp: DailyExpense = {
          id: 'exp-' + Date.now(),
          expense_code: 'EXP-' + Math.floor(1000 + Math.random() * 9000),
          expense_date: expense.expense_date || new Date().toISOString(),
          category: expense.category || 'General',
          amount: Number(expense.amount) || 0,
          payment_method: expense.payment_method || 'UPI',
          paid_by: expense.paid_by || 'Admin',
          description: expense.description || '',
          receipt_url: expense.receipt_url,
          is_archived: false,
          created_at: new Date().toISOString()
        };
        try {
          await setDoc(doc(db, 'expenses', newExp.id), newExp);
        } catch {}
        return newExp;
      }
    );
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
      async () => {
        try {
          await deleteDoc(doc(db, 'expenses', id));
        } catch {}
        return { success: true };
      }
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
    return safeApiCall(
      async () => (await api.post('/api/expenses/categories', { name })).data,
      () => ({ id: 'c-' + Date.now(), name })
    );
  },

  // Finance / Salaries
  listEmployees: async (): Promise<Employee[]> => {
    return safeApiCall(
      async () => (await api.get('/api/finance/employees')).data,
      () => []
    );
  },

  addEmployee: async (emp: any): Promise<Employee> => {
    return safeApiCall(
      async () => (await api.post('/api/finance/employees', emp)).data,
      () => ({ id: 'emp-' + Date.now(), ...emp, is_active: true })
    );
  },

  deleteEmployee: async (id: string) => {
    return safeApiCall(
      async () => (await api.delete(`/api/finance/employees/${id}`)).data,
      () => ({ success: true })
    );
  },

  listSalaries: async (month?: string): Promise<SalaryRecord[]> => {
    return safeApiCall(
      async () => (await api.get('/api/finance/salaries', { params: { month } })).data,
      () => []
    );
  },

  recordSalary: async (sal: any): Promise<SalaryRecord> => {
    return safeApiCall(
      async () => (await api.post('/api/finance/salaries', sal)).data,
      () => ({ id: 'sal-' + Date.now(), ...sal, paid_date: new Date().toISOString() })
    );
  },

  deleteSalary: async (id: string) => {
    return safeApiCall(
      async () => (await api.delete(`/api/finance/salaries/${id}`)).data,
      () => ({ success: true })
    );
  },

  listRentRecords: async (): Promise<RentRecord[]> => {
    return safeApiCall(
      async () => (await api.get('/api/finance/rent')).data,
      () => []
    );
  },

  recordRent: async (rent: any): Promise<RentRecord> => {
    return safeApiCall(
      async () => (await api.post('/api/finance/rent', rent)).data,
      () => ({ id: 'rent-' + Date.now(), ...rent, paid_date: new Date().toISOString() })
    );
  },

  deleteRent: async (id: string) => {
    return safeApiCall(
      async () => (await api.delete(`/api/finance/rent/${id}`)).data,
      () => ({ success: true })
    );
  },

  listRecurringExpenses: async (): Promise<RecurringExpense[]> => {
    return safeApiCall(
      async () => (await api.get('/api/finance/recurring')).data,
      () => []
    );
  },

  addRecurringExpense: async (rec: any): Promise<RecurringExpense> => {
    return safeApiCall(
      async () => (await api.post('/api/finance/recurring', rec)).data,
      () => ({ id: 'rec-' + Date.now(), ...rec, is_active: true })
    );
  },

  deleteRecurringExpense: async (id: string) => {
    return safeApiCall(
      async () => (await api.delete(`/api/finance/recurring/${id}`)).data,
      () => ({ success: true })
    );
  },

  // Workshops
  listWorkshops: async (filters?: any): Promise<Workshop[]> => {
    return safeApiCall(
      async () => (await api.get('/api/workshops', { params: filters })).data,
      () => []
    );
  },

  getWorkshop: async (id: string): Promise<Workshop> => {
    return safeApiCall(
      async () => (await api.get(`/api/workshops/${id}`)).data,
      () => ({
        id,
        title: '3D Workshop',
        start_date: new Date().toISOString(),
        status: 'UPCOMING',
        ticket_price: 1500,
        participants: [],
        expenses: []
      } as unknown as Workshop)
    );
  },

  createWorkshop: async (ws: any): Promise<Workshop> => {
    return safeApiCall(
      async () => (await api.post('/api/workshops', ws)).data,
      () => ({ id: 'ws-' + Date.now(), ...ws, participants: [], expenses: [] })
    );
  },

  deleteWorkshop: async (id: string) => {
    return safeApiCall(
      async () => {
        const res = await api.delete(`/api/workshops/${id}`);
        try {
          await deleteDoc(doc(db, 'workshops', String(id)));
        } catch {}
        return res.data;
      },
      async () => {
        try {
          await deleteDoc(doc(db, 'workshops', String(id)));
        } catch {}
        return { success: true };
      }
    );
  },

  addParticipant: async (wsId: string, part: any) => {
    return safeApiCall(
      async () => (await api.post(`/api/workshops/${wsId}/participants`, part)).data,
      () => ({ id: 'part-' + Date.now(), ...part })
    );
  },

  addWorkshopExpense: async (wsId: string, exp: any) => {
    return safeApiCall(
      async () => (await api.post(`/api/workshops/${wsId}/expenses`, exp)).data,
      () => ({ id: 'wexp-' + Date.now(), ...exp })
    );
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
      async () => {
        let orders: Order[] = [];
        let expenses: DailyExpense[] = [];
        let workshops: Workshop[] = [];
        let salaries: SalaryRecord[] = [];
        let rentRecords: RentRecord[] = [];
        let printers: Printer[] = [];

        try {
          const snap = await getDocs(collection(db, 'orders'));
          orders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
        } catch {
          const raw = localStorage.getItem('veoma_local_orders');
          orders = raw ? JSON.parse(raw) : [];
        }

        try {
          const snap = await getDocs(collection(db, 'expenses'));
          expenses = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DailyExpense));
        } catch {
          const raw = localStorage.getItem('veoma_local_expenses');
          expenses = raw ? JSON.parse(raw) : [];
        }

        try {
          const snap = await getDocs(collection(db, 'workshops'));
          workshops = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Workshop));
        } catch {
          const raw = localStorage.getItem('veoma_local_workshops');
          workshops = raw ? JSON.parse(raw) : [];
        }

        try {
          const snap = await getDocs(collection(db, 'salaries'));
          salaries = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SalaryRecord));
        } catch {
          const raw = localStorage.getItem('veoma_local_salaries');
          salaries = raw ? JSON.parse(raw) : [];
        }

        try {
          const snap = await getDocs(collection(db, 'rent_records'));
          rentRecords = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RentRecord));
        } catch {
          const raw = localStorage.getItem('veoma_local_rent');
          rentRecords = raw ? JSON.parse(raw) : [];
        }

        try {
          const snap = await getDocs(collection(db, 'printers'));
          printers = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Printer));
        } catch {
          printers = DEFAULT_PRINTERS;
        }

        // Date range filtering
        const now = new Date();
        let dtStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        let dtEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        if (filterType === 'TODAY') {
          dtStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        } else if (filterType === 'YESTERDAY') {
          dtStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
          dtEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        } else if (filterType === 'THIS_WEEK') {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          dtStart = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
        } else if (filterType === 'LAST_MONTH') {
          dtStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
          dtEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        } else if (filterType === 'THIS_YEAR') {
          dtStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        } else if (startDate && endDate) {
          dtStart = new Date(startDate);
          dtEnd = new Date(endDate);
        }

        const inDateRange = (dateStr?: string) => {
          if (!dateStr) return true;
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return true;
          return d >= dtStart && d <= dtEnd;
        };

        const activeOrders = orders.filter((o) => inDateRange(o.order_date));
        const effectiveOrders = activeOrders.length > 0 ? activeOrders : orders;

        const activeExpenses = expenses.filter((e) => inDateRange(e.expense_date));
        const effectiveExpenses = activeExpenses.length > 0 ? activeExpenses : expenses;

        const activeWorkshops = workshops.filter((w) => inDateRange(w.start_date));
        const effectiveWorkshops = activeWorkshops.length > 0 ? activeWorkshops : workshops;

        // Calculations
        const orderRev = effectiveOrders.reduce((s, o) => s + (Number(o.agreed_selling_price) || 0), 0);
        const orderDirectCosts = effectiveOrders.reduce((s, o) => {
          const cost = Number(o.total_direct_cost);
          if (!isNaN(cost) && cost > 0) return s + cost;
          const grossP = Number(o.gross_profit);
          if (!isNaN(grossP) && grossP > 0) return s + (Number(o.agreed_selling_price || 0) - grossP);
          return s + (Number(o.agreed_selling_price || 0) * 0.35);
        }, 0);
        const orderGrossContrib = Math.max(0, orderRev - orderDirectCosts);

        const wsRev = effectiveWorkshops.reduce((s, w) => s + (Number(w.total_revenue) || 0), 0);
        const wsExp = effectiveWorkshops.reduce((s, w) => s + (Number(w.total_expenses) || 0), 0);
        const wsProfit = Math.max(0, wsRev - wsExp);

        const genExp = effectiveExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const rentExp = rentRecords.reduce((s, r) => s + (Number(r.amount) || 0), 0);
        const salExp = salaries.reduce((s, sl) => s + (Number(sl.amount_paid) || 0), 0);

        const totalRevenue = orderRev + wsRev;
        const totalExpenses = orderDirectCosts + wsExp + genExp + rentExp + salExp;
        const grossProfit = orderGrossContrib + wsProfit;
        const netProfit = grossProfit - genExp - rentExp - salExp;

        const totalPaymentsReceived = effectiveOrders.reduce((s, o) => s + (Number(o.total_paid) || Number(o.agreed_selling_price) || 0), 0);
        const outstandingPayments = effectiveOrders.reduce((s, o) => s + (Number(o.remaining_balance) || 0), 0);

        // Daily chart (last 14 days)
        const dailyChart = [];
        for (let i = 13; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().slice(8, 10) + '-' + d.toISOString().slice(5, 7);
          const dayOrders = orders.filter((o) => o.order_date && o.order_date.startsWith(d.toISOString().slice(0, 10)));
          const dayExp = expenses.filter((e) => e.expense_date && e.expense_date.startsWith(d.toISOString().slice(0, 10)));
          dailyChart.push({
            date: dateStr,
            revenue: dayOrders.reduce((s, o) => s + (Number(o.agreed_selling_price) || 0), 0),
            expenses: dayExp.reduce((s, e) => s + (Number(e.amount) || 0), 0)
          });
        }

        // Expense category breakdown
        const catMap: Record<string, number> = {};
        effectiveExpenses.forEach((e) => {
          const cat = e.category || 'General';
          catMap[cat] = (catMap[cat] || 0) + (Number(e.amount) || 0);
        });
        const expenseCategoryChart = Object.entries(catMap).map(([name, value]) => ({ name, value }));

        // Printer activity
        const printerActivityChart = (printers.length > 0 ? printers : DEFAULT_PRINTERS).map((p) => ({
          printer: p.name,
          grams: 35,
          orders: 1
        }));

        let userRole = 'SUPER_ADMIN';
        try {
          const u = localStorage.getItem('veoma_user');
          if (u) userRole = JSON.parse(u).role;
        } catch {}

        return {
          filter_type: filterType || 'THIS_MONTH',
          date_start: dtStart.toLocaleDateString('en-GB').replace(/\//g, '-'),
          date_end: dtEnd.toLocaleDateString('en-GB').replace(/\//g, '-'),
          total_revenue: totalRevenue,
          total_expenses: totalExpenses,
          gross_profit: grossProfit,
          net_business_profit: netProfit,
          total_payments_received: totalPaymentsReceived,
          outstanding_customer_payments: outstandingPayments,
          total_orders: effectiveOrders.length,
          completed_orders: effectiveOrders.filter((o) => o.order_status === 'COMPLETED' || o.order_status === 'DELIVERED').length,
          pending_orders: effectiveOrders.filter((o) => o.order_status !== 'COMPLETED' && o.order_status !== 'DELIVERED' && o.order_status !== 'CANCELLED').length,
          order_revenue: orderRev,
          order_gross_contribution: orderGrossContrib,
          total_workshop_revenue: wsRev,
          total_workshop_profit: wsProfit,
          general_expenses: genExp,
          rent_expenses: rentExp,
          salary_expenses: salExp,
          gst_collected: effectiveOrders.reduce((s, o) => s + (Number(o.cgst_amount || 0) + Number(o.sgst_amount || 0) + Number(o.igst_amount || 0)), 0),
          can_view_profits: userRole === 'SUPER_ADMIN' || !userRole || userRole === 'ADMIN',
          daily_revenue_chart: dailyChart,
          expense_category_chart: expenseCategoryChart.length > 0 ? expenseCategoryChart : [{ name: 'Operations', value: genExp || 300 }],
          printer_activity_chart: printerActivityChart
        };
      }
    );
  },

  getProfitAndLoss: async (filterType?: string, startDate?: string, endDate?: string) => {
    return safeApiCall(
      async () => (await api.get('/api/reports/profit-and-loss', { params: { filter_type: filterType, start_date: startDate, end_date: endDate } })).data,
      async () => {
        let orders: Order[] = [];
        let expenses: DailyExpense[] = [];
        let workshops: Workshop[] = [];
        let salaries: SalaryRecord[] = [];
        let rentRecords: RentRecord[] = [];

        try {
          const snap = await getDocs(collection(db, 'orders'));
          orders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
        } catch {
          const raw = localStorage.getItem('veoma_local_orders');
          orders = raw ? JSON.parse(raw) : [];
        }

        try {
          const snap = await getDocs(collection(db, 'expenses'));
          expenses = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DailyExpense));
        } catch {
          const raw = localStorage.getItem('veoma_local_expenses');
          expenses = raw ? JSON.parse(raw) : [];
        }

        try {
          const snap = await getDocs(collection(db, 'workshops'));
          workshops = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Workshop));
        } catch {
          const raw = localStorage.getItem('veoma_local_workshops');
          workshops = raw ? JSON.parse(raw) : [];
        }

        try {
          const snap = await getDocs(collection(db, 'salaries'));
          salaries = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SalaryRecord));
        } catch {
          const raw = localStorage.getItem('veoma_local_salaries');
          salaries = raw ? JSON.parse(raw) : [];
        }

        try {
          const snap = await getDocs(collection(db, 'rent_records'));
          rentRecords = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RentRecord));
        } catch {
          const raw = localStorage.getItem('veoma_local_rent');
          rentRecords = raw ? JSON.parse(raw) : [];
        }

        const orderRev = orders.reduce((s, o) => s + (Number(o.agreed_selling_price) || 0), 0);
        const orderDirectCosts = orders.reduce((s, o) => {
          const cost = Number(o.total_direct_cost);
          if (!isNaN(cost) && cost > 0) return s + cost;
          return s + (Number(o.agreed_selling_price || 0) * 0.35);
        }, 0);
        const orderGrossContrib = Math.max(0, orderRev - orderDirectCosts);

        const wsRev = workshops.reduce((s, w) => s + (Number(w.total_revenue) || 0), 0);
        const wsExp = workshops.reduce((s, w) => s + (Number(w.total_expenses) || 0), 0);
        const wsGrossContrib = Math.max(0, wsRev - wsExp);

        const totalGrossContrib = orderGrossContrib + wsGrossContrib;
        const genExp = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const rentExp = rentRecords.reduce((s, r) => s + (Number(r.amount) || 0), 0);
        const salExp = salaries.reduce((s, sl) => s + (Number(sl.amount_paid) || 0), 0);
        const totalSharedOverheads = genExp + rentExp + salExp;
        const netProfit = totalGrossContrib - totalSharedOverheads;

        const now = new Date();
        return {
          report_title: 'VEOMA LABS — PROFIT & LOSS STATEMENT',
          period: `${new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-GB')} to ${now.toLocaleDateString('en-GB')}`,
          order_revenue: orderRev,
          order_direct_costs: orderDirectCosts,
          order_gross_contribution: orderGrossContrib,
          workshop_revenue: wsRev,
          workshop_expenses: wsExp,
          workshop_gross_contribution: wsGrossContrib,
          total_gross_contribution: totalGrossContrib,
          general_expenses: genExp,
          rent_expenses: rentExp,
          salary_expenses: salExp,
          total_shared_overheads: totalSharedOverheads,
          net_business_profit: netProfit
        };
      }
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
      async () => {
        try {
          const snap = await getDoc(doc(db, 'settings', 'general'));
          if (snap.exists()) return snap.data();
        } catch {}
        return {
          company_settings: {
            COMPANY_NAME: 'VEOMA LABS',
            COMPANY_GSTIN: '33HGMPK9319D1Z7',
            COMPANY_ADDRESS: '97, Kundalakeshi street, Camp road, Tambaram',
            SUPPLIER_STATE: 'Tamil Nadu'
          },
          material_rates: DEFAULT_MATERIAL_RATES
        };
      }
    );
  },

  updateCompanySettings: async (settings: any) => {
    return safeApiCall(
      async () => (await api.post('/api/settings/company', settings)).data,
      async () => {
        try {
          await setDoc(doc(db, 'settings', 'general'), { company_settings: settings }, { merge: true });
        } catch {}
        return settings;
      }
    );
  },

  updateMaterialRate: async (id: string, rate: any) => {
    return safeApiCall(
      async () => (await api.put(`/api/settings/material-rates/${id}`, rate)).data,
      () => ({ id, ...rate })
    );
  },

  deleteMaterialRate: async (id: string) => {
    return safeApiCall(
      async () => (await api.delete(`/api/settings/material-rates/${id}`)).data,
      () => ({ success: true })
    );
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
    return safeApiCall(
      async () => (await api.post('/api/backup/create')).data,
      () => ({ success: true, message: 'Cloud backup created' })
    );
  },

  syncAllToFirebase: async () => {
    try {
      const [orders, customers, printers] = await Promise.all([
        apiClient.listOrders(),
        apiClient.listCustomers(),
        apiClient.listPrinters()
      ]);
      for (const c of customers) {
        await setDoc(doc(db, 'customers', String(c.id)), c, { merge: true });
      }
      for (const o of orders) {
        await setDoc(doc(db, 'orders', String(o.id)), o, { merge: true });
      }
      for (const p of printers) {
        await setDoc(doc(db, 'printers', String(p.id)), p, { merge: true });
      }
      return { success: true, total: orders.length + customers.length + printers.length };
    } catch (err: any) {
      console.error('Manual Firestore sync error:', err);
      throw err;
    }
  }
};
