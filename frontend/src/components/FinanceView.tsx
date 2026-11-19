import React, { useState, useEffect } from 'react';
import {
  Banknote, Plus, Calendar, AlertTriangle, CheckCircle2,
  Users, Building, Repeat, X
} from 'lucide-react';
import { apiClient } from '../services/api';
import { Employee, SalaryRecord, RentRecord, RecurringExpense, User } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface FinanceViewProps {
  currentUser: User;
}

export const FinanceView: React.FC<FinanceViewProps> = ({ currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'SALARIES' | 'RENT' | 'RECURRING'>('SALARIES');

  // Salaries State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Rent State
  const [rentRecords, setRentRecords] = useState<RentRecord[]>([]);

  // Recurring State
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);

  // Modals
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [rentModalOpen, setRentModalOpen] = useState(false);
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);

  // Forms
  const [empId, setEmpId] = useState('');
  const [empName, setEmpName] = useState('');
  const [empDesignation, setEmpDesignation] = useState('3D Printing Specialist');
  const [empPhone, setEmpPhone] = useState('');
  const [empSalary, setEmpSalary] = useState('20000');

  // Salary Entry Form
  const [salEmployeeId, setSalEmployeeId] = useState('');
  const [salMonth, setSalMonth] = useState(new Date().toISOString().slice(0, 7));
  const [salBase, setSalBase] = useState('20000');
  const [salAdd, setSalAdd] = useState('0');
  const [salDed, setSalDed] = useState('0');
  const [salPaid, setSalPaid] = useState('20000');
  const [salMethod, setSalMethod] = useState('BANK_TRANSFER');

  // Rent Form
  const [rentMonth, setRentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rentAmount, setRentAmount] = useState('12000');
  const [rentPaidTo, setRentPaidTo] = useState('Commercial Space Landlord');

  // Recurring Form
  const [recName, setRecName] = useState('');
  const [recCategory, setRecCategory] = useState('Internet');
  const [recAmount, setRecAmount] = useState('1500');

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  const fetchData = async () => {
    try {
      const [emps, sals, rents, recs] = await Promise.all([
        apiClient.listEmployees(),
        apiClient.listSalaries(selectedMonth || undefined),
        apiClient.listRentRecords(),
        apiClient.listRecurringExpenses()
      ]);
      setEmployees(emps);
      setSalaries(sals);
      setRentRecords(rents);
      setRecurringExpenses(recs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.addEmployee({
        employee_id: empId.trim(),
        full_name: empName.trim(),
        designation: empDesignation.trim(),
        phone: empPhone.trim(),
        base_salary: Number(empSalary)
      });
      setEmployeeModalOpen(false);
      setEmpId('');
      setEmpName('');
      setEmpPhone('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add employee');
    }
  };

  const handleRecordSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.recordSalary({
        employee_id: salEmployeeId,
        salary_month: salMonth,
        base_salary: Number(salBase),
        additional_payments: Number(salAdd),
        deductions: Number(salDed),
        amount_paid: Number(salPaid),
        payment_method: salMethod
      });
      setSalaryModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to record salary');
    }
  };

  const handleRecordRent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.recordRent({
        rent_month: rentMonth,
        amount: Number(rentAmount),
        paid_to: rentPaidTo
      });
      setRentModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to record rent');
    }
  };

  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.addRecurringExpense({
        name: recName.trim(),
        category: recCategory,
        monthly_amount: Number(recAmount)
      });
      setRecurringModalOpen(false);
      setRecName('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add recurring expense');
    }
  };

  return (
    <div className="space-y-5">
      {/* Tab Switcher */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-2">
        <button
          onClick={() => setActiveSubTab('SALARIES')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition ${
            activeSubTab === 'SALARIES'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users size={16} />
          <span>Employee Salaries</span>
        </button>

        <button
          onClick={() => setActiveSubTab('RENT')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition ${
            activeSubTab === 'RENT'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building size={16} />
          <span>Fixed Monthly Rent</span>
        </button>

        <button
          onClick={() => setActiveSubTab('RECURRING')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition ${
            activeSubTab === 'RECURRING'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Repeat size={16} />
          <span>Recurring Overheads</span>
        </button>
      </div>

      {/* SubTab 1: Salaries */}
      {activeSubTab === 'SALARIES' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-700">Salary Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setEmployeeModalOpen(true)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition"
              >
                + Add Employee
              </button>
              <button
                onClick={() => {
                  if (employees.length > 0) {
                    setSalEmployeeId(employees[0].id);
                    setSalBase(String(employees[0].base_salary));
                  }
                  setSalaryModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                + Record Monthly Salary
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Employee Name</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Base Salary</th>
                    <th className="px-4 py-3">Additions / Deductions</th>
                    <th className="px-4 py-3">Total Payable</th>
                    <th className="px-4 py-3">Amount Paid</th>
                    <th className="px-4 py-3">Balance Remaining</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {salaries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        No salary entries recorded for {selectedMonth}.
                      </td>
                    </tr>
                  ) : (
                    salaries.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-900">{s.employee_name}</td>
                        <td className="px-4 py-3 font-medium text-slate-600">{s.salary_month}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{formatCurrency(s.base_salary)}</td>
                        <td className="px-4 py-3 text-slate-500">
                          +{formatCurrency(s.additional_payments)} / -{formatCurrency(s.deductions)}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{formatCurrency(s.total_payable)}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600">{formatCurrency(s.amount_paid)}</td>
                        <td className="px-4 py-3 font-bold text-amber-600">{formatCurrency(s.remaining_balance)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              s.payment_status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {s.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 2: Rent */}
      {activeSubTab === 'RENT' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Fixed Monthly Office Rent</h4>
              <p className="text-xs text-slate-400">
                Default: ₹12,000/month. The system strictly avoids creating duplicate rent records for the same month.
              </p>
            </div>
            <button
              onClick={() => setRentModalOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              + Record Monthly Rent
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Rent Month</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment Date</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3">Paid To</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No rent records logged yet.
                    </td>
                  </tr>
                ) : (
                  rentRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-blue-900">{r.rent_month}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{formatCurrency(r.amount)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(r.payment_date)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{r.payment_method}</td>
                      <td className="px-4 py-3 text-slate-700">{r.paid_to}</td>
                      <td className="px-4 py-3 text-slate-400">{r.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab 3: Recurring Overheads */}
      {activeSubTab === 'RECURRING' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Recurring Business Subscriptions & Overheads</h4>
              <p className="text-xs text-slate-400">
                Internet, software licenses (CAD/Slicer/Adobe), cloud hosting, and AMC maintenance
              </p>
            </div>
            <button
              onClick={() => setRecurringModalOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              + Add Recurring Expense
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recurringExpenses.map((rec) => (
              <div key={rec.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-bold text-slate-900">{rec.name}</h5>
                    <span className="text-[10px] uppercase font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">
                      {rec.category}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                    Active
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-slate-400 text-xs">Monthly Cost:</span>
                  <span className="text-base font-bold text-slate-800">{formatCurrency(rec.monthly_amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Rent Modal */}
      {rentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Record Monthly Rent</h3>
              <button onClick={() => setRentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordRent} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rent Month (YYYY-MM) *</label>
                <input
                  type="month"
                  required
                  value={rentMonth}
                  onChange={(e) => setRentMonth(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Monthly Rent Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={rentAmount}
                  onChange={(e) => setRentAmount(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold text-blue-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Paid To</label>
                <input
                  type="text"
                  value={rentPaidTo}
                  onChange={(e) => setRentPaidTo(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  Record Rent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Salary Modal */}
      {salaryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Record Employee Salary</h3>
              <button onClick={() => setSalaryModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordSalary} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employee *</label>
                <select
                  value={salEmployeeId}
                  onChange={(e) => {
                    setSalEmployeeId(e.target.value);
                    const emp = employees.find((em) => em.id === e.target.value);
                    if (emp) {
                      setSalBase(String(emp.base_salary));
                      setSalPaid(String(emp.base_salary));
                    }
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                >
                  {employees.map((em) => (
                    <option key={em.id} value={em.id}>
                      {em.full_name} ({em.designation}) - Base: ₹{em.base_salary}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Salary Month *</label>
                  <input
                    type="month"
                    required
                    value={salMonth}
                    onChange={(e) => setSalMonth(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base Salary (₹)</label>
                  <input
                    type="number"
                    required
                    value={salBase}
                    onChange={(e) => setSalBase(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Additional Payments (₹)</label>
                  <input
                    type="number"
                    value={salAdd}
                    onChange={(e) => setSalAdd(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Deductions (₹)</label>
                  <input
                    type="number"
                    value={salDed}
                    onChange={(e) => setSalDed(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    required
                    value={salPaid}
                    onChange={(e) => setSalPaid(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={salMethod}
                    onChange={(e) => setSalMethod(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSalaryModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  Save Salary Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {employeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Add New Employee</h3>
              <button onClick={() => setEmployeeModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employee ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VOM-EMP-01"
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anbarasan M"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={empDesignation}
                    onChange={(e) => setEmpDesignation(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base Salary (₹)</label>
                  <input
                    type="number"
                    value={empSalary}
                    onChange={(e) => setEmpSalary(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 9840112233"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEmployeeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Recurring Modal */}
      {recurringModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Add Recurring Overhead</h3>
              <button onClick={() => setRecurringModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddRecurring} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expense Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High-Speed Fiber Internet"
                  value={recName}
                  onChange={(e) => setRecName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={recCategory}
                    onChange={(e) => setRecCategory(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Cost (₹)</label>
                  <input
                    type="number"
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRecurringModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  Save Recurring
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
