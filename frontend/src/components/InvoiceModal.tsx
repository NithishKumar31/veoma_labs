import React, { useState, useEffect } from 'react';
import {
  X, Printer, Download, Edit3, Check, CheckCircle2, ArrowLeft,
  Plus, Trash2, RotateCcw, Sparkles, ShieldCheck
} from 'lucide-react';
import { apiClient } from '../services/api';
import { Order } from '../types';
import signatureImg from '../assets/signature.png';

interface InvoiceItem {
  id: string;
  description: string;
  qty: string;
  price: number;
  total: number;
}

interface InvoiceModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, isOpen, onClose }) => {
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  // Full Edit Access Mode
  const [isEditing, setIsEditing] = useState(true);

  // Editable Overrides - Company & Bank Details
  const [companyName, setCompanyName] = useState('VEOMA LABS');
  const [companyGstin, setCompanyGstin] = useState('33HGMPK9319D1Z7');
  const [companyAddress, setCompanyAddress] = useState('97, Kundalakeshi street, Camp road, Tambaram');
  const [paymentMethod, setPaymentMethod] = useState('CASH / BANK');
  const [accountNo, setAccountNo] = useState('282101000006844');
  const [accountName, setAccountName] = useState('GOKUL K');
  const [branchName, setBranchName] = useState('SELAIYUR, IOB');
  const [phone, setPhone] = useState('+91 70101 77745');
  const [email, setEmail] = useState('layercraft3dprint@gmail.com');
  const [signatoryName, setSignatoryName] = useState('GOKUL KITTUSAMY');
  const [signatoryTitle, setSignatoryTitle] = useState('Founder & CEO');
  const [notice, setNotice] = useState('***Seperate shipping charges will be applicable');

  // Editable Customer & Invoice Metadata
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');

  // Editable Line Items
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Editable Totals
  const [customGst, setCustomGst] = useState<number>(0);
  const [courierCharge, setCourierCharge] = useState<number>(0);

  // Initialize or re-populate data when order changes
  const populateData = (ord: Order, data?: any) => {
    const invNo = data?.invoice_no || `VOM${ord.order_id.replace(/[^0-9]/g, '').slice(-7) || '2026017'}`;
    const invDt = data?.invoice_date || new Date(ord.order_date).toLocaleDateString('en-GB');
    const cName = (data?.customer_name || ord.customer_name || 'CUSTOMER').toUpperCase();
    const cAddr = (data?.customer_address || ord.place_of_supply || 'TAMIL NADU').toUpperCase();
    const cGst = data?.customer_gstin || ord.customer_gstin || '';

    setInvoiceNo(invNo);
    setInvoiceDate(invDt);
    setCustomerName(cName);
    setCustomerAddress(cAddr);
    setCustomerGstin(cGst);

    if (data?.company_name) setCompanyName(data.company_name);
    if (data?.company_gstin) setCompanyGstin(data.company_gstin);
    if (data?.company_address) setCompanyAddress(data.company_address);
    if (data?.account_no) setAccountNo(data.account_no);
    if (data?.account_name) setAccountName(data.account_name);
    if (data?.branch_name) setBranchName(data.branch_name);
    if (data?.phone) setPhone(data.phone);
    if (data?.email) setEmail(data.email);
    if (data?.signatory_name) setSignatoryName(data.signatory_name);
    if (data?.signatory_title) setSignatoryTitle(data.signatory_title);
    if (data?.notice) setNotice(data.notice);

    const rawItems = data?.items || [
      ...(ord.designing_required && Number(ord.designing_cost) > 0 ? [{
        id: 'item-design',
        description: `Designing (${ord.model_name})`,
        qty: '1',
        price: Number(ord.designing_cost),
        total: Number(ord.designing_cost)
      }] : []),
      {
        id: 'item-print',
        description: `Printing(${ord.model_name})`,
        qty: String(ord.quantity || 1),
        price: Number(ord.agreed_selling_price) - (ord.designing_required ? Number(ord.designing_cost) : 0),
        total: Number(ord.agreed_selling_price) - (ord.designing_required ? Number(ord.designing_cost) : 0)
      }
    ];

    const mappedItems: InvoiceItem[] = rawItems.map((it: any, idx: number) => {
      const q = String(it.qty || '1').replace(/\s*job\s*/gi, '').trim() || '1';
      const p = Number(it.price) || 0;
      const t = Number(it.total) || (Number(q) * p);
      return {
        id: it.id || `item-${idx}-${Date.now()}`,
        description: it.description || '3D Printing Job',
        qty: q,
        price: p,
        total: t
      };
    });

    setItems(mappedItems);

    const initialGst = data?.gst ?? (Number(ord.cgst_amount || 0) + Number(ord.sgst_amount || 0) + Number(ord.igst_amount || 0));
    setCustomGst(initialGst);

    const initialCourier = data?.courier_charge ?? Number(ord.courier_charge || 0);
    setCourierCharge(initialCourier);
  };

  useEffect(() => {
    if (isOpen && order) {
      setLoading(true);
      apiClient.getOrderInvoiceData(order.id)
        .then((data) => {
          setInvoiceData(data);
          populateData(order, data);
        })
        .catch((err) => {
          console.error(err);
          populateData(order);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, order]);

  // Press Escape to exit modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  // Calculation summaries
  const subtotal = items.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
  const totalWithGst = subtotal + Number(customGst || 0);
  const grandTotal = totalWithGst + Number(courierCharge || 0);

  // Line item handlers
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    if (field === 'qty' || field === 'price') {
      const q = Number(item.qty) || 1;
      const p = Number(item.price) || 0;
      item.total = q * p;
    }
    updated[index] = item;
    setItems(updated);
  };

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: 'Custom Service / Additional 3D Part',
      qty: '1',
      price: 500,
      total: 500
    };
    setItems([...items, newItem]);
  };

  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) {
      alert('The invoice must have at least one line item.');
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleResetToOriginal = () => {
    if (window.confirm('Reset all edited fields back to the original order values?')) {
      populateData(order, invoiceData);
    }
  };

  const buildPayload = () => {
    return {
      order_id: order.order_id,
      company_name: companyName,
      company_gstin: companyGstin,
      company_address: companyAddress,
      payment_method: paymentMethod,
      account_no: accountNo,
      account_name: accountName,
      branch_name: branchName,
      phone,
      email,
      signatory_name: signatoryName,
      signatory_title: signatoryTitle,
      notice,
      invoice_no: invoiceNo,
      invoice_date: invoiceDate,
      customer_name: customerName,
      customer_address: customerAddress,
      customer_gstin: customerGstin || undefined,
      items: items.map((it) => ({
        description: it.description,
        qty: it.qty,
        price: Number(it.price) || 0,
        total: Number(it.total) || 0
      })),
      subtotal,
      gst: Number(customGst) || 0,
      total: totalWithGst,
      courier_charge: Number(courierCharge) || 0,
      grand_total: grandTotal
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const payload = buildPayload();
      await apiClient.downloadCustomInvoicePdf(payload);
    } catch (e) {
      console.error(e);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-start justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      
      {/* Floating Always-Visible Back Button (Fixed in Top-Left) */}
      <button
        onClick={onClose}
        className="fixed top-4 left-4 z-[60] bg-slate-900/95 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-2xl border border-slate-700 backdrop-blur-md transition-all hover:scale-105 cursor-pointer print:hidden group"
        title="Exit to Orders (Esc)"
      >
        <ArrowLeft size={16} className="text-cyan-400 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Orders</span>
      </button>

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[880px] my-4 sm:my-8 overflow-hidden flex flex-col print:border-none print:shadow-none print:my-0 print:max-w-none">
        
        {/* Sticky Top Control Bar (Hidden in Print) */}
        <div className="sticky top-0 z-30 bg-slate-900 text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shadow-md print:hidden">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 border border-slate-700 transition cursor-pointer shadow-xs"
              title="Back to Orders (Esc)"
            >
              <ArrowLeft size={15} className="text-cyan-400" />
              <span>Back</span>
            </button>

            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <h3 className="text-sm font-bold tracking-wide">Official Invoice & Bill Preview</h3>
              <span className="text-[11px] text-slate-400 font-mono">({invoiceNo})</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Full Edit Mode Toggle */}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-xs ${
                isEditing
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black ring-2 ring-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title="Toggle Edit Access for all invoice fields"
            >
              <Edit3 size={14} className={isEditing ? 'text-slate-950' : 'text-amber-400'} />
              <span>{isEditing ? 'Editing Enabled ✓' : 'Enable Edit Access'}</span>
            </button>

            {isEditing && (
              <button
                onClick={handleResetToOriginal}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                title="Reset all values back to original order data"
              >
                <RotateCcw size={13} className="text-cyan-400" />
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Bill</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <Download size={14} />
              <span>{downloading ? 'Generating...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Edit Access Mode Banner */}
        {isEditing && (
          <div className="bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-emerald-500/10 border-b border-amber-300/40 px-6 py-2 flex items-center justify-between text-xs text-slate-700 print:hidden">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-slate-900">Full Edit Access Granted:</span>
              <span className="text-slate-600">
                You can directly edit customer details, invoice numbers, prices, line items, and totals on the invoice below.
              </span>
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
              Print & PDF output updates in real-time
            </span>
          </div>
        )}

        {/* =========================================================================
            EXACT INVOICE SHEET (A4 PROPORTIONED CANVAS)
            ========================================================================= */}
        <div className="invoice-print-area bg-white text-slate-900 relative font-sans p-8 sm:p-12 overflow-hidden min-h-[1050px] flex flex-col justify-between select-text">
          
          {/* Top Geometric Blue Sliced Banner */}
          <div className="absolute top-0 left-0 right-0 h-28 pointer-events-none overflow-hidden">
            <svg
              className="w-full h-full"
              viewBox="0 0 800 120"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="dotPatternTop" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="#ffffff" opacity="0.3" />
                </pattern>
              </defs>

              {/* Main deep blue polygon */}
              <polygon points="0,0 800,0 800,35 340,75 0,120" fill="#1e3a8a" />
              
              {/* Secondary mid-blue polygon */}
              <polygon points="0,0 460,0 220,95 0,120" fill="#2563eb" />

              {/* Halftone / Dotted matrix on left facet */}
              <polygon points="30,10 320,10 160,95 0,115" fill="url(#dotPatternTop)" />
            </svg>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="relative z-10 pt-16">
            
            {/* Header: Left TO: & Right VEOMA LABS */}
            <div className="flex justify-between items-start mt-4 mb-8 gap-4">
              
              {/* LEFT: TO: Customer Details (Editable) */}
              <div className="w-1/2 pr-2 text-xs space-y-1">
                <span className="font-bold text-slate-900 text-sm block tracking-wide">TO:</span>
                
                {isEditing ? (
                  <div className="space-y-1.5 pt-1">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block print:hidden">Customer Name</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="CUSTOMER NAME"
                        className="w-full font-extrabold text-slate-950 text-xs tracking-wider uppercase p-1 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none print:border-none print:bg-transparent print:p-0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block print:hidden">Address / Location</label>
                      <textarea
                        rows={2}
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="CUSTOMER ADDRESS / CITY"
                        className="w-full font-semibold text-slate-800 text-[11px] uppercase p-1 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none resize-none print:border-none print:bg-transparent print:p-0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block print:hidden">Customer GSTIN (Optional)</label>
                      <input
                        type="text"
                        value={customerGstin}
                        onChange={(e) => setCustomerGstin(e.target.value)}
                        placeholder="GST No. (Optional)"
                        className="w-full font-mono font-bold text-slate-950 text-[11px] uppercase p-1 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none print:border-none print:bg-transparent print:p-0"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-extrabold text-slate-950 text-xs tracking-wider uppercase mt-1">
                      {customerName}
                    </p>
                    {customerAddress.split('\n').map((line: string, idx: number) => (
                      <p key={idx} className="font-semibold text-slate-800 text-[11px] uppercase leading-tight">
                        {line}
                      </p>
                    ))}
                    {customerGstin && (
                      <p className="font-bold text-slate-950 text-[11px] pt-1">
                        GST No. - <span className="font-mono">{customerGstin}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT: Company Name, INVOICE, Date & Banking Details (Editable) */}
              <div className="w-1/2 pl-2 text-right text-xs">
                
                {/* Veoma Labs Logo & Company Name */}
                <div className="flex items-center justify-end space-x-3 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-xl shadow-md select-none">
                    V
                  </div>
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="text-2xl font-black text-slate-950 tracking-wide uppercase text-right p-1 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none w-56 print:border-none print:bg-transparent print:p-0"
                      />
                    ) : (
                      <h1 className="text-2xl font-black text-slate-950 tracking-wide uppercase leading-none">
                        {companyName}
                      </h1>
                    )}
                    <p className="text-[11px] font-bold text-slate-700 tracking-[0.25em] uppercase text-right mt-0.5">
                      INVOICE
                    </p>
                  </div>
                </div>

                {/* Date & Invoice No */}
                <div className="text-[11px] text-slate-800 mt-2 space-y-1 font-medium">
                  <div className="flex items-center justify-end space-x-1">
                    <span>Invoice Date:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="font-semibold text-right p-0.5 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none w-28 print:border-none print:bg-transparent print:p-0"
                      />
                    ) : (
                      <span className="font-semibold">{invoiceDate}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-end space-x-1">
                    <span>Invoice no :</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={invoiceNo}
                        onChange={(e) => setInvoiceNo(e.target.value)}
                        className="font-semibold text-right p-0.5 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none w-36 font-mono print:border-none print:bg-transparent print:p-0"
                      />
                    ) : (
                      <span className="font-semibold">{invoiceNo}</span>
                    )}
                  </div>
                </div>

                {/* Company GST & Address */}
                <div className="text-[11px] text-slate-900 mt-2 space-y-1">
                  <div className="flex items-center justify-end space-x-1">
                    <span className="font-extrabold tracking-wide">GST No. -</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={companyGstin}
                        onChange={(e) => setCompanyGstin(e.target.value)}
                        className="font-mono font-extrabold text-right p-0.5 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none w-44 print:border-none print:bg-transparent print:p-0"
                      />
                    ) : (
                      <span className="font-mono font-extrabold">{companyGstin}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-end space-x-1">
                    <span className="font-medium text-slate-800">Address -</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        className="font-medium text-slate-800 text-right p-0.5 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none w-64 print:border-none print:bg-transparent print:p-0"
                      />
                    ) : (
                      <span className="font-medium text-slate-800 leading-tight">{companyAddress}</span>
                    )}
                  </div>
                </div>

                {/* Payment Method & Bank Account */}
                <div className="text-[11px] text-slate-900 mt-2 space-y-1">
                  <div className="flex items-center justify-end space-x-1">
                    <span className="font-extrabold">PAYMENT METHOD -</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="font-extrabold text-right p-0.5 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none w-32 print:border-none print:bg-transparent print:p-0"
                      />
                    ) : (
                      <span className="font-extrabold">{paymentMethod}</span>
                    )}
                    <span className="text-emerald-600 font-bold ml-1">✓</span>
                  </div>

                  <div className="flex items-center justify-end space-x-1">
                    <span className="text-slate-800 font-medium">Account No:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={accountNo}
                        onChange={(e) => setAccountNo(e.target.value)}
                        className="font-mono font-medium text-right p-0.5 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none w-44 print:border-none print:bg-transparent print:p-0"
                      />
                    ) : (
                      <span className="font-mono font-medium text-slate-800">{accountNo}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-end space-x-1">
                    <span className="text-slate-800 font-medium">Account Name:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        className="font-medium text-slate-800 text-right p-0.5 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none w-36 print:border-none print:bg-transparent print:p-0"
                      />
                    ) : (
                      <span className="font-medium text-slate-800">{accountName}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-end space-x-1">
                    <span className="text-slate-800 font-medium">Branch Name:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        className="font-medium text-slate-800 text-right p-0.5 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none w-36 print:border-none print:bg-transparent print:p-0"
                      />
                    ) : (
                      <span className="font-medium text-slate-800">{branchName}</span>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* =========================================================================
                TABLE SECTION (FULLY EDITABLE)
                ========================================================================= */}
            <div className="mt-8 mb-4">
              
              {/* Rounded Deep Blue Header Bar */}
              <div className="bg-[#1e3a8a] text-white rounded-full px-6 py-2.5 flex items-center justify-between text-xs font-extrabold tracking-wider shadow-sm">
                <span className="w-1/2 text-left uppercase">DESCRIPTION</span>
                <span className="w-1/6 text-left pl-4 uppercase">QTY</span>
                <span className="w-1/6 text-right pr-4 uppercase">PRICE</span>
                <span className="w-1/6 text-right uppercase">TOTAL</span>
                {isEditing && <span className="w-8 print:hidden"></span>}
              </div>

              {/* Line Items */}
              <div className="px-6 py-2 divide-y divide-slate-100 text-xs">
                {items.map((item, idx) => (
                  <div key={item.id} className="py-2 flex items-center justify-between font-medium text-slate-900 group">
                    
                    {/* Description */}
                    <div className="w-1/2 text-left pr-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="Item description"
                          className="w-full text-[12px] font-semibold text-slate-900 p-1 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none print:border-none print:bg-transparent print:p-0"
                        />
                      ) : (
                        <span className="text-[12px] font-semibold text-slate-900">{item.description}</span>
                      )}
                    </div>

                    {/* Qty */}
                    <div className="w-1/6 text-left pl-4 pr-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.qty}
                          onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                          placeholder="1"
                          className="w-16 text-[12px] font-medium text-slate-800 p-1 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none text-left print:border-none print:bg-transparent print:p-0"
                        />
                      ) : (
                        <span className="text-slate-800 font-medium text-[12px]">{item.qty}</span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="w-1/6 text-right pr-4 pl-2">
                      {isEditing ? (
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                          placeholder="0"
                          className="w-24 text-[12px] font-mono text-slate-900 p-1 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none text-right print:border-none print:bg-transparent print:p-0"
                        />
                      ) : (
                        <span className="font-mono text-[12px] text-slate-900">
                          {Number(item.price).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    {/* Total */}
                    <div className="w-1/6 text-right pl-2">
                      {isEditing ? (
                        <input
                          type="number"
                          value={item.total}
                          onChange={(e) => handleItemChange(idx, 'total', Number(e.target.value))}
                          placeholder="0"
                          className="w-24 text-[12px] font-mono font-semibold text-slate-950 p-1 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none text-right print:border-none print:bg-transparent print:p-0"
                        />
                      ) : (
                        <span className="font-mono font-semibold text-[12px] text-slate-950">
                          {Number(item.total).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    {/* Delete Item Button */}
                    {isEditing && (
                      <div className="w-8 text-right pl-2 print:hidden">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(idx)}
                          className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Remove this line item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Item Button (Shown in Edit Mode) */}
              {isEditing && (
                <div className="px-6 py-2 border-t border-slate-100 flex items-center justify-between print:hidden">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                  >
                    <Plus size={14} />
                    <span>+ Add Line Item</span>
                  </button>
                  <span className="text-[11px] text-slate-400">
                    Totals update automatically as you adjust quantities and prices
                  </span>
                </div>
              )}

              {/* Table Bottom Border */}
              <div className="border-b border-slate-300 mx-2 mt-1"></div>
            </div>

            {/* =========================================================================
                TOTALS & SUMMARY SECTION (RIGHT-ALIGNED & FULLY EDITABLE)
                ========================================================================= */}
            <div className="flex justify-end mt-4 mb-10 pr-6">
              <div className="w-80 space-y-2 text-xs">
                
                {/* SUB TOTAL */}
                <div className="flex justify-between items-center text-slate-800 font-semibold">
                  <span className="uppercase tracking-wider">SUB TOTAL</span>
                  <span className="font-mono text-slate-950">₹{Number(subtotal).toLocaleString('en-IN')}</span>
                </div>

                {/* GST (Editable) */}
                <div className="flex justify-between items-center text-slate-800 font-semibold">
                  <span className="uppercase tracking-wider">GST</span>
                  {isEditing ? (
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-500 font-mono">₹</span>
                      <input
                        type="number"
                        value={customGst}
                        onChange={(e) => setCustomGst(Number(e.target.value) || 0)}
                        className="w-24 font-mono text-slate-950 text-right p-0.5 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none text-xs print:border-none print:bg-transparent print:p-0"
                      />
                    </div>
                  ) : (
                    <span className="font-mono text-slate-950">₹{Number(customGst).toLocaleString('en-IN')}</span>
                  )}
                </div>

                {/* TOTAL */}
                <div className="flex justify-between items-center text-slate-950 font-bold text-sm pt-0.5">
                  <span className="uppercase tracking-wider">TOTAL</span>
                  <span className="font-mono">₹{Number(totalWithGst).toLocaleString('en-IN')}</span>
                </div>

                {/* Divider Line */}
                <div className="border-b border-slate-300 pt-1"></div>

                {/* Courier charge (Editable) */}
                <div className="flex justify-between items-center text-slate-800 font-semibold pt-1">
                  <span>Courier charge</span>
                  {isEditing ? (
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-500 font-mono">₹</span>
                      <input
                        type="number"
                        value={courierCharge}
                        onChange={(e) => setCourierCharge(Number(e.target.value) || 0)}
                        className="w-24 font-mono text-slate-950 text-right p-0.5 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none text-xs print:border-none print:bg-transparent print:p-0"
                      />
                    </div>
                  ) : (
                    <span className="font-mono text-slate-950">₹{Number(courierCharge).toLocaleString('en-IN')}</span>
                  )}
                </div>

                {/* GRAND TOTAL */}
                <div className="flex justify-between items-center text-slate-950 font-black text-base pt-1">
                  <span className="uppercase tracking-wide">GRAND TOTAL</span>
                  <span className="font-mono font-black text-blue-900">₹{Number(grandTotal).toLocaleString('en-IN')}</span>
                </div>

              </div>
            </div>

          </div>

          {/* =========================================================================
              FOOTER & SIGNATURE SECTION (EDITABLE)
              ========================================================================= */}
          <div className="relative z-10 flex justify-between items-end mt-8 pb-10 px-2 gap-4">
            
            {/* Left Contact & Notice */}
            <div className="w-1/2 text-xs space-y-1.5 text-slate-900 font-medium">
              {isEditing ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone"
                    className="font-semibold p-0.5 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none w-48 text-xs print:border-none print:bg-transparent print:p-0"
                  />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="font-semibold text-slate-800 p-0.5 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none w-60 text-xs block print:border-none print:bg-transparent print:p-0"
                  />
                  <input
                    type="text"
                    value={notice}
                    onChange={(e) => setNotice(e.target.value)}
                    placeholder="Footer notice"
                    className="text-[10px] text-slate-600 font-medium italic p-0.5 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none w-full print:border-none print:bg-transparent print:p-0"
                  />
                </div>
              ) : (
                <div>
                  <p className="font-semibold">{phone}</p>
                  <p className="font-semibold text-slate-800">{email}</p>
                  <p className="text-[10px] text-slate-600 font-medium italic pt-2">
                    {notice}
                  </p>
                </div>
              )}
            </div>

            {/* Right Signature & Signatory */}
            <div className="text-center pr-4 min-w-[200px]">
              {/* Authentic Cursive Signature Graphic */}
              <div className="mb-1 flex justify-center items-center h-14">
                <img
                  src={signatureImg}
                  alt="Authorized Signature"
                  className="h-12 w-auto object-contain pointer-events-none select-none"
                />
              </div>

              {/* Horizontal divider line under signature */}
              <div className="w-48 border-t-2 border-slate-900 mx-auto my-1.5"></div>

              {isEditing ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    className="font-black text-slate-950 text-sm tracking-wide uppercase text-center p-0.5 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none w-48 print:border-none print:bg-transparent print:p-0"
                  />
                  <input
                    type="text"
                    value={signatoryTitle}
                    onChange={(e) => setSignatoryTitle(e.target.value)}
                    className="text-xs font-semibold text-slate-800 text-center p-0.5 rounded bg-blue-50/70 border border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none w-40 block mx-auto print:border-none print:bg-transparent print:p-0"
                  />
                </div>
              ) : (
                <div>
                  <p className="font-black text-slate-950 text-sm tracking-wide uppercase">
                    {signatoryName}
                  </p>
                  <p className="text-xs font-semibold text-slate-800">
                    {signatoryTitle}
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Bottom Right Geometric Blue Sliced Banner */}
          <div className="absolute bottom-0 right-0 w-80 h-20 pointer-events-none overflow-hidden">
            <svg
              className="w-full h-full"
              viewBox="0 0 320 80"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="dotPatternBottom" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="#ffffff" opacity="0.3" />
                </pattern>
              </defs>

              {/* Main deep blue polygon */}
              <polygon points="80,80 320,80 320,10 180,45" fill="#1e3a8a" />
              
              {/* Secondary mid-blue polygon */}
              <polygon points="140,80 320,80 320,25 240,65" fill="#2563eb" />

              {/* Halftone / Dotted matrix on right facet */}
              <polygon points="180,75 315,75 315,35 240,60" fill="url(#dotPatternBottom)" />
            </svg>
          </div>

        </div>

        {/* Bottom Exit & Action Bar (Hidden in Print) */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition cursor-pointer"
          >
            <ArrowLeft size={16} className="text-cyan-400" />
            <span>Back to Orders</span>
          </button>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Edit3 size={14} />
              <span>{isEditing ? 'Preview Mode' : 'Edit Mode'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
            >
              <Printer size={15} />
              <span>Print Bill</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <Download size={15} />
              <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
