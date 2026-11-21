import React, { useState, useEffect } from 'react';
import {
  Users, Search, Plus, Phone, Mail, MapPin, ShoppingBag, Eye, X,
  UserPlus, CheckCircle2, Building, User as UserIcon, Shield, FileCheck, Trash2
} from 'lucide-react';
import { apiClient } from '../services/api';
import { Customer } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface CustomersViewProps {
  initialOpenRegister?: boolean;
  onRegisterClosed?: () => void;
  onNavigateToOrders?: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  initialOpenRegister = false,
  onRegisterClosed,
  onNavigateToOrders
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'registry' | 'register'>('registry');

  // Customer Detail Modal State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(initialOpenRegister);

  // Form State (used for both in-page form and modal)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [customerType, setCustomerType] = useState('INDIVIDUAL');
  const [notes, setNotes] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listCustomers(search.trim() || undefined);
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (initialOpenRegister) {
      setAddModalOpen(true);
    }
  }, [initialOpenRegister]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleViewCustomer = async (id: string) => {
    setSelectedCustomerId(id);
    try {
      const details = await apiClient.getCustomerDetails(id);
      setCustomerDetails(details);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent, isModal = false) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormSuccessMessage(null);
    try {
      const created = await apiClient.createCustomer({
        name,
        phone,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        gstin: gstin.trim() ? gstin.trim().toUpperCase() : undefined,
        customer_type: customerType,
        notes: notes.trim() || undefined
      });

      // Clear form
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setGstin('');
      setNotes('');
      setCustomerType('INDIVIDUAL');

      if (isModal) {
        setAddModalOpen(false);
        if (onRegisterClosed) onRegisterClosed();
      }

      setFormSuccessMessage(`Customer "${created.name}" (${created.customer_code}) successfully registered!`);
      setActiveSubTab('registry');
      fetchCustomers();

      setTimeout(() => setFormSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to register customer');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (e: React.MouseEvent, id: string, custName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete customer "${custName}"? This action cannot be undone.`)) return;
    try {
      await apiClient.deleteCustomer(id);
      fetchCustomers();
      if (customerDetails && customerDetails.customer?.id === id) {
        setCustomerDetails(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || 'Failed to delete customer');
    }
  };

  const totalRegistered = customers.length;
  const businessClients = customers.filter(c => c.customer_type === 'BUSINESS').length;
  const individualClients = customers.filter(c => c.customer_type === 'INDIVIDUAL').length;

  return (
    <div className="space-y-5">
      {/* Page Title & Navigation Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
            <Users size={24} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-900">Customer Registry & Registration</h2>
              <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {totalRegistered} Registered
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Manage client records, tax GSTINs, addresses, and customer profiles for 3D printing orders
            </p>
          </div>
        </div>

        {/* View Toggle and Quick Action */}
        <div className="flex items-center space-x-2">
          <div className="bg-slate-100 p-1 rounded-lg flex items-center space-x-1 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('registry')}
              className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 cursor-pointer ${
                activeSubTab === 'registry'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users size={14} />
              <span>Customer Registry</span>
            </button>
            <button
              onClick={() => setActiveSubTab('register')}
              className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 cursor-pointer ${
                activeSubTab === 'register'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus size={14} />
              <span>Customer Registration</span>
            </button>
          </div>

          <button
            onClick={() => setAddModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus size={15} />
            <span>+ Quick Register</span>
          </button>

          {onNavigateToOrders && (
            <button
              onClick={onNavigateToOrders}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-slate-300 transition cursor-pointer"
            >
              <ShoppingBag size={14} className="text-blue-600" />
              <span>← Back to Orders</span>
            </button>
          )}
        </div>
      </div>

      {/* Success alert notice */}
      {formSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center space-x-2 shadow-xs">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <span>{formSuccessMessage}</span>
        </div>
      )}

      {/* SUB-VIEW 1: REGISTRATION FORM PAGE */}
      {activeSubTab === 'register' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 max-w-3xl">
          <div className="border-b border-slate-100 pb-4 mb-5 flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Register New Customer</h3>
              <p className="text-xs text-slate-500">Fill in the customer information to register them in the system.</p>
            </div>
          </div>

          <form onSubmit={(e) => handleSaveCustomer(e, false)} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kannan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. ramesh@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer Type
                </label>
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium focus:bg-white"
                >
                  <option value="INDIVIDUAL">Individual Customer (Consumer)</option>
                  <option value="BUSINESS">Commercial / Business Entity</option>
                  <option value="INSTITUTION">College / Educational Institution</option>
                  <option value="OTHER">Other Client Type</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  GSTIN (For B2B Tax Invoicing)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 33AAAAA0000A1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg uppercase tracking-wider focus:bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">State code 33 for Tamil Nadu</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer Notes / Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Referred via Instagram, bulk enquiry"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Full Shipping & Billing Address
              </label>
              <textarea
                rows={3}
                placeholder="Door No., Street, Area, City, Tamil Nadu, Pincode"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setActiveSubTab('registry')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition"
              >
                Back to Registry
              </button>
              <button
                type="submit"
                disabled={formSubmitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition flex items-center space-x-2"
              >
                <UserPlus size={15} />
                <span>{formSubmitting ? 'Registering...' : 'Register Customer'}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* SUB-VIEW 2: CUSTOMER REGISTRY DIRECTORY */
        <>
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                <Users size={18} />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Clients</span>
                <p className="text-lg font-extrabold text-slate-900">{totalRegistered}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
                <Building size={18} />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Business & B2B</span>
                <p className="text-lg font-extrabold text-slate-900">{businessClients}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <UserIcon size={18} />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Individual Consumers</span>
                <p className="text-lg font-extrabold text-slate-900">{individualClients}</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <form onSubmit={handleSearch} className="flex items-center space-x-2 flex-1 min-w-[240px] max-w-md">
              <div className="relative w-full">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by customer name, phone, code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                />
              </div>
              <button type="submit" className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold">
                Search
              </button>
            </form>

            <span className="text-xs text-slate-500">
              Showing <strong className="text-slate-800">{customers.length}</strong> registered customer profiles
            </span>
          </div>

          {/* Customer Cards Grid */}
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
              Loading customer registry...
            </div>
          ) : customers.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Users size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Customers Found</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No customer profiles match your search criteria. Register a new customer to start.
              </p>
              <button
                onClick={() => setActiveSubTab('register')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-1.5"
              >
                <UserPlus size={14} />
                <span>Register First Customer</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleViewCustomer(c.id)}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                        {c.customer_code}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{c.name}</h3>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">
                      {c.customer_type}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <Phone size={13} className="text-slate-400 flex-shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                    {c.email && (
                      <div className="flex items-center space-x-2">
                        <Mail size={13} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                    {c.gstin && (
                      <div className="flex items-center space-x-2">
                        <FileCheck size={13} className="text-slate-400 flex-shrink-0" />
                        <span className="font-mono text-[11px] text-slate-700">GST: {c.gstin}</span>
                      </div>
                    )}
                    {c.address && (
                      <div className="flex items-center space-x-2">
                        <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{c.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-blue-600 font-semibold flex items-center space-x-1">
                      <span>View Order History</span>
                      <span>→</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCustomer(e, c.id, c.name)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete Customer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Customer Detail & Transaction History Modal */}
      {customerDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-6">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">{customerDetails.customer.name}</h3>
                <p className="text-xs text-slate-400">
                  {customerDetails.customer.customer_code} • {customerDetails.customer.phone}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={(e) => handleDeleteCustomer(e, customerDetails.customer.id, customerDetails.customer.name)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 flex items-center space-x-1 transition cursor-pointer"
                  title="Delete this customer"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => setCustomerDetails(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              {/* Financial Metrics Cards for this Customer */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Orders</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">{customerDetails.total_orders}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Order Value</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">{formatCurrency(customerDetails.total_order_value)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Payments Paid</span>
                  <p className="text-lg font-bold text-emerald-600 mt-0.5">{formatCurrency(customerDetails.total_payments)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Outstanding Balance</span>
                  <p className="text-lg font-bold text-amber-600 mt-0.5">{formatCurrency(customerDetails.outstanding_balance)}</p>
                </div>
              </div>

              {/* Order History Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Orders Placed by Customer
                </h4>
                {customerDetails.orders.length === 0 ? (
                  <p className="text-slate-500 italic p-3 bg-slate-50 rounded-lg">No orders placed by this customer yet.</p>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-500 font-semibold text-[11px]">
                        <tr>
                          <th className="p-2.5">Order ID</th>
                          <th className="p-2.5">Model Name</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Price</th>
                          <th className="p-2.5">Paid</th>
                          <th className="p-2.5">Remaining</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {customerDetails.orders.map((ord: any) => (
                          <tr key={ord.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-900">{ord.order_id}</td>
                            <td className="p-2.5 font-medium text-slate-800">{ord.model_name}</td>
                            <td className="p-2.5 text-slate-500">{formatDate(ord.order_date)}</td>
                            <td className="p-2.5">{ord.order_status}</td>
                            <td className="p-2.5 font-bold text-slate-900">{formatCurrency(ord.agreed_selling_price)}</td>
                            <td className="p-2.5 font-semibold text-emerald-600">{formatCurrency(ord.total_paid)}</td>
                            <td className="p-2.5 font-semibold text-amber-600">{formatCurrency(ord.remaining_balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users size={16} className="text-blue-400" />
                <h3 className="text-sm font-bold">Register New Customer</h3>
              </div>
              <button
                onClick={() => {
                  setAddModalOpen(false);
                  if (onRegisterClosed) onRegisterClosed();
                }}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => handleSaveCustomer(e, true)} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kannan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. ramesh@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Type</label>
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                >
                  <option value="INDIVIDUAL">Individual Customer</option>
                  <option value="BUSINESS">Commercial / Business Entity</option>
                  <option value="INSTITUTION">College / Educational Institution</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 33AAAAA0000A1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="w-full p-2 border border-slate-300 rounded-lg uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <textarea
                  rows={2}
                  placeholder="Full shipping address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddModalOpen(false);
                    if (onRegisterClosed) onRegisterClosed();
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm flex items-center space-x-1.5"
                >
                  <UserPlus size={14} />
                  <span>{formSubmitting ? 'Saving...' : 'Register Customer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
