import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Check, X, Lock, Key, UserCheck, AlertCircle, Trash2 } from 'lucide-react';
import { apiClient } from '../services/api';
import { User } from '../types';
import { formatDate } from '../utils/formatters';

export const UserManagementView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'SUPER_ADMIN' | 'SUB_ADMIN'>('SUB_ADMIN');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    can_view_profits: false,
    can_view_salaries: false,
    can_view_gst: false,
    can_manage_inventory: true,
    can_manage_workshops: true,
    can_backup_database: false
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createUser({
        username: username.trim(),
        email: email.trim(),
        full_name: fullName.trim(),
        role,
        password,
        permissions
      });
      setCreateModalOpen(false);
      setUsername('');
      setEmail('');
      setFullName('');
      setPassword('');
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleUpdatePermissions = async (user: User, key: string, val: boolean) => {
    const updated = { ...(user.permissions || {}), [key]: val };
    try {
      await apiClient.updateUser(user.id, { permissions: updated });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await apiClient.updateUser(user.id, { is_active: !user.is_active });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (u.username === 'admin') {
      alert('The primary Super Admin account cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete user "${u.username}"?`)) return;
    try {
      await apiClient.deleteUser(u.id);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">User Administration & Granular Permissions</h3>
          <p className="text-xs text-slate-400">
            Control module access, financial report visibility, and operations authorization for Sub Admins
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
        >
          <Plus size={15} />
          <span>Add User Account</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Username & Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">P&L Profit Visibility</th>
                <th className="px-4 py-3">Salaries Access</th>
                <th className="px-4 py-3">GST Register</th>
                <th className="px-4 py-3">Inventory Adjust</th>
                <th className="px-4 py-3">Workshops Manage</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((u) => {
                const isSuper = u.role === 'SUPER_ADMIN';
                const p = u.permissions || {};

                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{u.username}</div>
                      <div className="text-[10px] text-slate-400">{u.full_name}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isSuper ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isSuper ? 'Super Admin' : 'Sub Admin'}
                      </span>
                    </td>

                    {/* Permission Toggles */}
                    <td className="px-4 py-3">
                      {isSuper ? (
                        <span className="text-emerald-600 font-bold">✓ Full</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={p.can_view_profits || false}
                          onChange={(e) => handleUpdatePermissions(u, 'can_view_profits', e.target.checked)}
                          className="rounded text-blue-600 cursor-pointer"
                        />
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {isSuper ? (
                        <span className="text-emerald-600 font-bold">✓ Full</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={p.can_view_salaries || false}
                          onChange={(e) => handleUpdatePermissions(u, 'can_view_salaries', e.target.checked)}
                          className="rounded text-blue-600 cursor-pointer"
                        />
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {isSuper ? (
                        <span className="text-emerald-600 font-bold">✓ Full</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={p.can_view_gst || false}
                          onChange={(e) => handleUpdatePermissions(u, 'can_view_gst', e.target.checked)}
                          className="rounded text-blue-600 cursor-pointer"
                        />
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {isSuper ? (
                        <span className="text-emerald-600 font-bold">✓ Full</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={p.can_manage_inventory || false}
                          onChange={(e) => handleUpdatePermissions(u, 'can_manage_inventory', e.target.checked)}
                          className="rounded text-blue-600 cursor-pointer"
                        />
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {isSuper ? (
                        <span className="text-emerald-600 font-bold">✓ Full</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={p.can_manage_workshops || false}
                          onChange={(e) => handleUpdatePermissions(u, 'can_manage_workshops', e.target.checked)}
                          className="rounded text-blue-600 cursor-pointer"
                        />
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(u)}
                        disabled={u.username === 'admin'}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-right">
                      {u.username !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Create New User Account</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. subadmin3"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vignesh R"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. vignesh@veomalabs.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">User Role</label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="SUB_ADMIN">Sub Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {role === 'SUB_ADMIN' && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-700 uppercase tracking-wide text-[10px] block">
                    Initial Sub Admin Permissions
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.can_view_profits}
                        onChange={(e) => setPermissions({ ...permissions, can_view_profits: e.target.checked })}
                      />
                      <span>View Profit Reports</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.can_view_salaries}
                        onChange={(e) => setPermissions({ ...permissions, can_view_salaries: e.target.checked })}
                      />
                      <span>View Salaries</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.can_view_gst}
                        onChange={(e) => setPermissions({ ...permissions, can_view_gst: e.target.checked })}
                      />
                      <span>View GST Register</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.can_manage_inventory}
                        onChange={(e) => setPermissions({ ...permissions, can_manage_inventory: e.target.checked })}
                      />
                      <span>Manage Inventory</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.can_manage_workshops}
                        onChange={(e) => setPermissions({ ...permissions, can_manage_workshops: e.target.checked })}
                      />
                      <span>Manage Workshops</span>
                    </label>
                  </div>
                </div>
              )}

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
                  Save User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
