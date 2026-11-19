import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';
import { apiClient } from '../services/api';
import { formatCurrency } from '../utils/formatters';

export const GSTView: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');

  const fetchGSTRegister = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getGSTSalesRegister(selectedMonth || undefined);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGSTRegister();
  }, [selectedMonth]);

  return (
    <div className="space-y-5">
      {/* Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start space-x-3 text-amber-800 text-xs leading-relaxed">
        <AlertCircle size={18} className="flex-shrink-0 text-amber-600 mt-0.5" />
        <div>
          <h4 className="font-bold">Statutory Accounting Notice</h4>
          <p className="mt-0.5 text-amber-700">
            GST collected is held as a statutory tax liability for government remittance and is strictly excluded from company revenue and net profit. Final tax treatment and return filings (GSTR-1, GSTR-3B) must be reviewed with your chartered accountant.
          </p>
        </div>
      </div>

      {/* Control & Export Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Calendar size={16} className="text-blue-600" />
          <span className="text-xs font-semibold text-slate-700">Filter Month:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium"
          />
          {selectedMonth && (
            <button
              onClick={() => setSelectedMonth('')}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear Filter
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <a
            href={apiClient.exportExcelUrl('GST')}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition"
          >
            <Download size={14} />
            <span>Export GST Excel</span>
          </a>
          <a
            href={apiClient.exportPdfUrl('GST')}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition"
          >
            <Download size={14} />
            <span>Export GST PDF</span>
          </a>
        </div>
      </div>

      {/* Tax Totals Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Taxable Sales</span>
          <p className="text-base font-bold text-slate-900 mt-1">{formatCurrency(data?.total_taxable_value)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Total CGST (9%)</span>
          <p className="text-base font-bold text-blue-600 mt-1">{formatCurrency(data?.total_cgst)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Total SGST (9%)</span>
          <p className="text-base font-bold text-blue-600 mt-1">{formatCurrency(data?.total_sgst)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Total IGST (18%)</span>
          <p className="text-base font-bold text-purple-600 mt-1">{formatCurrency(data?.total_igst)}</p>
        </div>
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md col-span-2 sm:col-span-1">
          <span className="text-[10px] text-cyan-300 uppercase font-semibold">Total Invoice Amount</span>
          <p className="text-base font-bold text-white mt-1">{formatCurrency(data?.total_invoice_value)}</p>
        </div>
      </div>

      {/* GST Sales Register Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Invoice No & Date</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">GSTIN</th>
                <th className="px-4 py-3">Place of Supply</th>
                <th className="px-4 py-3">Taxable Value</th>
                <th className="px-4 py-3">CGST</th>
                <th className="px-4 py-3">SGST</th>
                <th className="px-4 py-3">IGST</th>
                <th className="px-4 py-3 font-bold">Total Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data?.invoices?.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No GST-applicable orders recorded for this period.
                  </td>
                </tr>
              ) : (
                data?.invoices?.map((inv: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{inv.invoice_number}</div>
                      <div className="text-[10px] text-slate-400">{inv.invoice_date}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {inv.customer_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono">
                      {inv.customer_gstin}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-medium text-slate-700">
                        {inv.supply_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {formatCurrency(inv.taxable_value)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-blue-600">
                      {formatCurrency(inv.cgst_amount)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-blue-600">
                      {formatCurrency(inv.sgst_amount)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-purple-600">
                      {formatCurrency(inv.igst_amount)}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {formatCurrency(inv.total_invoice_amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
