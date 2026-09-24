import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Sliders,
  RotateCcw,
  CheckCircle2,
  Check,
  X,
  Sparkles,
  ShoppingBag,
  PackagePlus,
  Boxes,
  DollarSign
} from 'lucide-react';
import { User, WorkerPermissions, Role } from '../../types';
import {
  PERMISSION_DEFINITIONS,
  DEFAULT_ROLE_WORKER_PERMISSIONS,
  getWorkerPermissions,
  PermissionDefinition,
  applyRoleToWorker,
  getUserRoles,
  hasRole,
  ALL_21_GRANULAR_ROLES,
  assignAll21RolesToWorker,
} from '../../utils/permissions';

interface FlexibleRolesMatrixViewProps {
  users: User[];
  onUpdateUser: (updatedUser: User) => void;
  currentUser: User;
  onOpenDetailedModal: (user: User) => void;
}

export const FlexibleRolesMatrixView: React.FC<FlexibleRolesMatrixViewProps> = ({
  users,
  onUpdateUser,
  currentUser,
  onOpenDetailedModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'sales' | 'stockIns' | 'stockSetup' | 'expenses' | 'other'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [lastUpdatedNotice, setLastUpdatedNotice] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const roles = getUserRoles(u);
      const matchRole = roles.some((r) => r.toLowerCase().includes(q));
      const matchEmail = u.email.toLowerCase().includes(q);
      if (!matchName && !matchRole && !matchEmail) return false;
    }
    if (roleFilter !== 'all' && !hasRole(u, roleFilter as Role)) return false;
    return true;
  });

  const displayedPermissions = PERMISSION_DEFINITIONS.filter((p) => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    return true;
  });

  const handleTogglePermission = (targetUser: User, permissionKey: keyof WorkerPermissions) => {
    if (hasRole(targetUser, 'Admin') && !hasRole(currentUser, 'Admin')) {
      alert('Security Notice: Only an Administrator can alter Administrator permissions.');
      return;
    }

    const currentPerms = getWorkerPermissions(targetUser);
    const newValue = !currentPerms[permissionKey];
    const newPerms = {
      ...currentPerms,
      [permissionKey]: newValue,
    };

    const matchingGranular = ALL_21_GRANULAR_ROLES.find((g) => g.key === permissionKey);
    const currentRoles = getUserRoles(targetUser);
    let nextRoles = [...currentRoles];
    if (matchingGranular) {
      if (newValue) {
        if (!nextRoles.includes(matchingGranular.role)) {
          nextRoles.push(matchingGranular.role);
        }
      } else {
        nextRoles = nextRoles.filter((r) => r !== matchingGranular.role);
      }
    }

    const updatedUser: User = {
      ...targetUser,
      roles: nextRoles.length > 0 ? nextRoles : [targetUser.role || 'Cashier'],
      assignedRoles: nextRoles,
      permissions: newPerms,
    };

    onUpdateUser(updatedUser);
    const permDef = PERMISSION_DEFINITIONS.find((p) => p.key === permissionKey);
    setLastUpdatedNotice(
      `Updated "${permDef?.label || permissionKey}" to ${newValue ? 'ENABLED' : 'DISABLED'} for ${targetUser.name}`
    );
    setTimeout(() => {
      setLastUpdatedNotice(null);
    }, 3000);
  };

  const handleQuickChangeRole = (worker: User, newRole: Role) => {
    if (hasRole(worker, 'Admin') && !hasRole(currentUser, 'Admin')) {
      alert('Security Notice: Only an Administrator can alter Administrator accounts.');
      return;
    }
    const updated = applyRoleToWorker(worker, newRole);
    onUpdateUser(updated);
    setLastUpdatedNotice(`Assigned "${newRole}" to ${worker.name} with updated defaults!`);
    setTimeout(() => {
      setLastUpdatedNotice(null);
    }, 3000);
  };

  const handleAssignAll21Roles = (worker: User) => {
    if (hasRole(worker, 'Admin') && !hasRole(currentUser, 'Admin')) {
      alert('Security Notice: Only an Administrator can alter Administrator accounts.');
      return;
    }
    const updated = assignAll21RolesToWorker(worker);
    onUpdateUser(updated);
    setLastUpdatedNotice(`Assigned all 21 functional roles to ${worker.name}!`);
    setTimeout(() => {
      setLastUpdatedNotice(null);
    }, 3000);
  };

  const categoryHeaders: {
    key: 'sales' | 'stockIns' | 'stockSetup' | 'expenses' | 'other';
    label: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    { key: 'sales', label: 'Sales Role (5)', icon: <ShoppingBag className="w-3.5 h-3.5" />, color: 'text-emerald-400' },
    { key: 'stockIns', label: 'Stock Ins Roles (4)', icon: <PackagePlus className="w-3.5 h-3.5" />, color: 'text-sky-400' },
    { key: 'stockSetup', label: 'Stock Setup Roles (4)', icon: <Boxes className="w-3.5 h-3.5" />, color: 'text-indigo-400' },
    { key: 'expenses', label: 'Expenses Roles (1)', icon: <DollarSign className="w-3.5 h-3.5" />, color: 'text-amber-400' },
    { key: 'other', label: 'Other Roles (7)', icon: <Sliders className="w-3.5 h-3.5" />, color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-4 flex flex-col h-full">
      {/* FILTER CONTROLS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" />
            <input
              type="text"
              placeholder="Filter workers by name, role..."
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
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-medium"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Roles</option>
              <option value="Sales Role" className="bg-slate-900 text-slate-200">Sales Role</option>
              <option value="Stock Ins Role" className="bg-slate-900 text-slate-200">Stock Ins Role</option>
              <option value="Stock Setup Role" className="bg-slate-900 text-slate-200">Stock Setup Role</option>
              <option value="Expenses Role" className="bg-slate-900 text-slate-200">Expenses Role</option>
              <option value="Cashier" className="bg-slate-900 text-slate-200">Cashier</option>
              <option value="Inventory Staff" className="bg-slate-900 text-slate-200">Inventory Staff</option>
              <option value="Manager" className="bg-slate-900 text-slate-200">Manager</option>
              <option value="Admin" className="bg-slate-900 text-slate-200">Admin</option>
            </select>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                categoryFilter === 'all'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All (21 Roles)
            </button>
            {categoryHeaders.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategoryFilter(cat.key)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition whitespace-nowrap flex items-center gap-1 ${
                  categoryFilter === cat.key
                    ? 'bg-slate-800 text-slate-100 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className={cat.color}>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live Feedback Toast */}
        {lastUpdatedNotice && (
          <div className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-3 py-1 rounded-xl flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lastUpdatedNotice}</span>
          </div>
        )}
      </div>

      {/* MATRIX TABLE CONTAINER */}
      <div className="bg-slate-950/90 rounded-2xl border border-slate-800 overflow-hidden flex-1 flex flex-col shadow-inner">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 sticky top-0 z-20">
                <th className="p-3.5 min-w-[200px] sticky left-0 bg-slate-900/95 z-30 border-r border-slate-800 font-extrabold text-slate-200">
                  Worker / Role
                </th>
                {displayedPermissions.map((perm) => (
                  <th
                    key={perm.key}
                    className="p-2.5 text-center min-w-[130px] border-r border-slate-800/70 font-semibold text-[10px]"
                    title={`${perm.label}: ${perm.description}`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-extrabold text-slate-200 whitespace-nowrap">{perm.label}</span>
                      <span className="text-[9px] text-slate-500 font-mono tracking-tight font-normal">
                        {perm.categoryLabel}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="p-2.5 text-center min-w-[100px] font-bold text-slate-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={displayedPermissions.length + 2}
                    className="p-8 text-center text-slate-500"
                  >
                    No workers matched the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((worker) => {
                  const workerPerms = getWorkerPermissions(worker);
                  const activePermCount = Object.values(workerPerms).filter(Boolean).length;
                  const isCurrent = worker.id === currentUser.id;

                  return (
                    <tr
                      key={worker.id}
                      className="hover:bg-slate-900/50 transition-colors group"
                    >
                      {/* Worker Info Col (Sticky left) */}
                      <td className="p-3.5 sticky left-0 bg-slate-950/95 group-hover:bg-slate-900/95 z-10 border-r border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white text-xs border border-slate-700 shrink-0">
                            {worker.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-slate-100 truncate text-xs">
                                {worker.name}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-1 py-0.2 rounded font-mono font-bold">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <select
                                value={worker.role}
                                onChange={(e) => handleQuickChangeRole(worker, e.target.value as Role)}
                                className="bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 text-[10px] font-bold rounded px-1.5 py-0.5 focus:outline-none focus:border-sky-500 cursor-pointer shadow-sm transition"
                                title="Change worker role and apply its default permissions"
                              >
                                <option value="Sales Role">Sales Role</option>
                                <option value="Stock Ins Role">Stock Ins</option>
                                <option value="Stock Setup Role">Stock Setup</option>
                                <option value="Expenses Role">Expenses</option>
                                <option value="Cashier">Cashier</option>
                                <option value="Inventory Staff">Inventory</option>
                                <option value="Manager">Manager</option>
                                <option value="Admin">Admin</option>
                              </select>
                              <span className="text-emerald-400 font-bold font-mono text-[10px] shrink-0">
                                {activePermCount}/21
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-1 flex-wrap max-w-[220px]">
                              {getUserRoles(worker).map((r) => (
                                <span
                                  key={r}
                                  className="text-[8px] bg-slate-900/90 border border-slate-700/80 text-slate-300 px-1 py-0.2 rounded font-mono"
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                            {worker.customRoleTitle && (
                              <span className="text-[9px] text-indigo-300 bg-indigo-950/80 border border-indigo-800/80 px-1.5 py-0.2 rounded font-semibold inline-block mt-0.5">
                                {worker.customRoleTitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Permission Columns */}
                      {displayedPermissions.map((perm) => {
                        const isChecked = !!workerPerms[perm.key];
                        return (
                          <td
                            key={perm.key}
                            onClick={() => handleTogglePermission(worker, perm.key)}
                            className="p-2 text-center border-r border-slate-800/50 cursor-pointer hover:bg-slate-800/40 transition select-none"
                            title={`Click to ${isChecked ? 'revoke' : 'grant'} "${perm.label}" for ${worker.name}`}
                          >
                            <div className="flex items-center justify-center">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                  isChecked
                                    ? 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-400 shadow-sm'
                                    : 'bg-slate-900 border border-slate-800 text-slate-600 hover:border-slate-700'
                                }`}
                              >
                                {isChecked ? (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}

                      {/* Action Col */}
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => onOpenDetailedModal(worker)}
                          className="text-[11px] font-bold text-sky-400 hover:text-sky-300 bg-sky-950 hover:bg-sky-900 border border-sky-800 px-2.5 py-1 rounded-lg transition"
                          title="Open full detailed flexible permissions editor"
                        >
                          Customize
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer hints */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/60 inline-flex items-center justify-center text-emerald-400 text-[9px] font-bold">✓</span>
              <span>Permission Enabled</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-900 border border-slate-800 inline-block" />
              <span>Restricted / Disabled</span>
            </span>
          </div>
          <div>
            Click any cell to toggle. Changes take effect across POS and inventory immediately.
          </div>
        </div>
      </div>
    </div>
  );
};
