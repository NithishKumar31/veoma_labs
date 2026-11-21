import React, { useState, useEffect } from 'react';
import {
  GraduationCap, Plus, Users, Calendar, MapPin, DollarSign,
  CheckCircle2, Clock, X, AlertCircle, TrendingUp, Trash2
} from 'lucide-react';
import { apiClient } from '../services/api';
import { Workshop } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export const WorkshopsView: React.FC = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [participantModalOpen, setParticipantModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  // Create Workshop Form
  const [name, setName] = useState('');
  const [category, setCategory] = useState('3D_PRINTING');
  const [startDate, setStartDate] = useState('');
  const [location, setLocation] = useState('Veoma Innovation Lab, Chennai');
  const [trainerName, setTrainerName] = useState('R. Selvam');
  const [registrationFee, setRegistrationFee] = useState('1500');
  const [targetParticipants, setTargetParticipants] = useState('15');
  const [notes, setNotes] = useState('');

  // Participant Form
  const [partName, setPartName] = useState('');
  const [partPhone, setPartPhone] = useState('');
  const [partFee, setPartFee] = useState('1500');
  const [partPaid, setPartPaid] = useState('1500');

  // Expense Form
  const [expCategory, setExpCategory] = useState('REFRESHMENTS');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expMethod, setExpMethod] = useState('UPI');

  const fetchWorkshops = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listWorkshops();
      setWorkshops(data);
      if (selectedWorkshop) {
        const refreshed = data.find((w) => w.id === selectedWorkshop.id);
        if (refreshed) setSelectedWorkshop(refreshed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkshops();
  }, []);

  const handleDeleteWorkshop = async (e: React.MouseEvent, id: string, wsName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete workshop "${wsName}"?`)) return;
    try {
      await apiClient.deleteWorkshop(id);
      fetchWorkshops();
      if (selectedWorkshop && (selectedWorkshop.id === id || selectedWorkshop.workshop_code === id)) {
        setSelectedWorkshop(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || 'Failed to delete workshop');
    }
  };

  const handleCreateWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createWorkshop({
        name,
        category,
        start_date: new Date(startDate).toISOString(),
        location,
        trainer_name: trainerName,
        registration_fee: Number(registrationFee),
        target_participants: Number(targetParticipants),
        notes: notes || undefined
      });
      setCreateModalOpen(false);
      fetchWorkshops();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create workshop');
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkshop) return;
    try {
      await apiClient.addParticipant(selectedWorkshop.id, {
        participant_name: partName.trim(),
        phone: partPhone.trim(),
        fee_agreed: Number(partFee),
        amount_paid: Number(partPaid)
      });
      setParticipantModalOpen(false);
      setPartName('');
      setPartPhone('');
      fetchWorkshops();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add participant');
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkshop) return;
    try {
      await apiClient.addWorkshopExpense(selectedWorkshop.id, {
        category: expCategory,
        description: expDesc.trim(),
        amount: Number(expAmount),
        payment_method: expMethod
      });
      setExpenseModalOpen(false);
      setExpDesc('');
      setExpAmount('');
      fetchWorkshops();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add workshop expense');
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Technical Workshops & Training</h3>
          <p className="text-xs text-slate-400">
            3D Printing, 3D Designing & 3D Scanning Workshops with isolated profitability
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
        >
          <Plus size={15} />
          <span>New Workshop</span>
        </button>
      </div>

      {/* Workshop Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workshops.map((w) => (
          <div
            key={w.id}
            onClick={() => setSelectedWorkshop(w)}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition cursor-pointer space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-cyan-700 uppercase bg-cyan-50 px-2 py-0.5 rounded">
                  {w.category.replace(/_/g, ' ')}
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-1">{w.name}</h4>
                <p className="text-[11px] text-slate-400">{w.workshop_code}</p>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                  {w.status}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDeleteWorkshop(e, w.id, w.name)}
                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Delete Workshop"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex items-center space-x-2">
                <Calendar size={13} className="text-slate-400" />
                <span>{formatDate(w.start_date)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin size={13} className="text-slate-400" />
                <span className="truncate">{w.location}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users size={13} className="text-slate-400" />
                <span>
                  Trainer: <strong>{w.trainer_name}</strong> • Participants: <strong>{w.total_participants}</strong>/{w.target_participants}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Revenue</span>
                <span className="font-bold text-slate-800">{formatCurrency(w.total_revenue)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Expenses</span>
                <span className="font-bold text-rose-600">{formatCurrency(w.total_expenses)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Profit</span>
                <span className="font-bold text-emerald-600">{formatCurrency(w.net_profit)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Workshop Details & Participants Modal */}
      {selectedWorkshop && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">{selectedWorkshop.name}</h3>
                <p className="text-xs text-cyan-300">
                  {selectedWorkshop.workshop_code} • {selectedWorkshop.trainer_name} • Fee: {formatCurrency(selectedWorkshop.registration_fee)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={(e) => handleDeleteWorkshop(e, selectedWorkshop.id, selectedWorkshop.name)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 flex items-center space-x-1 transition cursor-pointer"
                  title="Delete this workshop"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
                <button onClick={() => setSelectedWorkshop(null)} className="text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              {/* Financial Summary Cards for Workshop */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Revenue</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">{formatCurrency(selectedWorkshop.total_revenue)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Cash Collected</span>
                  <p className="text-base font-bold text-emerald-600 mt-0.5">{formatCurrency(selectedWorkshop.total_collected)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Direct Expenses</span>
                  <p className="text-base font-bold text-rose-600 mt-0.5">{formatCurrency(selectedWorkshop.total_expenses)}</p>
                </div>
                <div className="bg-slate-900 text-white p-3 rounded-lg">
                  <span className="text-[10px] text-cyan-300 uppercase font-semibold">Workshop Profit</span>
                  <p className="text-base font-bold text-cyan-400 mt-0.5">{formatCurrency(selectedWorkshop.net_profit)}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setParticipantModalOpen(true)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold flex items-center space-x-1"
                >
                  <Plus size={14} />
                  <span>Register Participant</span>
                </button>
                <button
                  onClick={() => setExpenseModalOpen(true)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold flex items-center space-x-1"
                >
                  <Plus size={14} />
                  <span>Record Workshop Expense</span>
                </button>
              </div>

              {/* Participants Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Registered Participants ({selectedWorkshop.participants?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-500 font-semibold text-[11px]">
                      <tr>
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Phone</th>
                        <th className="p-2.5">Fee Agreed</th>
                        <th className="p-2.5">Amount Paid</th>
                        <th className="p-2.5">Balance</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedWorkshop.participants?.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{p.participant_name}</td>
                          <td className="p-2.5 text-slate-600">{p.phone}</td>
                          <td className="p-2.5 font-semibold text-slate-800">{formatCurrency(p.fee_agreed)}</td>
                          <td className="p-2.5 font-bold text-emerald-600">{formatCurrency(p.amount_paid)}</td>
                          <td className="p-2.5 font-semibold text-amber-600">{formatCurrency(p.balance)}</td>
                          <td className="p-2.5">{p.payment_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expenses Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Workshop Specific Direct Expenses
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-500 font-semibold text-[11px]">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5">Amount</th>
                        <th className="p-2.5">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedWorkshop.expenses?.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50">
                          <td className="p-2.5">{formatDate(e.expense_date)}</td>
                          <td className="p-2.5 font-bold text-slate-700">{e.category}</td>
                          <td className="p-2.5 text-slate-600">{e.description}</td>
                          <td className="p-2.5 font-bold text-rose-600">{formatCurrency(e.amount)}</td>
                          <td className="p-2.5">{e.payment_method}</td>
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

      {/* Create Workshop Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Schedule New Workshop</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWorkshop} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Workshop Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masterclass in 3D Printing & Slicing"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="3D_PRINTING">3D Printing Workshop</option>
                    <option value="3D_DESIGNING">3D Designing Workshop</option>
                    <option value="3D_SCANNING">3D Scanning Workshop</option>
                    <option value="CUSTOM">Custom Technical Workshop</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location / Venue *</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trainer Name</label>
                  <input
                    type="text"
                    required
                    value={trainerName}
                    onChange={(e) => setTrainerName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fee per Attendee (₹)</label>
                  <input
                    type="number"
                    required
                    value={registrationFee}
                    onChange={(e) => setRegistrationFee(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Seats</label>
                  <input
                    type="number"
                    value={targetParticipants}
                    onChange={(e) => setTargetParticipants(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Create Workshop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Participant Modal */}
      {participantModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Register Attendee</h3>
              <button onClick={() => setParticipantModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddParticipant} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Attendee Name *</label>
                <input
                  type="text"
                  required
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={partPhone}
                  onChange={(e) => setPartPhone(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fee Agreed (₹)</label>
                  <input
                    type="number"
                    value={partFee}
                    onChange={(e) => setPartFee(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    value={partPaid}
                    onChange={(e) => setPartPaid(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setParticipantModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Workshop Expense Modal */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Record Workshop Expense</h3>
              <button onClick={() => setExpenseModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="TRAINER">Trainer Charges</option>
                  <option value="MATERIALS">Filament & Materials</option>
                  <option value="REFRESHMENTS">Refreshments & Tea</option>
                  <option value="FOOD">Food & Lunch</option>
                  <option value="TRAVEL">Trainer Travel</option>
                  <option value="VENUE">Venue Booking</option>
                  <option value="CERTIFICATES">Printing Certificates</option>
                  <option value="MARKETING">Flyers & Promotion</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Refreshments for 15 students"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-rose-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={expMethod}
                    onChange={(e) => setExpMethod(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 text-white rounded-lg font-semibold"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
