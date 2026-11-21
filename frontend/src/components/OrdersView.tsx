import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Search, Filter, Plus, ChevronRight, Eye,
  CreditCard, Scale, CheckCircle2, Clock, AlertTriangle, Trash2, FileText, X, Users
} from 'lucide-react';
import { apiClient } from '../services/api';
import { Order, User } from '../types';
import { formatCurrency, formatDate, formatDateTime, formatWeight } from '../utils/formatters';
import { PaymentModal } from './PaymentModal';
import { ReconcileModal } from './ReconcileModal';
import { InvoiceModal } from './InvoiceModal';

interface OrdersViewProps {
  currentUser: User;
  onOpenCreateOrder: () => void;
  onNavigateToCustomerRegistry?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ currentUser, onOpenCreateOrder, onNavigateToCustomerRegistry }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Selected order for detail modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listOrders({
        search: search.trim() || undefined,
        order_status: statusFilter || undefined,
        payment_status: paymentFilter || undefined
      });
      setOrders(data);
      if (selectedOrder) {
        const refreshed = data.find((o) => o.id === selectedOrder.id);
        if (refreshed) setSelectedOrder(refreshed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, paymentFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const updated = await apiClient.updateOrderStatus(orderId, newStatus);
      setOrders(orders.map((o) => (o.id === orderId ? updated : o)));
      if (selectedOrder?.id === orderId) setSelectedOrder(updated);
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order? This action will be audited.')) return;
    try {
      await apiClient.deleteOrder(orderId);
      setSelectedOrder(null);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete order');
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: 'bg-slate-100', text: 'text-slate-700' },
      DESIGNING: { bg: 'bg-purple-50', text: 'text-purple-700' },
      READY_FOR_PRINTING: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
      PRINTING: { bg: 'bg-blue-50', text: 'text-blue-700' },
      POST_PROCESSING: { bg: 'bg-cyan-50', text: 'text-cyan-700' },
      QUALITY_CHECK: { bg: 'bg-amber-50', text: 'text-amber-700' },
      COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
      SHIPPED: { bg: 'bg-teal-50', text: 'text-teal-700' },
      DELIVERED: { bg: 'bg-green-50', text: 'text-green-800' },
      CANCELLED: { bg: 'bg-rose-50', text: 'text-rose-700' },
    };
    const c = map[status] || { bg: 'bg-slate-100', text: 'text-slate-700' };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.text}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const getPaymentBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      UNPAID: { bg: 'bg-rose-100', text: 'text-rose-700' },
      PARTIALLY_PAID: { bg: 'bg-amber-100', text: 'text-amber-800' },
      FULLY_PAID: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
      REFUNDED: { bg: 'bg-slate-100', text: 'text-slate-700' },
    };
    const c = map[status] || { bg: 'bg-slate-100', text: 'text-slate-700' };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.text}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Order ID, model, customer name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
            />
          </div>
          <button type="submit" className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Customer Registry Option with Logo */}
          <button
            onClick={onNavigateToCustomerRegistry}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-slate-300 shadow-xs transition cursor-pointer"
            title="Navigate to Customer Registry & Registration"
          >
            <Users size={15} className="text-blue-600" />
            <span>Customer Registry</span>
          </button>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
          >
            <option value="">All Production Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="DESIGNING">Designing</option>
            <option value="READY_FOR_PRINTING">Ready for Printing</option>
            <option value="PRINTING">Printing</option>
            <option value="POST_PROCESSING">Post-processing</option>
            <option value="QUALITY_CHECK">Quality Check</option>
            <option value="COMPLETED">Completed</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
          >
            <option value="">All Payment Statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="FULLY_PAID">Fully Paid</option>
          </select>

          <button
            onClick={onOpenCreateOrder}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
          >
            <Plus size={15} />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Order ID & Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Model / Product</th>
                <th className="px-4 py-3">Direct Cost</th>
                <th className="px-4 py-3">Selling Price</th>
                <th className="px-4 py-3">Paid / Remaining</th>
                <th className="px-4 py-3">Production Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No orders found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setSelectedOrder(o)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{o.order_id}</div>
                      <div className="text-[10px] text-slate-400">{formatDate(o.order_date)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{o.customer_name}</div>
                      <div className="text-[10px] text-slate-400">{o.customer_phone}</div>
                      {o.customer_gstin && (
                        <span className="inline-block px-1.5 py-0.5 mt-0.5 text-[9px] font-mono font-medium bg-blue-50 text-blue-700 rounded border border-blue-200">
                          GST: {o.customer_gstin}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 max-w-[160px] truncate" title={o.model_name}>
                        {o.model_name}
                      </div>
                      <div className="text-[10px] text-slate-400">Qty: {o.quantity}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-600">
                      {formatCurrency(o.total_direct_cost)}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {formatCurrency(o.agreed_selling_price)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-emerald-600">{formatCurrency(o.total_paid)}</div>
                      <div className="text-[10px] font-medium text-amber-600">
                        Bal: {formatCurrency(o.remaining_balance)}
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(o.order_status)}</td>
                    <td className="px-4 py-3">{getPaymentBadge(o.payment_status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInvoiceOrder(o);
                            setInvoiceModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded font-bold text-[11px] flex items-center space-x-1 border border-blue-200 transition cursor-pointer"
                          title="View & Print Official Bill"
                        >
                          <FileText size={12} />
                          <span>Bill</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(o.id);
                          }}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Order"
                        >
                          <Trash2 size={15} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(o);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail View Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-6 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-600 text-white">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold">{selectedOrder.order_id}</h3>
                    {getStatusBadge(selectedOrder.order_status)}
                    {getPaymentBadge(selectedOrder.payment_status)}
                  </div>
                  <p className="text-xs text-slate-400">
                    Placed on {formatDate(selectedOrder.order_date)} • Expected: {formatDate(selectedOrder.expected_delivery_date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {isSuperAdmin && (
                  <button
                    onClick={() => handleDeleteOrder(selectedOrder.id)}
                    className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-slate-800 rounded-lg transition"
                    title="Delete Order (Super Admin)"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
              {/* Quick Status Action Controls */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-700 uppercase tracking-wide">
                  Change Production Status:
                </span>
                <select
                  value={selectedOrder.order_status}
                  onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                  className="p-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                >
                  <option value="PENDING">Pending</option>
                  <option value="DESIGNING">Designing</option>
                  <option value="READY_FOR_PRINTING">Ready for Printing</option>
                  <option value="PRINTING">Printing</option>
                  <option value="POST_PROCESSING">Post-processing</option>
                  <option value="QUALITY_CHECK">Quality Check</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <div className="flex items-center space-x-2 ml-auto">
                  <button
                    onClick={() => {
                      setInvoiceOrder(selectedOrder);
                      setInvoiceModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
                    title="View and Print Official Bill (Veoma Labs)"
                  >
                    <FileText size={14} />
                    <span>View / Print Bill</span>
                  </button>

                  <button
                    onClick={() => setPaymentModalOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    <CreditCard size={14} />
                    <span>+ Record Payment</span>
                  </button>
                  <button
                    onClick={() => setReconcileModalOpen(true)}
                    className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded font-semibold flex items-center space-x-1"
                  >
                    <Scale size={14} />
                    <span>Reconcile Consumption</span>
                  </button>
                </div>
              </div>

              {/* Customer & Product Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer card */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Customer Details
                  </h4>
                  <p className="text-sm font-bold text-slate-900">{selectedOrder.customer_name}</p>
                  <p className="text-slate-600">Phone: {selectedOrder.customer_phone}</p>
                  {selectedOrder.customer_gstin && (
                    <p className="text-slate-600">GSTIN: <span className="font-mono font-bold text-slate-800">{selectedOrder.customer_gstin}</span></p>
                  )}
                  {selectedOrder.place_of_supply && (
                    <p className="text-slate-600">Place of Supply: {selectedOrder.place_of_supply}</p>
                  )}
                  {onNavigateToCustomerRegistry && (
                    <button
                      onClick={() => {
                        setSelectedOrder(null);
                        onNavigateToCustomerRegistry();
                      }}
                      className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1 transition cursor-pointer"
                    >
                      <Users size={13} />
                      <span>Open Customer Registry & Records →</span>
                    </button>
                  )}
                </div>

                {/* Product / Model card */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Model & Order Description
                  </h4>
                  <p className="text-sm font-bold text-blue-900">{selectedOrder.model_name}</p>
                  <p className="text-slate-600">Quantity: {selectedOrder.quantity} unit(s)</p>
                  {selectedOrder.description && (
                    <p className="text-slate-500 italic">{selectedOrder.description}</p>
                  )}
                </div>
              </div>

              {/* Production Items Breakdown */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Production Specifications & Filament Deduction
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-500 font-semibold text-[11px]">
                      <tr>
                        <th className="p-2.5">Material</th>
                        <th className="p-2.5">Model Wt</th>
                        <th className="p-2.5">Wastage (10%)</th>
                        <th className="p-2.5">Total Est</th>
                        <th className="p-2.5">Actual Weighed</th>
                        <th className="p-2.5">Base Cost</th>
                        <th className="p-2.5">Post-Proc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedOrder.production_items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-800">{item.material_type}</td>
                          <td className="p-2.5">{item.model_weight_grams} g</td>
                          <td className="p-2.5">
                            {((item.model_weight_grams * (item.wastage_percentage / 100))).toFixed(1)} g ({item.wastage_percentage}%)
                          </td>
                          <td className="p-2.5 font-bold text-blue-800">{item.total_estimated_grams} g</td>
                          <td className="p-2.5 font-semibold text-emerald-700">
                            {item.actual_consumed_grams ? `${item.actual_consumed_grams} g (Reconciled)` : 'Pending Weighing'}
                          </td>
                          <td className="p-2.5">{formatCurrency(item.production_cost)}</td>
                          <td className="p-2.5">
                            {item.post_processing_required ? formatCurrency(item.post_processing_cost) : 'No'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation Audit Card */}
              <div className="bg-slate-900 text-slate-100 p-5 rounded-xl space-y-4 shadow-md">
                <h4 className="font-bold text-cyan-400 uppercase tracking-wider text-xs">
                  Financial Breakdown & Profitability (Confirmed Formula)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Base Production:</span>
                    <span className="font-bold text-white">{formatCurrency(selectedOrder.base_production_cost)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Post-Processing:</span>
                    <span className="font-bold text-white">{formatCurrency(selectedOrder.post_processing_cost)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Designing Cost:</span>
                    <span className="font-bold text-white">{formatCurrency(selectedOrder.designing_cost)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Courier & Packing:</span>
                    <span className="font-bold text-white">
                      {formatCurrency(Number(selectedOrder.courier_charge) + Number(selectedOrder.packing_cost))}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div>
                    <span className="text-slate-400 text-xs block">Total Direct Order Cost:</span>
                    <span className="font-bold text-rose-400">{formatCurrency(selectedOrder.total_direct_cost)}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs block">Agreed Selling Price:</span>
                    <span className="font-bold text-white text-base">{formatCurrency(selectedOrder.agreed_selling_price)}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs block">Order Profit Before Overheads:</span>
                    <span className="font-bold text-emerald-400 text-base">{formatCurrency(selectedOrder.gross_profit)}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs block">Profit Margin:</span>
                    <span className="font-bold text-cyan-300 text-base">{selectedOrder.profit_margin_pct}%</span>
                  </div>
                </div>

                {selectedOrder.gst_applicable && (
                  <div className="border-t border-slate-800 pt-2 text-[11px] text-slate-300 flex justify-between">
                    <span>GST Applicable ({selectedOrder.place_of_supply}):</span>
                    <span>
                      CGST: {formatCurrency(selectedOrder.cgst_amount)} • SGST: {formatCurrency(selectedOrder.sgst_amount)} • IGST: {formatCurrency(selectedOrder.igst_amount)} • Invoice Total: <strong>{formatCurrency(selectedOrder.total_invoice_amount)}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Multi-Payment History */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Payment Collection History
                  </h4>
                  <span className="text-xs font-bold text-amber-700">
                    Remaining Customer Balance: {formatCurrency(selectedOrder.remaining_balance)}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-500 font-semibold text-[11px]">
                      <tr>
                        <th className="p-2.5">Payment Code</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Amount</th>
                        <th className="p-2.5">Method</th>
                        <th className="p-2.5">Reference ID</th>
                        <th className="p-2.5">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedOrder.payments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400">
                            No payment entries recorded yet.
                          </td>
                        </tr>
                      ) : (
                        selectedOrder.payments.map((pay) => (
                          <tr key={pay.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-800">{pay.payment_code}</td>
                            <td className="p-2.5">{formatDateTime(pay.payment_date)}</td>
                            <td className="p-2.5 font-bold text-emerald-600">{formatCurrency(pay.amount)}</td>
                            <td className="p-2.5 font-semibold text-slate-700">{pay.payment_method}</td>
                            <td className="p-2.5 text-slate-500">{pay.transaction_ref || '-'}</td>
                            <td className="p-2.5 text-slate-500">{pay.notes || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Sub-Modal */}
      <PaymentModal
        order={selectedOrder}
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onPaymentSuccess={fetchOrders}
      />

      {/* Reconcile Sub-Modal */}
      <ReconcileModal
        order={selectedOrder}
        isOpen={reconcileModalOpen}
        onClose={() => setReconcileModalOpen(false)}
        onReconcileSuccess={fetchOrders}
      />

      {/* Official Bill / Invoice Modal (Veoma Labs Format) */}
      <InvoiceModal
        order={invoiceOrder}
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
      />
    </div>
  );
};
