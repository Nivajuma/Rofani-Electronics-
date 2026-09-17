import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  KeyRound,
  Sparkles,
  Copy,
  Check,
  Eye,
  EyeOff,
  Printer,
  Trash2,
  Edit2,
  X,
  ShieldCheck,
  RefreshCw,
  Mail,
  Lock,
  Search,
  Filter,
  Phone,
  Building,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  UserX,
  ShieldAlert,
  Percent,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { User, Role } from '../../types';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onAddUser: (newUser: User) => void;
  onUpdateUser: (updatedUser: User) => void;
  onDeleteUser: (userId: string) => void;
  currentUser: User;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);
  const [printedUser, setPrintedUser] = useState<User | null>(null);

  // Visible PINs state map
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Helper: Generate Random 4-Digit PIN
  function generateRandomPin(): string {
    const min = 1000;
    const max = 9999;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  // New Worker Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('Cashier');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [department, setDepartment] = useState('');
  const [pin, setPin] = useState(generateRandomPin());
  const [showFormPin, setShowFormPin] = useState(true);
  const [commissionRate, setCommissionRate] = useState<number>(5);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const showNotification = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3500);
  };

  const togglePinVisibility = (userId: string) => {
    setVisiblePins((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleCopyPin = (user: User) => {
    navigator.clipboard.writeText(user.pin);
    setCopiedPinId(user.id);
    showNotification(`Copied security PIN for ${user.name}`, 'info');
    setTimeout(() => setCopiedPinId(null), 2000);
  };

  const handleRegenerateWorkerPin = (user: User) => {
    const newPin = generateRandomPin();
    onUpdateUser({
      ...user,
      pin: newPin,
    });
    showNotification(`Generated new PIN (${newPin}) for ${user.name}`, 'success');
  };

  const handleToggleStatus = (user: User) => {
    const newStatus = user.status === 'inactive' ? 'active' : 'inactive';
    onUpdateUser({
      ...user,
      status: newStatus,
    });
    showNotification(
      `Worker ${user.name} is now marked as ${newStatus.toUpperCase()}`,
      newStatus === 'active' ? 'success' : 'info'
    );
  };

  const handleOpenAddModal = () => {
    setName('');
    setRole('Cashier');
    setPhone('');
    setEmail('');
    setStatus('active');
    setDepartment('');
    setPin(generateRandomPin());
    setShowFormPin(true);
    setCommissionRate(5);
    setNotes('');
    setShowAddModal(true);
  };

  const handleCreateWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showNotification('Please enter the worker full name.', 'error');
      return;
    }

    const trimmedPin = pin.trim();
    if (!trimmedPin || trimmedPin.length < 4) {
      showNotification('PIN must be at least 4 digits.', 'error');
      return;
    }

    // Check duplicate PIN
    const duplicatePinUser = users.find((u) => u.pin === trimmedPin);
    if (duplicatePinUser) {
      const confirmUse = window.confirm(
        `Security Notice: PIN "${trimmedPin}" is already used by ${duplicatePinUser.name}. Do you want to use it anyway? (Click Cancel to generate a unique PIN)`
      );
      if (!confirmUse) return;
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      role: role,
      phone: phone.trim() || undefined,
      email: email.trim() || `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@rofani.co.ke`,
      status: status,
      department: department.trim() || undefined,
      hireDate: new Date().toISOString().slice(0, 10),
      pin: trimmedPin,
      commissionRate: Number(commissionRate) || 0,
      notes: notes.trim() || undefined,
    };

    onAddUser(newUser);
    setShowAddModal(false);
    showNotification(`Worker "${newUser.name}" (${newUser.role}) successfully added!`, 'success');
  };

  const handleSaveEditWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.name.trim()) return;

    onUpdateUser(editingUser);
    showNotification(`Updated profile for ${editingUser.name}`, 'success');
    setEditingUser(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetUser) return;

    if (users.length <= 1) {
      showNotification('Cannot delete the only remaining worker in the system.', 'error');
      setDeleteTargetUser(null);
      return;
    }

    // Check if only 1 admin left
    const adminCount = users.filter((u) => u.role === 'Admin').length;
    if (deleteTargetUser.role === 'Admin' && adminCount <= 1) {
      showNotification('Cannot delete the only remaining Administrator. Please promote another user first.', 'error');
      setDeleteTargetUser(null);
      return;
    }

    const deletedName = deleteTargetUser.name;
    onDeleteUser(deleteTargetUser.id);
    setDeleteTargetUser(null);
    showNotification(`Worker account "${deletedName}" has been deleted.`, 'info');
  };

  // Filtered workers list
  const filteredWorkers = useMemo(() => {
    return users.filter((u) => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = u.name?.toLowerCase().includes(q);
        const matchRole = u.role?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchPhone = u.phone?.toLowerCase().includes(q);
        const matchDept = u.department?.toLowerCase().includes(q);
        const matchPin = u.pin?.includes(q);
        if (!matchName && !matchRole && !matchEmail && !matchPhone && !matchDept && !matchPin) {
          return false;
        }
      }

      // Role filter
      if (selectedRoleFilter !== 'all' && u.role !== selectedRoleFilter) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'all') {
        const userStatus = u.status || 'active';
        if (userStatus !== selectedStatusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [users, searchTerm, selectedRoleFilter, selectedStatusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => (u.status || 'active') === 'active').length;
    const cashiers = users.filter((u) => u.role === 'Cashier').length;
    const managers = users.filter((u) => u.role === 'Manager').length;
    const inventory = users.filter((u) => u.role === 'Inventory Staff').length;
    const admins = users.filter((u) => u.role === 'Admin').length;
    return { total, active, cashiers, managers, inventory, admins };
  }, [users]);

  const roleBadges: Record<Role, { badge: string; border: string }> = {
    Admin: { badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40', border: 'border-rose-900/50' },
    Manager: { badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40', border: 'border-amber-900/50' },
    Cashier: { badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40', border: 'border-sky-900/50' },
    'Inventory Staff': { badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', border: 'border-emerald-900/50' },
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-950 border border-sky-800 text-sky-400 rounded-2xl shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-slate-100">
                  Staff & Worker Management
                </h2>
                <span className="bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {users.length} {users.length === 1 ? 'Worker' : 'Workers'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Add, edit, and delete staff accounts, configure 4-digit security PINs, roles, and terminal permissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddModal}
              className="bg-sky-600 hover:bg-sky-500 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-sky-600/25"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Worker</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
              title="Close window"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NOTIFICATION FEEDBACK BANNER */}
        {feedbackMessage && (
          <div
            className={`px-4 py-2 text-xs font-semibold flex items-center justify-between transition-all ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950 border-b border-emerald-800 text-emerald-300'
                : feedbackMessage.type === 'error'
                ? 'bg-rose-950 border-b border-rose-800 text-rose-300'
                : 'bg-sky-950 border-b border-sky-800 text-sky-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : feedbackMessage.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-sky-400" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-white ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* STATS OVERVIEW BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:px-6 bg-slate-950/60 border-b border-slate-800 shrink-0 text-xs">
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Workers</div>
              <div className="text-base font-extrabold text-slate-100">{stats.total}</div>
            </div>
            <div className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-lg">
              {stats.active} Active
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Cashiers (POS)</div>
              <div className="text-base font-extrabold text-sky-400">{stats.cashiers}</div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Front-desk</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Managers & Admins</div>
              <div className="text-base font-extrabold text-amber-400">{stats.managers + stats.admins}</div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Supervisors</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Inventory Staff</div>
              <div className="text-base font-extrabold text-emerald-400">{stats.inventory}</div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Stock Audit</span>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="p-3 sm:px-6 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" />
              <input
                type="text"
                placeholder="Search worker by name, role, email, phone, or PIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-medium"
              >
                <option value="all" className="bg-slate-900 text-slate-200">All Roles</option>
                <option value="Cashier" className="bg-slate-900 text-slate-200">Cashier</option>
                <option value="Manager" className="bg-slate-900 text-slate-200">Manager</option>
                <option value="Inventory Staff" className="bg-slate-900 text-slate-200">Inventory Staff</option>
                <option value="Admin" className="bg-slate-900 text-slate-200">Admin</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-medium"
              >
                <option value="all" className="bg-slate-900 text-slate-200">All Statuses</option>
                <option value="active" className="bg-slate-900 text-slate-200">Active Only</option>
                <option value="inactive" className="bg-slate-900 text-slate-200">Inactive Only</option>
              </select>
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            Showing <strong className="text-slate-200">{filteredWorkers.length}</strong> of {users.length} workers
          </div>
        </div>

        {/* WORKERS GRID LIST */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {filteredWorkers.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/40 border border-dashed border-slate-800 rounded-3xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200">No Workers Match Your Filters</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchTerm || selectedRoleFilter !== 'all' || selectedStatusFilter !== 'all'
                  ? 'Try clearing the search text or adjusting the role and status filters.'
                  : 'Get started by adding your first employee to the POS terminal.'}
              </p>
              {(searchTerm || selectedRoleFilter !== 'all' || selectedStatusFilter !== 'all') ? (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedRoleFilter('all');
                    setSelectedStatusFilter('all');
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition"
                >
                  Reset Filters
                </button>
              ) : (
                <button
                  onClick={handleOpenAddModal}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition"
                >
                  + Add First Worker
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWorkers.map((u) => {
                const isPinVisible = visiblePins[u.id];
                const isCopied = copiedPinId === u.id;
                const isCurrent = currentUser.id === u.id;
                const isInactive = u.status === 'inactive';
                const badgeConfig = roleBadges[u.role] || roleBadges.Cashier;

                return (
                  <div
                    key={u.id}
                    className={`bg-slate-950 border ${badgeConfig.border} p-4 rounded-2xl space-y-3.5 relative group hover:border-slate-700 transition shadow-md ${
                      isInactive ? 'opacity-70 bg-slate-950/60' : ''
                    }`}
                  >
                    {/* Top User Info */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-white font-extrabold text-base shadow border border-slate-700">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                              isInactive ? 'bg-slate-500' : 'bg-emerald-500'
                            }`}
                            title={isInactive ? 'Account Inactive' : 'Active Account'}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-100 text-sm">{u.name}</span>
                            {isCurrent && (
                              <span className="bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">
                                YOU (LOGGED IN)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span className="truncate max-w-[170px]">{u.email}</span>
                            </span>
                            {u.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-500" />
                                <span>{u.phone}</span>
                              </span>
                            )}
                          </div>
                          {u.department && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Building className="w-3 h-3 text-slate-500" />
                              <span>{u.department}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold ${badgeConfig.badge}`}>
                          {u.role}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isInactive
                              ? 'bg-rose-950/60 text-rose-400 border border-rose-900/60'
                              : 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/60'
                          }`}
                        >
                          {isInactive ? 'INACTIVE' : 'ACTIVE'}
                        </span>
                      </div>
                    </div>

                    {/* PIN Security Row */}
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-sky-400 shrink-0" />
                        <span className="text-[11px] text-slate-400 font-semibold">Security PIN:</span>
                        <span className="font-mono font-black text-sm text-sky-300 tracking-wider">
                          {isPinVisible ? u.pin : '••••'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Show/Hide PIN */}
                        <button
                          title={isPinVisible ? 'Hide PIN' : 'Reveal PIN'}
                          onClick={() => togglePinVisibility(u.id)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                        >
                          {isPinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        {/* Copy PIN */}
                        <button
                          title="Copy Security PIN"
                          onClick={() => handleCopyPin(u)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-sky-400 rounded-lg transition"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {/* Regenerate PIN */}
                        <button
                          title="Generate New Random Security PIN"
                          onClick={() => handleRegenerateWorkerPin(u)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-lg transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>

                        {/* Print Credential Slip */}
                        <button
                          title="Print Worker Credential Card / ID Slip"
                          onClick={() => setPrintedUser(u)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded-lg transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Metadata & Management Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                        <span className="flex items-center gap-1 font-mono text-amber-300 font-bold">
                          <Percent className="w-3 h-3 text-amber-400" />
                          <span>{u.commissionRate ?? 5}% Commission</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Toggle Active/Inactive */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          title={isInactive ? 'Activate Worker Account' : 'Deactivate Worker Account'}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition border ${
                            isInactive
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {isInactive ? 'Activate' : 'Deactivate'}
                        </button>

                        {/* Edit Worker */}
                        <button
                          type="button"
                          onClick={() => setEditingUser(u)}
                          title="Edit Worker Profile & Credentials"
                          className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-sky-300 border border-slate-800 rounded-lg transition flex items-center gap-1 text-[11px] font-semibold"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>

                        {/* Delete Worker - Safe Dialog Trigger */}
                        <button
                          type="button"
                          onClick={() => setDeleteTargetUser(u)}
                          title="Delete Worker Account"
                          className="p-1.5 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800 rounded-lg transition flex items-center gap-1 text-[11px] font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL 1: ADD NEW WORKER */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4 my-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-sky-950 border border-sky-800 text-sky-400 rounded-xl">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-base">Add New Worker Account</h3>
                    <p className="text-[11px] text-slate-400">Enroll new employee, configure role, and issue access PIN</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateWorker} className="space-y-3.5 text-xs">
                {/* Full Name & Role */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Worker Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mary Wanjiku"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Worker Role *</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-semibold"
                    >
                      <option value="Cashier">Cashier (POS Sales & Register)</option>
                      <option value="Manager">Manager (Full Store Operations)</option>
                      <option value="Inventory Staff">Inventory Staff (Stock & Receiving)</option>
                      <option value="Admin">Admin (Full System Access)</option>
                    </select>
                  </div>
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Phone / Mobile</label>
                    <input
                      type="tel"
                      placeholder="e.g. +254 712 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. mary@rofani.co.ke"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Status & Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Account Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-semibold"
                    >
                      <option value="active">Active (Can Log In)</option>
                      <option value="inactive">Inactive (Suspended / On Leave)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Department / Branch</label>
                    <input
                      type="text"
                      placeholder="e.g. Register 1 / Main Shop"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Commission Rate */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Daily Sales Commission Rate (% Pay on Completed Sales)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    required
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Security PIN Box */}
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                      <span>Security 4-Digit PIN *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setPin(generateRandomPin())}
                      className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-bold text-[10px] bg-sky-950 border border-sky-800 px-2.5 py-1 rounded-lg transition"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" /> Auto Generate PIN
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showFormPin ? 'text' : 'password'}
                      required
                      maxLength={6}
                      placeholder="1234"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sky-400 font-mono font-black text-lg text-center tracking-widest focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPin(!showFormPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      title={showFormPin ? 'Mask PIN' : 'Reveal PIN'}
                    >
                      {showFormPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    This security PIN is used by the worker to unlock the POS terminal and clock in for shifts.
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Administrative Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Morning cashier, trusted keyholder"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-500 text-white font-extrabold px-5 py-2 rounded-xl shadow-lg shadow-sky-600/25 transition flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Save & Add Worker</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: EDIT WORKER */}
        {editingUser && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4 my-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-sky-950 border border-sky-800 text-sky-400 rounded-xl">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-base">Edit Worker Profile & Role</h3>
                    <p className="text-[11px] text-slate-400">Modify details, contact information, and security PIN</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditWorker} className="space-y-3.5 text-xs">
                {/* Full Name & Role */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Worker Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Worker Role *</label>
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as Role })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-semibold"
                    >
                      <option value="Cashier">Cashier</option>
                      <option value="Manager">Manager</option>
                      <option value="Inventory Staff">Inventory Staff</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Phone / Mobile</label>
                    <input
                      type="tel"
                      value={editingUser.phone || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editingUser.email || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Status & Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Account Status</label>
                    <select
                      value={editingUser.status || 'active'}
                      onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-semibold"
                    >
                      <option value="active">Active (Can Log In)</option>
                      <option value="inactive">Inactive (Suspended / On Leave)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Department / Branch</label>
                    <input
                      type="text"
                      value={editingUser.department || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Commission Rate */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Daily Sales Commission Rate (% Pay on Sales)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    required
                    value={editingUser.commissionRate ?? 5}
                    onChange={(e) => setEditingUser({ ...editingUser, commissionRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Security PIN */}
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                      <span>Security PIN</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, pin: generateRandomPin() })}
                      className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-bold text-[10px] bg-sky-950 border border-sky-800 px-2.5 py-1 rounded-lg transition"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" /> Generate New PIN
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={editingUser.pin}
                    onChange={(e) => setEditingUser({ ...editingUser, pin: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sky-400 font-mono font-black text-lg text-center tracking-widest focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-500 text-white font-extrabold px-5 py-2 rounded-xl shadow-lg shadow-sky-600/25 transition"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: DELETE WORKER CONFIRMATION DIALOG */}
        {deleteTargetUser && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-rose-900/60 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-950 border border-rose-800 text-rose-400 rounded-2xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base">Delete Worker Account</h3>
                  <p className="text-xs text-rose-400 font-medium">Permanent Removal Confirmation</p>
                </div>
              </div>

              {/* Target Worker Summary */}
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Worker Name:</span>
                  <strong className="text-slate-100 text-sm">{deleteTargetUser.name}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Role:</span>
                  <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold ${roleBadges[deleteTargetUser.role]?.badge || ''}`}>
                    {deleteTargetUser.role}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-slate-300 font-mono text-[11px]">{deleteTargetUser.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Security PIN:</span>
                  <span className="text-sky-400 font-mono font-bold">••••</span>
                </div>
              </div>

              {/* Warnings and Guardrails */}
              {users.length <= 1 ? (
                <div className="bg-rose-950/60 border border-rose-800 p-3 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Cannot delete:</strong> This is the only worker account in the system. At least one user is required to operate the terminal.
                  </span>
                </div>
              ) : deleteTargetUser.role === 'Admin' && users.filter((u) => u.role === 'Admin').length <= 1 ? (
                <div className="bg-rose-950/60 border border-rose-800 p-3 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Cannot delete:</strong> {deleteTargetUser.name} is the last remaining Administrator. Promote another staff member to Admin before deleting this account.
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-300">
                    Are you sure you want to permanently delete <strong>{deleteTargetUser.name}</strong>?
                  </p>
                  {currentUser.id === deleteTargetUser.id && (
                    <div className="bg-amber-950/60 border border-amber-800 p-3 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Note:</strong> You are currently logged in as this user. Deleting will automatically switch your active session to another administrator.
                      </span>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500">
                    This will remove their login PIN and revoke access to the POS terminal. Historical transactions and attendance logs will remain preserved.
                  </p>
                </div>
              )}

              {/* Dialog Actions */}
              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTargetUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300 hover:text-white transition text-xs font-semibold"
                >
                  Cancel
                </button>
                {users.length > 1 && !(deleteTargetUser.role === 'Admin' && users.filter((u) => u.role === 'Admin').length <= 1) && (
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-5 py-2 rounded-xl shadow-lg shadow-rose-600/25 transition text-xs flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Permanently Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: PRINT WORKER CREDENTIAL CARD */}
        {printedUser && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Worker Credential Slip</span>
                </div>
                <button onClick={() => setPrintedUser(null)} className="p-1 hover:bg-slate-800 text-slate-400 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Printable Slip Box */}
              <div className="bg-white text-slate-900 p-5 rounded-2xl space-y-3 font-mono text-center shadow-inner border border-slate-200">
                <div className="border-b pb-2 border-slate-300">
                  <div className="font-black text-sm uppercase tracking-wider text-slate-900">ROFANI RETAIL POS</div>
                  <div className="text-[10px] text-slate-500 font-sans">STAFF TERMINAL ACCESS CARD</div>
                </div>

                <div className="space-y-1 text-xs py-1">
                  <div className="text-[10px] text-slate-500 uppercase">Worker Name:</div>
                  <div className="font-extrabold text-base text-slate-900">{printedUser.name}</div>

                  <div className="text-[10px] text-slate-500 uppercase mt-2">Assigned Role:</div>
                  <div className="font-bold text-xs uppercase text-sky-700 bg-sky-50 px-2 py-0.5 rounded w-fit mx-auto border border-sky-200">
                    {printedUser.role}
                  </div>
                </div>

                <div className="bg-slate-100 border border-slate-300 p-3 rounded-xl my-2">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Terminal Security PIN:</div>
                  <div className="text-3xl font-black text-slate-900 tracking-widest mt-1 font-mono">{printedUser.pin}</div>
                </div>

                <div className="text-[9px] text-slate-500 italic pt-1">
                  Keep this security PIN confidential. Do not share with unauthorized staff.
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setPrintedUser(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow transition"
                >
                  <Printer className="w-4 h-4" /> Print Credential Card
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
