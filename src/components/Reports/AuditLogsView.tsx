import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  Package,
  Receipt,
  RotateCcw,
  Clock,
  Sparkles,
  Info,
  CheckCircle,
  Layers,
} from 'lucide-react';
import { SensitiveActionLog, SensitiveActionCategory, Role } from '../../types';
import { exportAuditLogsToCSV } from '../../utils/auditLogger';

interface AuditLogsViewProps {
  logs: SensitiveActionLog[];
  onClose?: () => void;
  initialCategory?: SensitiveActionCategory;
  initialRoleFilter?: string;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  logs,
  onClose,
  initialCategory,
  initialRoleFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>(initialRoleFilter || 'All');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'All');
  const [selectedWorker, setSelectedWorker] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Extract unique roles that were actually used for authorization
  const availableAuthorizingRoles = useMemo(() => {
    const roleSet = new Set<string>();
    logs.forEach((log) => {
      if (log.authorizingRole) roleSet.add(log.authorizingRole);
    });
    return Array.from(roleSet).sort();
  }, [logs]);

  // Extract unique workers
  const availableWorkers = useMemo(() => {
    const workerSet = new Set<string>();
    logs.forEach((log) => {
      if (log.userName) workerSet.add(log.userName);
    });
    return Array.from(workerSet).sort();
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    return logs.filter((log) => {
      // 1. Text search
      const matchesSearch =
        !searchTerm.trim() ||
        log.actionTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.targetName && log.targetName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.authorizingRole && log.authorizingRole.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.reason && log.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.details?.summary && log.details.summary.toLowerCase().includes(searchTerm.toLowerCase()));

      // 2. Authorizing Role filter
      const matchesRole = selectedRole === 'All' || log.authorizingRole === selectedRole;

      // 3. Category filter
      const matchesCategory = selectedCategory === 'All' || log.category === selectedCategory;

      // 4. Worker filter
      const matchesWorker = selectedWorker === 'All' || log.userName === selectedWorker;

      // 5. Date filter
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const logTime = new Date(log.timestamp).getTime();
        const diffMs = now - logTime;
        if (dateFilter === 'today') {
          matchesDate = diffMs <= 1000 * 60 * 60 * 24;
        } else if (dateFilter === '7days') {
          matchesDate = diffMs <= 1000 * 60 * 60 * 24 * 7;
        } else if (dateFilter === '30days') {
          matchesDate = diffMs <= 1000 * 60 * 60 * 24 * 30;
        }
      }

      return matchesSearch && matchesRole && matchesCategory && matchesWorker && matchesDate;
    });
  }, [logs, searchTerm, selectedRole, selectedCategory, selectedWorker, dateFilter]);

  // Stats KPI summary
  const stats = useMemo(() => {
    const total = logs.length;
    const expenseActions = logs.filter((l) => l.category === 'expenses').length;
    const inventoryActions = logs.filter((l) => l.category === 'inventory' || l.category === 'stock').length;
    const multiRoleWorkersCount = new Set(
      logs.filter((l) => (l.assignedRolesSnapshot || []).length > 1).map((l) => l.userId)
    ).size;

    return {
      total,
      expenseActions,
      inventoryActions,
      multiRoleWorkersCount,
      uniqueRolesUsed: availableAuthorizingRoles.length,
    };
  }, [logs, availableAuthorizingRoles]);

  const getActionBadgeColor = (actionType: string) => {
    if (actionType.startsWith('DELETE') || actionType.startsWith('CLEAR') || actionType.startsWith('RESET')) {
      return 'bg-rose-950/80 text-rose-300 border-rose-800';
    }
    if (actionType.includes('MODIFY') || actionType.includes('ADJUST')) {
      return 'bg-amber-950/80 text-amber-300 border-amber-800';
    }
    if (actionType.includes('ADD') || actionType.includes('RESTOCK')) {
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
    }
    return 'bg-sky-950/80 text-sky-300 border-sky-800';
  };

  const getRoleBadgeStyle = (role: Role) => {
    if (role === 'Admin') {
      return 'bg-purple-950 text-purple-300 border-purple-800 font-bold';
    }
    if (role === 'Manager') {
      return 'bg-indigo-950 text-indigo-300 border-indigo-800 font-bold';
    }
    if (role === 'Expenses Role' || role.includes('expense')) {
      return 'bg-amber-950 text-amber-300 border-amber-800 font-bold';
    }
    if (role === 'Inventory Staff' || role.includes('Stock') || role.includes('stock')) {
      return 'bg-sky-950 text-sky-300 border-sky-800 font-bold';
    }
    return 'bg-emerald-950 text-emerald-300 border-emerald-800 font-medium';
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-950 border border-sky-800 text-sky-400 rounded-xl shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Security & Compliance
              </span>
              <span className="text-xs text-slate-400 font-mono">Immutable Audit Trail</span>
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5">Worker Role Authorization Audit Logs</h2>
            <p className="text-xs text-slate-400">
              Tracks which specific worker role authorized sensitive actions (deleting expenses, modifying inventory, stock overrides).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportAuditLogsToCSV(filteredLogs)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Export CSV</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-sky-950 text-sky-400 rounded-lg border border-sky-800">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">{stats.total}</div>
            <div className="text-[11px] text-slate-400">Total Sensitive Actions</div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-amber-950 text-amber-400 rounded-lg border border-amber-800">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">{stats.expenseActions}</div>
            <div className="text-[11px] text-slate-400">Expense Modifications</div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-800">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">{stats.inventoryActions}</div>
            <div className="text-[11px] text-slate-400">Inventory & Stock Actions</div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-purple-950 text-purple-400 rounded-lg border border-purple-800">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">{stats.uniqueRolesUsed}</div>
            <div className="text-[11px] text-slate-400">Active Authorizing Roles</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by action, item name, employee, or authorizing role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter: Authorizing Role */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-xl">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400 text-[11px]">Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900">All Roles</option>
              {availableAuthorizingRoles.map((role) => (
                <option key={role} value={role} className="bg-slate-900">
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: Category */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 text-[11px]">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900">All Categories</option>
              <option value="expenses" className="bg-slate-900">Expenses</option>
              <option value="inventory" className="bg-slate-900">Inventory</option>
              <option value="stock" className="bg-slate-900">Stock Take</option>
              <option value="sales" className="bg-slate-900">Sales</option>
              <option value="contacts" className="bg-slate-900">Contacts</option>
              <option value="security" className="bg-slate-900">Security & Master</option>
            </select>
          </div>

          {/* Filter: Worker */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-xl">
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400 text-[11px]">Worker:</span>
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900">All Staff</option>
              {availableWorkers.map((w) => (
                <option key={w} value={w} className="bg-slate-900">
                  {w}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: Date */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            <select
              value={dateFilter}
              onChange={(e: any) => setDateFilter(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Time</option>
              <option value="today" className="bg-slate-900">Today</option>
              <option value="7days" className="bg-slate-900">Last 7 Days</option>
              <option value="30days" className="bg-slate-900">Last 30 Days</option>
            </select>
          </div>

          {(selectedRole !== 'All' || selectedCategory !== 'All' || selectedWorker !== 'All' || dateFilter !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedRole('All');
                setSelectedCategory('All');
                setSelectedWorker('All');
                setDateFilter('all');
                setSearchTerm('');
              }}
              className="text-sky-400 hover:underline text-[11px] font-semibold px-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Log Entries List */}
      <div className="space-y-2.5">
        {filteredLogs.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-200">No Matching Audit Logs Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No sensitive actions match your current search or role filters. Try adjusting the filter criteria above.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const diffKeys = log.details?.diff ? Object.keys(log.details.diff) : [];

            return (
              <div
                key={log.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl transition shadow-md overflow-hidden"
              >
                {/* Main Card Row */}
                <div
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  {/* Left: Action & Target */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-xl border ${getActionBadgeColor(
                          log.actionType
                        )}`}
                      >
                        {log.category === 'expenses' ? (
                          <Receipt className="w-4 h-4" />
                        ) : log.category === 'inventory' ? (
                          <Package className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${getActionBadgeColor(
                            log.actionType
                          )}`}
                        >
                          {log.actionType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs font-bold text-slate-100 truncate">
                          {log.actionTitle}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed truncate max-w-2xl">
                        {log.details?.summary || 'Sensitive action recorded'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Specific Authorizing Role & Worker */}
                  <div className="flex flex-wrap items-center gap-3 lg:shrink-0 justify-between lg:justify-end">
                    {/* Specific Role Used Badge (Core Requirement Highlight) */}
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1 justify-end">
                        <ShieldCheck className="w-3 h-3 text-sky-400" />
                        <span>Authorized Via Role:</span>
                      </div>
                      <span
                        className={`inline-block text-xs px-2.5 py-1 rounded-lg border mt-0.5 ${getRoleBadgeStyle(
                          log.authorizingRole
                        )}`}
                      >
                        {log.authorizingRole}
                      </span>
                    </div>

                    {/* Worker Info */}
                    <div className="text-right border-l border-slate-800 pl-3">
                      <div className="text-xs font-bold text-slate-200">{log.userName}</div>
                      <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-slate-400 hover:text-white pl-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Breakdown */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-800 bg-slate-950/70 space-y-3.5 text-xs animate-fadeIn">
                    {/* Worker's Full Multi-Role Context */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-sky-400" />
                          <span>Worker Authentication & Authorization Snapshot</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">User ID: {log.userId}</span>
                      </div>

                      <div className="text-slate-300">
                        Worker <strong className="text-white">{log.userName}</strong> ({log.userEmail}) held{' '}
                        <strong className="text-white">
                          {(log.assignedRolesSnapshot || []).length} assigned roles
                        </strong>{' '}
                        at the time of execution.
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400">Roles Held:</span>
                        {(log.assignedRolesSnapshot || []).map((r) => {
                          const isTheAuthorizingRole = r === log.authorizingRole;
                          return (
                            <span
                              key={r}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                                isTheAuthorizingRole
                                  ? 'bg-sky-950 text-sky-300 border-sky-500 font-bold ring-1 ring-sky-500/40'
                                  : 'bg-slate-950 text-slate-400 border-slate-800'
                              }`}
                            >
                              {isTheAuthorizingRole ? `🛡️ ${r} [AUTHORIZING ROLE USED]` : r}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Changes Diff (Before vs After) */}
                    {diffKeys.length > 0 && (
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                        <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Modified Attributes (Before vs After)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {diffKeys.map((key) => {
                            const diff = log.details.diff![key];
                            return (
                              <div
                                key={key}
                                className="bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono text-xs"
                              >
                                <div className="text-[10px] uppercase text-slate-400 font-semibold mb-1">
                                  {key}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-rose-400 line-through">
                                    {String(diff.old ?? 'None')}
                                  </span>
                                  <span className="text-slate-400">→</span>
                                  <span className="text-emerald-400 font-bold">
                                    {String(diff.new ?? 'None')}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Reason given */}
                    {log.reason && (
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1">
                        <span className="font-semibold text-slate-300">Justification / Reason Provided:</span>
                        <p className="text-slate-200 italic bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                          "{log.reason}"
                        </p>
                      </div>
                    )}

                    {/* Target Snapshot Details */}
                    {log.details?.before && !log.details?.diff && (
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1.5">
                        <span className="font-semibold text-slate-300">Snapshot of Record Prior to Deletion:</span>
                        <pre className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                          {JSON.stringify(log.details.before, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Metadata footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-500 pt-1">
                      <span>Log ID: {log.id}</span>
                      <span>Required Permission: {log.requiredPermissionKey || 'Master Authorization'}</span>
                      <span>Severity Level: {log.severity?.toUpperCase()}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
