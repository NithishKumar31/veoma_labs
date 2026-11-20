import React, { useState, useEffect } from 'react';
import { X, Printer, Download, Edit3, Check, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../services/api';
import { Order } from '../types';

interface InvoiceModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, isOpen, onClose }) => {
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Editable Overrides
  const [companyName, setCompanyName] = useState('ELARCHI LABS');
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

  useEffect(() => {
    if (isOpen && order) {
      setLoading(true);
      apiClient.getOrderInvoiceData(order.id)
        .then((data) => {
          setInvoiceData(data);
          if (data.company_name) setCompanyName(data.company_name);
          if (data.company_gstin) setCompanyGstin(data.company_gstin);
          if (data.company_address) setCompanyAddress(data.company_address);
          if (data.account_no) setAccountNo(data.account_no);
          if (data.account_name) setAccountName(data.account_name);
          if (data.branch_name) setBranchName(data.branch_name);
          if (data.phone) setPhone(data.phone);
          if (data.email) setEmail(data.email);
          if (data.signatory_name) setSignatoryName(data.signatory_name);
          if (data.signatory_title) setSignatoryTitle(data.signatory_title);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const url = `/api/orders/${order.id}/invoice-pdf`;
    window.open(url, '_blank');
  };

  const invoiceNo = invoiceData?.invoice_no || `ELA${order.order_id.replace(/[^0-9]/g, '').slice(-7) || '2026017'}`;
  const invoiceDate = invoiceData?.invoice_date || new Date(order.order_date).toLocaleDateString('en-GB');

  const customerName = invoiceData?.customer_name || order.customer_name || 'SRI SAMVARDHINI ,';
  const customerAddress = invoiceData?.customer_address || order.place_of_supply || 'CHENNAI,\nTAMILNADU.';
  const customerGstin = invoiceData?.customer_gstin || '33AFJFS7476L1Z9';

  const items = invoiceData?.items || [
    ...(order.designing_required && Number(order.designing_cost) > 0 ? [{
      description: `Designing (${order.model_name})`,
      qty: '1 job',
      price: Number(order.designing_cost),
      total: Number(order.designing_cost)
    }] : []),
    {
      description: `Printing(${order.model_name})`,
      qty: order.quantity > 1 ? `${order.quantity} pcs` : '1 job',
      price: Number(order.agreed_selling_price) - (order.designing_required ? Number(order.designing_cost) : 0),
      total: Number(order.agreed_selling_price) - (order.designing_required ? Number(order.designing_cost) : 0)
    }
  ];

  const subtotal = invoiceData?.subtotal ?? (Number(order.taxable_value) > 0 ? Number(order.taxable_value) : Number(order.agreed_selling_price));
  const gst = invoiceData?.gst ?? (Number(order.cgst_amount) + Number(order.sgst_amount) + Number(order.igst_amount));
  const total = invoiceData?.total ?? (subtotal + gst);
  const courierCharge = invoiceData?.courier_charge ?? Number(order.courier_charge);
  const grandTotal = invoiceData?.grand_total ?? (total + courierCharge);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[850px] my-6 overflow-hidden flex flex-col print:border-none print:shadow-none print:my-0 print:max-w-none">
        
        {/* Top Control Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <h3 className="text-sm font-bold tracking-wide">Official Invoice & Bill Preview</h3>
            <span className="text-[11px] text-slate-400">({invoiceNo})</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                isEditing ? 'bg-purple-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Edit3 size={14} />
              <span>{isEditing ? 'Done Editing' : 'Customize Header'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
            >
              <Printer size={14} />
              <span>Print Bill</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Edit Drawer if enabled (Hidden in Print) */}
        {isEditing && (
          <div className="p-4 bg-purple-50 border-b border-purple-200 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full p-1.5 border border-purple-300 rounded bg-white text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company GSTIN</label>
              <input
                type="text"
                value={companyGstin}
                onChange={(e) => setCompanyGstin(e.target.value)}
                className="w-full p-1.5 border border-purple-300 rounded bg-white text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company Address</label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full p-1.5 border border-purple-300 rounded bg-white text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Bank Account No.</label>
              <input
                type="text"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                className="w-full p-1.5 border border-purple-300 rounded bg-white text-xs font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Account Name & Branch</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Account Name"
                className="w-full p-1.5 border border-purple-300 rounded bg-white text-xs mb-1"
              />
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Branch Name"
                className="w-full p-1.5 border border-purple-300 rounded bg-white text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Signatory Name & Role</label>
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                className="w-full p-1.5 border border-purple-300 rounded bg-white text-xs font-bold mb-1"
              />
              <input
                type="text"
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                className="w-full p-1.5 border border-purple-300 rounded bg-white text-xs"
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            EXACT INVOICE SHEET (A4 PROPORTIONED CANVAS)
            ========================================================================= */}
        <div className="invoice-print-area bg-white text-slate-900 relative font-sans p-8 sm:p-12 overflow-hidden min-h-[1050px] flex flex-col justify-between select-text">
          
          {/* Top Geometric Purple Sliced Banner */}
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

              {/* Main deep purple polygon */}
              <polygon points="0,0 800,0 800,35 340,75 0,120" fill="#38074d" />
              
              {/* Secondary mid-purple polygon */}
              <polygon points="0,0 460,0 220,95 0,120" fill="#531270" />

              {/* Halftone / Dotted matrix on left facet */}
              <polygon points="30,10 320,10 160,95 0,115" fill="url(#dotPatternTop)" />
            </svg>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="relative z-10 pt-16">
            
            {/* Header: Left TO: & Right ELARCHI LABS */}
            <div className="flex justify-between items-start mt-4 mb-8">
              
              {/* LEFT: TO: Customer Details */}
              <div className="w-1/2 pr-4 text-xs space-y-1">
                <span className="font-bold text-slate-900 text-sm block tracking-wide">TO:</span>
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

              {/* RIGHT: Company Name, INVOICE, Date & Banking Details */}
              <div className="w-1/2 pl-4 text-right text-xs">
                
                {/* 3D Cyan Isometric Logo & Company Name */}
                <div className="flex items-center justify-end space-x-3 mb-1">
                  {/* Cyan / Blue 3D Cube Icon */}
                  <svg className="w-9 h-9" viewBox="0 0 40 40" fill="none">
                    <polygon points="4,10 20,2 20,30 4,38" fill="#00c5d7" />
                    <polygon points="20,2 36,10 36,38 20,30" fill="#0288d1" />
                    <polygon points="20,16 30,10 30,24 20,30" fill="#ffffff" opacity="0.3" />
                    <circle cx="28" cy="22" r="3" fill="#ffffff" />
                  </svg>
                  <div>
                    <h1 className="text-2xl font-black text-slate-950 tracking-wide uppercase leading-none">
                      {companyName}
                    </h1>
                    <p className="text-[11px] font-bold text-slate-700 tracking-[0.25em] uppercase text-right mt-0.5">
                      INVOICE
                    </p>
                  </div>
                </div>

                {/* Date & Invoice No */}
                <div className="text-[11px] text-slate-800 mt-3 space-y-0.5 font-medium">
                  <p>Quotation Date: <span className="font-semibold">{invoiceDate}</span></p>
                  <p>Invoice no : <span className="font-semibold">{invoiceNo}</span></p>
                </div>

                {/* Company GST & Address */}
                <div className="text-[11px] text-slate-900 mt-2 space-y-0.5">
                  <p className="font-extrabold tracking-wide">
                    GST No. - <span className="font-mono">{companyGstin}</span>
                  </p>
                  <p className="font-medium text-slate-800 leading-tight">
                    Address - {companyAddress}
                  </p>
                </div>

                {/* Payment Method & Bank Account */}
                <div className="text-[11px] text-slate-900 mt-2.5 space-y-0.5">
                  <p className="font-extrabold flex items-center justify-end space-x-1">
                    <span>PAYMENT METHOD - CASH / BANK</span>
                    <span className="text-emerald-600 font-bold ml-1">✓</span>
                  </p>
                  <p className="font-mono font-medium text-slate-800">
                    Account No: &nbsp;{accountNo}
                  </p>
                  <p className="font-medium text-slate-800">
                    Account Name: {accountName}
                  </p>
                  <p className="font-medium text-slate-800">
                    Branch Name: &nbsp;{branchName}
                  </p>
                </div>
              </div>
            </div>

            {/* =========================================================================
                TABLE SECTION
                ========================================================================= */}
            <div className="mt-8 mb-4">
              
              {/* Rounded Deep Purple Header Bar */}
              <div className="bg-[#38074d] text-white rounded-full px-6 py-2.5 flex items-center justify-between text-xs font-extrabold tracking-wider shadow-sm">
                <span className="w-1/2 text-left uppercase">DESCRIPTION</span>
                <span className="w-1/6 text-left pl-4 uppercase">QTY</span>
                <span className="w-1/6 text-right pr-4 uppercase">PRICE</span>
                <span className="w-1/6 text-right uppercase">TOTAL</span>
              </div>

              {/* Line Items */}
              <div className="px-6 py-3 divide-y divide-slate-100 text-xs">
                {items.map((item: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between font-medium text-slate-900">
                    <span className="w-1/2 text-left text-[12px] font-semibold text-slate-900">
                      {item.description}
                    </span>
                    <span className="w-1/6 text-left pl-4 text-slate-800 font-medium text-[12px]">
                      {item.qty}
                    </span>
                    <span className="w-1/6 text-right pr-4 font-mono text-[12px] text-slate-900">
                      {Number(item.price).toLocaleString('en-IN')}
                    </span>
                    <span className="w-1/6 text-right font-mono font-semibold text-[12px] text-slate-950">
                      {Number(item.total).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Table Bottom Border */}
              <div className="border-b border-slate-300 mx-2 mt-1"></div>
            </div>

            {/* =========================================================================
                TOTALS & SUMMARY SECTION (RIGHT-ALIGNED)
                ========================================================================= */}
            <div className="flex justify-end mt-4 mb-10 pr-6">
              <div className="w-72 space-y-2 text-xs">
                
                <div className="flex justify-between items-center text-slate-800 font-semibold">
                  <span className="uppercase tracking-wider">SUB TOTAL</span>
                  <span className="font-mono text-slate-950">₹{Number(subtotal).toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between items-center text-slate-800 font-semibold">
                  <span className="uppercase tracking-wider">GST</span>
                  <span className="font-mono text-slate-950">₹{Number(gst).toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between items-center text-slate-950 font-bold text-sm pt-0.5">
                  <span className="uppercase tracking-wider">TOTAL</span>
                  <span className="font-mono">₹{Number(total).toLocaleString('en-IN')}</span>
                </div>

                {/* Divider Line */}
                <div className="border-b border-slate-300 pt-1"></div>

                <div className="flex justify-between items-center text-slate-800 font-semibold pt-1">
                  <span>Courier charge</span>
                  <span className="font-mono text-slate-950">₹{Number(courierCharge).toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between items-center text-slate-950 font-black text-base pt-1">
                  <span className="uppercase tracking-wide">GRAND TOTAL</span>
                  <span className="font-mono font-black">₹{Number(grandTotal).toLocaleString('en-IN')}</span>
                </div>

              </div>
            </div>

          </div>

          {/* =========================================================================
              FOOTER & SIGNATURE SECTION
              ========================================================================= */}
          <div className="relative z-10 flex justify-between items-end mt-8 pb-10 px-2">
            
            {/* Left Contact & Notice */}
            <div className="text-xs space-y-1 text-slate-900 font-medium">
              <p className="font-semibold">{phone}</p>
              <p className="font-semibold text-slate-800">{email}</p>
              <p className="text-[10px] text-slate-600 font-medium italic pt-2">
                {notice}
              </p>
            </div>

            {/* Right Signature & Signatory */}
            <div className="text-center pr-8">
              {/* Cursive Signature Graphic */}
              <div className="mb-1 flex justify-center">
                <svg className="w-28 h-10" viewBox="0 0 120 45" fill="none">
                  <path
                    d="M10,32 C25,12 40,8 55,25 C65,36 80,10 95,28 C105,38 112,18 118,22"
                    stroke="#111827"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line x1="30" y1="28" x2="105" y2="28" stroke="#111827" strokeWidth="1.6" />
                </svg>
              </div>

              <p className="font-black text-slate-950 text-xs tracking-wider uppercase">
                {signatoryName}
              </p>
              <p className="text-[11px] font-semibold text-slate-700">
                {signatoryTitle}
              </p>
            </div>

          </div>

          {/* Bottom Right Geometric Purple Sliced Banner */}
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

              {/* Main deep purple polygon */}
              <polygon points="80,80 320,80 320,10 180,45" fill="#38074d" />
              
              {/* Secondary mid-purple polygon */}
              <polygon points="140,80 320,80 320,25 240,65" fill="#531270" />

              {/* Halftone / Dotted matrix on right facet */}
              <polygon points="180,75 315,75 315,35 240,60" fill="url(#dotPatternBottom)" />
            </svg>
          </div>

        </div>

      </div>
    </div>
  );
};
