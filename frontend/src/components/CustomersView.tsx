import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Phone, Mail, MapPin, ShoppingBag, Eye, X } from 'lucide-react';
import { apiClient } from '../services/api';
import { Customer } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [customerType, setCustomerType] = useState('INDIVIDUAL');
  const [notes, setNotes] = useState('');

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

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createCustomer({
        name,
        phone,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        gstin: gstin.trim() || undefined,
        customer_type: customerType,
        notes: notes.trim() || undefined
      });
      setAddModalOpen(false);
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setGstin('');
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add customer');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header and Search */}
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

        <button
          onClick={() => setAddModalOpen(true)}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
        >
          <Plus size={15} />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Customer Cards Grid */}
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
                <Phone size={13} className="text-slate-400" />
                <span>{c.phone}</span>
              </div>
              {c.email && (
                <div className="flex items-center space-x-2">
                  <Mail size={13} className="text-slate-400" />
                  <span className="truncate">{c.email}</span>
                </div>
              )}
              {c.address && (
                <div className="flex items-center space-x-2">
                  <MapPin size={13} className="text-slate-400" />
                  <span className="truncate">{c.address}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-blue-600 font-semibold">
              <span>View Order History</span>
              <span>→</span>
            </div>
          </div>
        ))}
      </div>

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
              <button
                onClick={() => setCustomerDetails(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Add New Customer</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="p-5 space-y-3 text-xs">
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
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
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
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
