import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Package,
  FileText,
  DollarSign,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Users,
  ChevronDown,
  Layers,
  ClipboardList,
  Maximize2,
  Minimize2,
  ExternalLink,
  PanelLeftClose,
  PanelLeft,
  Lock,
  KeyRound,
  Sparkles,
  Wifi,
  WifiOff,
  Smartphone,
  Download,
  Building2
} from 'lucide-react';
import { User, Role, StoreLocation } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lowStockCount: number;
  currentUser: User;
  onRoleChange: (user: User) => void;
  allUsers: User[];
  onResetData: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onLockTerminal: () => void;
  onOpenStaffManagement: () => void;
  onOpenInstallModal?: () => void;
  stores?: StoreLocation[];
  activeStoreId?: string;
  onOpenStoreManager?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  lowStockCount,
  currentUser,
  onRoleChange,
  allUsers,
  onResetData,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onLockTerminal,
  onOpenStaffManagement,
  onOpenInstallModal,
  stores = [],
  activeStoreId,
  onOpenStoreManager,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const roleBadges: Record<Role, string> = {
    Admin: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    Manager: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    Cashier: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    'Inventory Staff': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    'Sales Role': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Stock Ins Role': 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    'Stock Setup Role': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    'Expenses Role': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-slate-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Title */}
          <div className="flex items-center gap-3">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                title={isSidebarCollapsed ? "Expand Sidebar Menu" : "Collapse Sidebar for Full View"}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              >
                {isSidebarCollapsed ? <PanelLeft className="w-5 h-5 text-sky-400" /> : <PanelLeftClose className="w-5 h-5" />}
              </button>
            )}

            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base text-slate-100 leading-tight">
                ROFANI <span className="text-sky-400 font-semibold">ELECTRONICS & BOUTIQUE</span>
              </h1>
              <p className="text-[10px] text-slate-400 hidden sm:block">POS, Stock, KRA 1.5% Tax & Attendance</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
                activeTab === 'pos'
                  ? 'bg-sky-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>POS Sales</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition relative ${
                activeTab === 'inventory'
                  ? 'bg-sky-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Stock & Items</span>
              {lowStockCount > 0 && (
                <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.2 rounded-full animate-pulse">
                  {lowStockCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('stocktake')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
                activeTab === 'stocktake'
                  ? 'bg-sky-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Physical Audit</span>
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
                activeTab === 'expenses'
                  ? 'bg-sky-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Expenses</span>
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
                activeTab === 'attendance'
                  ? 'bg-sky-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Workers & Loans</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
                activeTab === 'reports'
                  ? 'bg-sky-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Reports & PDF</span>
            </button>
          </nav>

          {/* User Role & Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Offline / Storage Status Badge */}
            <div
              title={isOnline ? "Connected - Mobile local storage active" : "Offline Mode Active - Data saved locally on mobile"}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${
                isOnline
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                  : 'bg-amber-950/80 text-amber-300 border-amber-800/80 animate-pulse'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden xl:inline text-[11px]">Online (Storage OK)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px]">Offline Mode</span>
                </>
              )}
            </div>

            {/* Fullscreen & Open in New Tab Display Buttons */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Mode"}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-sky-400" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={openInNewTab}
              title="Open App in Full Screen Tab (No Frames)"
              className="hidden sm:flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Full View</span>
            </button>

            {/* Install Mobile App Button */}
            {onOpenInstallModal && (
              <button
                onClick={onOpenInstallModal}
                title="Install ROFANI POS on Mobile Phone / Home Screen"
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-extrabold transition shadow-md shadow-emerald-600/20"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Install App</span>
              </button>
            )}

            {/* Low stock alert badge fast filter */}
            {lowStockCount > 0 && (
              <button
                onClick={() => setActiveTab('inventory')}
                title={`${lowStockCount} items low on stock! Click to inspect.`}
                className="hidden sm:flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-500/20 transition"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>{lowStockCount} Low</span>
              </button>
            )}

            {/* Multi-Store Branch Outlet Switcher Button */}
            {onOpenStoreManager && (
              <button
                onClick={onOpenStoreManager}
                title="Switch Active Store Branch or Add New Store Outlets & Stock Transfers"
                className="flex items-center gap-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/80 px-2.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <div className="text-left hidden md:block">
                  <div className="text-[10px] text-indigo-400 uppercase font-mono leading-none">Branch</div>
                  <div className="text-xs font-bold text-white truncate max-w-[120px]">
                    {stores.find((s) => s.id === activeStoreId)?.name || 'Main Store'}
                  </div>
                </div>
                <span className="bg-indigo-800 text-indigo-200 text-[10px] font-mono px-1.5 py-0.5 rounded-md font-extrabold ml-0.5">
                  {stores.length > 0 ? stores.length : 1}
                </span>
              </button>
            )}

            {/* Lock Terminal Button */}
            <button
              onClick={onLockTerminal}
              title="Lock Terminal / PIN Login Screen"
              className="p-2 bg-amber-950/80 hover:bg-amber-900 border border-amber-800/80 text-amber-300 rounded-xl transition flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="hidden lg:inline">Lock PIN</span>
            </button>

            {/* Role Switcher Menu */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 transition"
              >
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-200">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <span className={`px-1.5 py-0.2 rounded border text-[9px] ${roleBadges[currentUser.role]}`}>
                      {currentUser.role}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Role switch dropdown */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-2 space-y-1 text-xs">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                    <span>Active Account</span>
                    <span className="text-sky-400 text-[10px] font-mono">PIN Active</span>
                  </div>
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onRoleChange(u);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition ${
                        u.id === currentUser.id ? 'bg-sky-950/60 text-sky-300 font-semibold border border-sky-800/50' : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <div>{u.name}</div>
                        <div className="text-[10px] text-slate-400">{u.email}</div>
                      </div>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] border ${roleBadges[u.role]}`}>
                        {u.role}
                      </span>
                    </button>
                  ))}

                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        onOpenStaffManagement();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sky-300 hover:bg-sky-950/40 transition font-semibold"
                    >
                      <KeyRound className="w-4 h-4 text-sky-400" />
                      <span>Manage Workers & PINs</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        onLockTerminal();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-amber-300 hover:bg-amber-950/40 transition font-semibold"
                    >
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span>Lock Terminal (PIN Screen)</span>
                    </button>

                    <button
                      onClick={() => {
                        onResetData();
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-rose-400 hover:bg-rose-950/30 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Sample Data</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Nav Bar */}
        <div className="flex md:hidden overflow-x-auto gap-2 py-2 border-t border-slate-800 text-xs no-scrollbar">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'pos' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> POS
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'inventory' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Package className="w-3.5 h-3.5" /> Stock
            {lowStockCount > 0 && <span className="bg-amber-500 text-black px-1 rounded-full text-[10px]">{lowStockCount}</span>}
          </button>
          <button
            onClick={() => setActiveTab('stocktake')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'stocktake' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" /> Physical Audit
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'expenses' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" /> Expenses
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'attendance' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Workers & Loans 💳
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'reports' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Reports
          </button>
        </div>
      </div>
    </header>
  );
};
