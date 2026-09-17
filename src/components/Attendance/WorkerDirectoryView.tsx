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
  Search,
  Filter,
  Phone,
  Building,
  Mail,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Percent,
  Calendar,
  Layers,
  CreditCard,
  Award,
  RefreshCw,
  Clock
} from 'lucide-react';
import { User, Role, Transaction, AttendanceRecord, WorkerLoan } from '../../types';

interface WorkerDirectoryViewProps {
  allUsers: User[];
  currentUser: User;
  onAddUser?: (newUser: User) => void;
  onUpdateUser?: (updatedUser: User) => void;
  onDeleteUser?: (userId: string) => void;
  onOpenStaffModal?: () => void;
  transactions?: Transaction[];
  attendanceRecords?: AttendanceRecord[];
  workerLoans?: WorkerLoan[];
}

export const WorkerDirectoryView: React.FC<WorkerDirectoryViewProps> = ({
  allUsers,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onOpenStaffModal,
  transactions = [],
  attendanceRecords = [],
  workerLoans = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);
  const [printedUser, setPrintedUser] = useState<User | null>(null);

  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

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

  function generateRandomPin(): string {
    const min = 1000;
    const max = 9999;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
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
    showToast(`Copied security PIN for ${user.name}`, 'info');
    setTimeout(() => setCopiedPinId(null), 2000);
  };

  const handleRegenerateWorkerPin = (user: User) => {
    if (!onUpdateUser) return;
    const newPin = generateRandomPin();
    onUpdateUser({
      ...user,
      pin: newPin,
    });
    showToast(`Regenerated new PIN (${newPin}) for ${user.name}`, 'success');
  };

  const handleToggleStatus = (user: User) => {
    if (!onUpdateUser) return;
    const newStatus = user.status === 'inactive' ? 'active' : 'inactive';
    onUpdateUser({
      ...user,
      status: newStatus,
    });
    showToast(`Worker ${user.name} is now ${newStatus.toUpperCase()}`, newStatus === 'active' ? 'success' : 'info');
  };

  const handleOpenAdd = () => {
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
      showToast('Please enter worker full name.', 'error');
      return;
    }

    const trimmedPin = pin.trim();
    if (!trimmedPin || trimmedPin.length < 4) {
      showToast('PIN must be at least 4 digits.', 'error');
      return;
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      role,
      phone: phone.trim() || undefined,
      email: email.trim() || `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@rofani.co.ke`,
      status,
      department: department.trim() || undefined,
      hireDate: new Date().toISOString().slice(0, 10),
      pin: trimmedPin,
      commissionRate: Number(commissionRate) || 0,
      notes: notes.trim() || undefined,
    };

    if (onAddUser) {
      onAddUser(newUser);
    }
    setShowAddModal(false);
    showToast(`Worker "${newUser.name}" (${newUser.role}) successfully added!`, 'success');
  };

  const handleSaveEditWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.name.trim()) return;

    if (onUpdateUser) {
      onUpdateUser(editingUser);
    }
    showToast(`Updated profile for ${editingUser.name}`, 'success');
    setEditingUser(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetUser) return;

    if (allUsers.length <= 1) {
      showToast('Cannot delete the only remaining worker in the system.', 'error');
      setDeleteTargetUser(null);
      return;
    }

    const adminCount = allUsers.filter((u) => u.role === 'Admin').length;
    if (deleteTargetUser.role === 'Admin' && adminCount <= 1) {
      showToast('Cannot delete the last remaining Admin. Assign another Admin first.', 'error');
      setDeleteTargetUser(null);
      return;
    }

    const targetName = deleteTargetUser.name;
    if (onDeleteUser) {
      onDeleteUser(deleteTargetUser.id);
    }
    setDeleteTargetUser(null);
    showToast(`Worker account "${targetName}" has been deleted.`, 'info');
  };

  // Filtered workers list
  const filteredWorkers = useMemo(() => {
    return allUsers.filter((u) => {
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

      if (selectedRoleFilter !== 'all' && u.role !== selectedRoleFilter) {
        return false;
      }

      if (selectedStatusFilter !== 'all') {
        const userStatus = u.status || 'active';
        if (userStatus !== selectedStatusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [allUsers, searchTerm, selectedRoleFilter, selectedStatusFilter]);

  // Today string
  const todayStr = new Date().toISOString().slice(0, 10);

  // Role badges
  const roleBadges: Record<Role, { badge: string; border: string }> = {
    Admin: { badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40', border: 'border-rose-900/40' },
    Manager: { badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40', border: 'border-amber-900/40' },
    Cashier: { badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40', border: 'border-sky-900/40' },
    'Inventory Staff': { badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', border: 'border-emerald-900/40' },
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-lg transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-800 text-emerald-300'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/90 border-rose-800 text-rose-300'
              : 'bg-sky-950/90 border-sky-800 text-sky-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : toastMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-sky-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-950/80 border border-purple-800 text-purple-300 rounded-2xl shadow-inner">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-extrabold text-lg text-slate-100">Worker Directory & Staff Roster</h2>
              <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
                {allUsers.length} Workers
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Manage shop employees, add new cashiers & managers, configure 4-digit PINs, and manage staff credentials
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenAdd}
            className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-purple-600/25"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add New Worker</span>
          </button>

          {onOpenStaffModal && (
            <button
              onClick={onOpenStaffModal}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 border border-slate-700"
            >
              <KeyRound className="w-4 h-4 text-sky-400" />
              <span>Full Staff PIN Manager</span>
            </button>
          )}
        </div>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1 shadow-sm">
          <div className="text-[11px] text-slate-400 font-semibold uppercase flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>Total Staff</span>
          </div>
          <div className="text-2xl font-black text-slate-100">{allUsers.length}</div>
          <div className="text-[10px] text-emerald-400 font-semibold">
            {allUsers.filter((u) => (u.status || 'active') === 'active').length} Active Accounts
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1 shadow-sm">
          <div className="text-[11px] text-slate-400 font-semibold uppercase flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Clocked In Today</span>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {attendanceRecords.filter((a) => a.date === todayStr && a.status === 'Present').length}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Present at Shift</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1 shadow-sm">
          <div className="text-[11px] text-slate-400 font-semibold uppercase flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            <span>Active Worker Loans</span>
          </div>
          <div className="text-2xl font-black text-amber-400">
            {workerLoans.filter((l) => l.status === 'Active').length}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Advances Issued</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1 shadow-sm">
          <div className="text-[11px] text-slate-400 font-semibold uppercase flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-purple-400" />
            <span>Cashiers & Managers</span>
          </div>
          <div className="text-2xl font-black text-purple-300">
            {allUsers.filter((u) => u.role === 'Cashier').length} / {allUsers.filter((u) => u.role === 'Manager' || u.role === 'Admin').length}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">POS / Management</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" />
            <input
              type="text"
              placeholder="Search worker by name, role, email, phone, or PIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-7 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
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
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
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
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-medium"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Statuses</option>
              <option value="active" className="bg-slate-900 text-slate-200">Active</option>
              <option value="inactive" className="bg-slate-900 text-slate-200">Inactive</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Showing <strong className="text-slate-200">{filteredWorkers.length}</strong> of {allUsers.length} workers
        </div>
      </div>

      {/* Workers Grid */}
      {filteredWorkers.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-dashed border-slate-800 rounded-3xl p-6 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <p className="text-base font-bold text-slate-200">No Workers Found</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm || selectedRoleFilter !== 'all' || selectedStatusFilter !== 'all'
              ? 'Try modifying your search keywords or clearing your role and status filters.'
              : 'Add your first shop worker to start assigning roles and terminal PINs.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition"
          >
            + Add Worker Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkers.map((u) => {
            const isPinVisible = visiblePins[u.id];
            const isCopied = copiedPinId === u.id;
            const isCurrent = currentUser.id === u.id;
            const isInactive = u.status === 'inactive';
            const badgeConfig = roleBadges[u.role] || roleBadges.Cashier;

            // Today attendance
            const todayAttendance = attendanceRecords.find((a) => a.employeeId === u.id && a.date === todayStr);
            // Worker loans
            const loans = workerLoans.filter((l) => l.workerId === u.id && l.status === 'Active');
            const totalLoanBal = loans.reduce((sum, l) => sum + (l.balanceDue || 0), 0);

            return (
              <div
                key={u.id}
                className={`bg-slate-900 border ${badgeConfig.border} p-5 rounded-3xl space-y-4 relative group hover:border-slate-700 transition shadow-md ${
                  isInactive ? 'opacity-70 bg-slate-900/60' : ''
                }`}
              >
                {/* Header Profile */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-white font-black text-lg shadow border border-slate-700">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                          isInactive ? 'bg-slate-500' : 'bg-emerald-500'
                        }`}
                        title={isInactive ? 'Inactive' : 'Active'}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-slate-100 text-sm">{u.name}</span>
                        {isCurrent && (
                          <span className="bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[170px] mt-0.5">
                        {u.email}
                      </div>
                      {u.phone && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{u.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
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

                {/* PIN and Security Box */}
                <div className="bg-slate-950 border border-slate-800/90 p-2.5 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="text-[11px] text-slate-400 font-semibold">Security PIN:</span>
                    <span className="font-mono font-black text-sm text-sky-300 tracking-wider">
                      {isPinVisible ? u.pin : '••••'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      title={isPinVisible ? 'Hide PIN' : 'Show PIN'}
                      onClick={() => togglePinVisibility(u.id)}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                    >
                      {isPinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      title="Copy Security PIN"
                      onClick={() => handleCopyPin(u)}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-sky-400 rounded-lg transition"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      title="Generate New Security PIN"
                      onClick={() => handleRegenerateWorkerPin(u)}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-lg transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      title="Print Worker Credential Card"
                      onClick={() => setPrintedUser(u)}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded-lg transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Badges / Stats Info */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-950/60 border border-slate-800 p-2 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Commission Rate</span>
                    <span className="font-mono font-bold text-amber-300">{u.commissionRate ?? 5}% Sales Pay</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-2 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Today's Shift</span>
                    <span
                      className={`font-semibold ${
                        todayAttendance
                          ? todayAttendance.status === 'Present'
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {todayAttendance ? todayAttendance.status : 'Not Clocked In'}
                    </span>
                  </div>
                </div>

                {/* Active Loans Notice if any */}
                {totalLoanBal > 0 && (
                  <div className="bg-amber-950/40 border border-amber-900/40 px-3 py-1.5 rounded-xl text-[11px] text-amber-300 flex items-center justify-between">
                    <span>Active Loan Balance:</span>
                    <strong className="font-mono">KSh {totalLoanBal.toLocaleString()}</strong>
                  </div>
                )}

                {/* Worker Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(u)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition border ${
                      isInactive
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {isInactive ? 'Activate' : 'Deactivate'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingUser(u)}
                      className="px-3 py-1 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl transition flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTargetUser(u)}
                      className="px-3 py-1 bg-slate-950 hover:bg-rose-950 text-slate-300 hover:text-rose-400 border border-slate-800 hover:border-rose-900 rounded-xl transition flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD NEW WORKER */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-950 border border-purple-800 text-purple-300 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base">Add New Worker Account</h3>
                  <p className="text-[11px] text-slate-400">Enroll new staff member, set role & terminal PIN</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Worker Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mary Wanjiku"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Worker Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500 font-semibold"
                  >
                    <option value="Cashier">Cashier (POS Sales & Register)</option>
                    <option value="Manager">Manager (Full Store Operations)</option>
                    <option value="Inventory Staff">Inventory Staff (Stock & Receiving)</option>
                    <option value="Admin">Admin (Full System Access)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone / Mobile</label>
                  <input
                    type="tel"
                    placeholder="e.g. +254 712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. mary@rofani.co.ke"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Account Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500 font-semibold"
                  >
                    <option value="active">Active (Can Log In)</option>
                    <option value="inactive">Inactive (Suspended / On Leave)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Department / Branch</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Shop / POS Counter"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

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
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Security PIN */}
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                    <span>Security 4-Digit PIN *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPin(generateRandomPin())}
                    className="text-purple-300 hover:text-purple-200 flex items-center gap-1 font-bold text-[10px] bg-purple-950 border border-purple-800 px-2.5 py-1 rounded-lg transition"
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sky-400 font-mono font-black text-lg text-center tracking-widest focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPin(!showFormPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showFormPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Administrative Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Assigned to morning shift"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

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
                  className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-5 py-2 rounded-xl shadow-lg shadow-purple-600/25 transition flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Save Worker</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT WORKER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-950 border border-purple-800 text-purple-300 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base">Edit Worker Profile</h3>
                  <p className="text-[11px] text-slate-400">Update employee details, role, and security PIN</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Worker Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Worker Role *</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as Role })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500 font-semibold"
                  >
                    <option value="Cashier">Cashier</option>
                    <option value="Manager">Manager</option>
                    <option value="Inventory Staff">Inventory Staff</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone / Mobile</label>
                  <input
                    type="tel"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Account Status</label>
                  <select
                    value={editingUser.status || 'active'}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500 font-semibold"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Department / Branch</label>
                  <input
                    type="text"
                    value={editingUser.department || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Daily Sales Commission Rate (% Pay)
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

              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                    <span>Security PIN</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditingUser({ ...editingUser, pin: generateRandomPin() })}
                    className="text-purple-300 hover:text-purple-200 flex items-center gap-1 font-bold text-[10px] bg-purple-950 border border-purple-800 px-2.5 py-1 rounded-lg transition"
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
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sky-400 font-mono font-black text-lg text-center tracking-widest focus:outline-none focus:border-purple-500"
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
                  className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-5 py-2 rounded-xl shadow-lg shadow-purple-600/25 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION DIALOG */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-900/60 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-950 border border-rose-800 text-rose-400 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-100 text-base">Delete Worker Account</h3>
                <p className="text-xs text-rose-400 font-medium">Confirm Permanent Deletion</p>
              </div>
            </div>

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
            </div>

            {allUsers.length <= 1 ? (
              <div className="bg-rose-950/60 border border-rose-800 p-3 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Cannot delete:</strong> This is the only worker account in the system.
                </span>
              </div>
            ) : deleteTargetUser.role === 'Admin' && allUsers.filter((u) => u.role === 'Admin').length <= 1 ? (
              <div className="bg-rose-950/60 border border-rose-800 p-3 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Cannot delete:</strong> {deleteTargetUser.name} is the last remaining Administrator.
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
                      <strong>Notice:</strong> You are currently logged in as this user. Deleting will automatically switch your session to another administrator.
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-slate-500">
                  Their access PIN will be revoked immediately. Previous sales transactions and shift history will remain intact for reporting.
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300 hover:text-white transition text-xs font-semibold"
              >
                Cancel
              </button>
              {allUsers.length > 1 && !(deleteTargetUser.role === 'Admin' && allUsers.filter((u) => u.role === 'Admin').length <= 1) && (
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-5 py-2 rounded-xl shadow-lg shadow-rose-600/25 transition text-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Yes, Delete Worker</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRINT CREDENTIAL CARD */}
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
  );
};
