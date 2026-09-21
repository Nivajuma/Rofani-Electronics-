import React, { useState } from 'react';
import {
  Smartphone,
  Monitor,
  RotateCw,
  Wifi,
  Battery,
  Signal,
  ShoppingBag,
  Package,
  ClipboardList,
  Landmark,
  FileText,
  Settings,
  X,
  Menu,
  KeyRound,
  Lock,
  Search,
  Bell,
  UserCheck,
  DollarSign,
  Maximize2,
  ChevronUp,
  Users,
  Plus,
  Cloud,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { User } from '../types';

interface PhoneDeviceFrameProps {
  children: React.ReactNode;
  activeTab: 'pos' | 'inventory' | 'stocktake' | 'contacts' | 'cashmanagement' | 'expenses' | 'attendance' | 'reports' | 'onlinestore' | 'onlineorders' | 'settings';
  onSelectTab: (tab: 'pos' | 'inventory' | 'stocktake' | 'contacts' | 'cashmanagement' | 'expenses' | 'attendance' | 'reports' | 'onlinestore' | 'onlineorders' | 'settings') => void;
  onSelectStockAlertFilter?: () => void;
  phoneOrientation: 'portrait' | 'landscape';
  phoneModel: 'iphone15pro' | 'galaxyS24' | 'pixel8';
  onToggleOrientation: () => void;
  onChangeModel: (model: 'iphone15pro' | 'galaxyS24' | 'pixel8') => void;
  onSwitchToComputer: () => void;
  currentUser: User;
  todaySales: number;
  lowStockCount: number;
  onLockTerminal: () => void;
  onOpenStaffModal: () => void;
  onNewSale?: () => void;
  onOpenCloudSync?: () => void;
  cloudSyncStatus?: 'synced' | 'syncing' | 'offline' | 'error' | 'quota_exceeded';
}

export const PhoneDeviceFrame: React.FC<PhoneDeviceFrameProps> = ({
  children,
  activeTab,
  onSelectTab,
  onSelectStockAlertFilter,
  phoneOrientation,
  phoneModel,
  onToggleOrientation,
  onChangeModel,
  onSwitchToComputer,
  currentUser,
  todaySales,
  lowStockCount,
  onLockTerminal,
  onOpenStaffModal,
  onNewSale,
  onOpenCloudSync,
  cloudSyncStatus = 'synced',
}) => {
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState('09:41');

  // Dynamic status bar time update
  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  // Frame width/height based on model and orientation
  const isLandscape = phoneOrientation === 'landscape';

  const getFrameDimensions = () => {
    if (phoneModel === 'galaxyS24') {
      return isLandscape ? 'w-[840px] max-w-[96vw] h-[400px] max-h-[85vh]' : 'w-[400px] max-w-[96vw] h-[820px] max-h-[85vh]';
    }
    if (phoneModel === 'pixel8') {
      return isLandscape ? 'w-[820px] max-w-[96vw] h-[390px] max-h-[85vh]' : 'w-[390px] max-w-[96vw] h-[800px] max-h-[85vh]';
    }
    // Default iPhone 15 Pro
    return isLandscape ? 'w-[860px] max-w-[96vw] h-[420px] max-h-[85vh]' : 'w-[420px] max-w-[96vw] h-[850px] max-h-[85vh]';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-4 px-2 sm:px-4 overflow-x-hidden selection:bg-blue-600 selection:text-white relative">
      {/* TOP CONTROL BAR TO SWITCH BETWEEN COMPUTER & MOBILE FORMAT */}
      <div className="sticky top-2 z-50 w-full max-w-5xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 mb-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={onSwitchToComputer}
              className="px-3.5 py-1.5 rounded-lg text-xs font-black text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
              title="Switch to Full Computer Format (Widescreen Desktop)"
            >
              <Monitor className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Computer Format (Desktop)</span>
              <span className="sm:hidden">Full PC View</span>
            </button>
            <button
              className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-blue-600 text-white shadow-md flex items-center gap-1.5"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">Mobile Phone Format</span>
              <span className="sm:hidden">Phone</span>
            </button>
          </div>

          <span className="hidden md:inline-block text-slate-600">|</span>

          {/* Model Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
            <span className="text-[10px] text-slate-400 font-bold px-2 uppercase">Device:</span>
            <button
              onClick={() => onChangeModel('iphone15pro')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                phoneModel === 'iphone15pro'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              iPhone 15 Pro
            </button>
            <button
              onClick={() => onChangeModel('galaxyS24')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                phoneModel === 'galaxyS24'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Galaxy S24
            </button>
            <button
              onClick={() => onChangeModel('pixel8')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                phoneModel === 'pixel8'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pixel 8
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Rotate Orientation Toggle */}
          <button
            onClick={onToggleOrientation}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Rotate Phone Screen (Portrait / Landscape)"
          >
            <RotateCw className="w-3.5 h-3.5 text-blue-400" />
            <span className="capitalize">{phoneOrientation}</span>
          </button>

          {/* Lock Terminal PIN Button */}
          <button
            onClick={onLockTerminal}
            className="p-2 bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-300 rounded-xl transition text-xs font-bold"
            title="Lock Terminal PIN"
          >
            <Lock className="w-4 h-4" />
          </button>

          {/* Exit Mobile Preview: Switch to Full Version */}
          <button
            id="btn-top-switch-to-computer"
            onClick={onSwitchToComputer}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer active:scale-95"
            title="Switch to Full Computer Format (Widescreen Desktop)"
          >
            <Monitor className="w-4 h-4" />
            <span>Full PC View</span>
          </button>
        </div>
      </div>

      {/* SMARTPHONE DEVICE CONTAINER FRAME */}
      <div
        className={`relative transition-all duration-300 ease-in-out bg-slate-900 border-[10px] sm:border-[14px] border-slate-800 rounded-[48px] sm:rounded-[56px] shadow-2xl shadow-blue-900/30 overflow-hidden flex flex-col ${getFrameDimensions()}`}
        style={{
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), inset 0 0 0 2px rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* PHONE SPEAKER NOTCH / DYNAMIC ISLAND */}
        {!isLandscape && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-none">
            {phoneModel === 'iphone15pro' ? (
              <div className="w-28 h-5 bg-black rounded-full border border-slate-800 flex items-center justify-between px-2.5 shadow-inner">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
                <div className="w-2.5 h-2.5 rounded-full bg-blue-950/80 border border-blue-900" />
              </div>
            ) : (
              <div className="w-3.5 h-3.5 bg-black rounded-full border border-slate-800" />
            )}
          </div>
        )}

        {/* PHONE STATUS BAR */}
        <div className="h-8 bg-slate-950 text-slate-300 px-5 flex items-center justify-between shrink-0 text-[11px] font-medium tracking-tight select-none z-40 border-b border-slate-800/50">
          <span className="font-bold text-slate-100 font-mono">{currentTime}</span>

          <div className="flex items-center gap-2">
            <Signal className="w-3 h-3 text-slate-300" />
            <span className="text-[9px] font-bold text-slate-300 font-mono">5G</span>
            <Wifi className="w-3 h-3 text-slate-300" />
            <Battery className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
          </div>
        </div>

        {/* MOBILE HEADER BAR */}
        <div className="bg-slate-900 border-b border-slate-800 p-2.5 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-md">
              R
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-black text-slate-100 truncate">ROFANI Mobile POS</h1>
              <p className="text-[10px] text-slate-400 truncate">
                Sales: <strong className="text-emerald-400 font-mono">KSh {todaySales.toLocaleString()}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Real-Time Cloud Sync Indicator */}
            {onOpenCloudSync && (
              <button
                onClick={onOpenCloudSync}
                className={`p-1.5 border rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm cursor-pointer ${
                  cloudSyncStatus === 'quota_exceeded'
                    ? 'bg-amber-950/80 hover:bg-amber-900 border-amber-800/80 text-amber-300'
                    : 'bg-sky-950/80 hover:bg-sky-900 border-sky-800/80 text-sky-300'
                }`}
                title={
                  cloudSyncStatus === 'quota_exceeded'
                    ? 'Firestore Daily Quota Reached: Operating in Offline Local Storage Mode'
                    : 'Live Cloud Sync: Connected across all worker phones'
                }
              >
                <Cloud className={`w-3.5 h-3.5 ${cloudSyncStatus === 'quota_exceeded' ? 'text-amber-400' : 'text-sky-400'}`} />
                <span className={`w-1.5 h-1.5 rounded-full ${
                  cloudSyncStatus === 'quota_exceeded'
                    ? 'bg-amber-400'
                    : cloudSyncStatus === 'offline'
                    ? 'bg-slate-400'
                    : 'bg-emerald-400 animate-pulse'
                }`} />
              </button>
            )}

            {/* Direct Switch to Full PC Version Button in Mobile Header */}
            <button
              id="btn-header-switch-to-computer"
              onClick={onSwitchToComputer}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm active:scale-95 transition cursor-pointer"
              title="Switch to Full Version (Computer / Desktop View)"
            >
              <Monitor className="w-3 h-3 text-blue-100" />
              <span className="hidden xs:inline">Full PC</span>
            </button>

            {/* Direct New Sale Button in Mobile Header */}
            <button
              id="btn-mobile-new-sale"
              onClick={() => {
                if (onNewSale) {
                  onNewSale();
                } else {
                  onSelectTab('pos');
                }
                setShowMobileMoreMenu(false);
              }}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-extrabold flex items-center gap-1 shadow-sm active:scale-95"
              title="Start New Sale"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Sale</span>
            </button>

            {lowStockCount > 0 && (
              <button
                onClick={() => {
                  onSelectTab('inventory');
                  if (onSelectStockAlertFilter) onSelectStockAlertFilter();
                }}
                className="p-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg text-[10px] font-bold flex items-center gap-1 animate-pulse shadow-sm"
                title={`${lowStockCount} items low on stock - Click to filter inventory`}
              >
                <Bell className="w-3 h-3 text-rose-400" />
                <span>{lowStockCount} Alerts</span>
              </button>
            )}

            <button
              onClick={() => setShowMobileMoreMenu(!showMobileMoreMenu)}
              className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 cursor-pointer"
              title="Mobile Quick Menu"
            >
              {showMobileMoreMenu ? <X className="w-4 h-4 text-rose-400" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* MOBILE EXPANDED DROPDOWN MENU */}
        {showMobileMoreMenu && (
          <div className="bg-slate-900 border-b border-slate-800 p-3 space-y-2 text-xs shrink-0 z-40 animate-in slide-in-from-top duration-200">
            {/* Primary Switch to Full Version Button inside Mobile Menu */}
            <button
              id="btn-menu-switch-to-full"
              onClick={() => {
                onSwitchToComputer();
                setShowMobileMoreMenu(false);
              }}
              className="w-full p-2.5 rounded-xl border border-blue-500/70 bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between font-bold shadow-md hover:border-blue-400 transition group active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Monitor className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>Switch to Full Version</span>
                    <span className="text-[9px] bg-blue-500/30 text-blue-200 border border-blue-400/40 px-1.5 py-0.2 rounded font-mono">
                      Desktop View
                    </span>
                  </div>
                  <div className="text-[10px] text-blue-200/80 font-normal">
                    Open complete widescreen layout without phone frame
                  </div>
                </div>
              </div>
              <Maximize2 className="w-4 h-4 text-blue-300 group-hover:scale-110 transition shrink-0" />
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onSelectTab('contacts');
                  setShowMobileMoreMenu(false);
                }}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold ${
                  activeTab === 'contacts'
                    ? 'bg-sky-600 border-sky-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4 text-sky-400" />
                <span>Customers & Suppliers</span>
              </button>

              <button
                onClick={() => {
                  onSelectTab('expenses');
                  setShowMobileMoreMenu(false);
                }}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold ${
                  activeTab === 'expenses'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Expenses</span>
              </button>

              <button
                onClick={() => {
                  onSelectTab('attendance');
                  setShowMobileMoreMenu(false);
                }}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold ${
                  activeTab === 'attendance'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <UserCheck className="w-4 h-4 text-sky-400" />
                <span>Attendance</span>
              </button>

              <button
                onClick={() => {
                  onSelectTab('reports');
                  setShowMobileMoreMenu(false);
                }}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold ${
                  activeTab === 'reports'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Reports & Analytics</span>
              </button>

              <button
                onClick={() => {
                  onSelectTab('settings');
                  setShowMobileMoreMenu(false);
                }}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold ${
                  activeTab === 'settings'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Settings className="w-4 h-4 text-purple-400" />
                <span>KRA Settings</span>
              </button>

              {onOpenCloudSync && (
                <button
                  onClick={() => {
                    onOpenCloudSync();
                    setShowMobileMoreMenu(false);
                  }}
                  className="col-span-2 p-2.5 rounded-xl border border-sky-700/60 bg-gradient-to-r from-sky-950 to-blue-950 text-sky-200 flex items-center justify-between font-bold"
                >
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-sky-400" />
                    <span>Real-Time Cloud Phone Sync</span>
                  </div>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                    Multi-Device Active
                  </span>
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>User: <strong className="text-slate-200">{currentUser.name}</strong> ({currentUser.role})</span>
              <button
                onClick={onOpenStaffModal}
                className="text-purple-400 font-bold hover:underline flex items-center gap-1"
              >
                <Users className="w-3 h-3" />
                Manage Workers
              </button>
            </div>
          </div>
        )}

        {/* Firestore Quota Notice for Mobile Workers */}
        {cloudSyncStatus === 'quota_exceeded' && onOpenCloudSync && (
          <div
            onClick={onOpenCloudSync}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 text-[11px] font-bold flex items-center justify-between shrink-0 cursor-pointer shadow-sm transition"
            title="Click to view Cloud Quota status & upgrade info"
          >
            <span className="flex items-center gap-1.5 truncate">
              <AlertTriangle className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span className="truncate">Cloud Quota Limit: Local Mode Active</span>
            </span>
            <span className="text-[10px] underline ml-1 shrink-0 font-black">Details</span>
          </div>
        )}

        {/* MOBILE MAIN VIEWPORT CONTENT CONTAINER */}
        <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100 p-2 sm:p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
          {children}
        </div>

        {/* TOUCH-OPTIMIZED MOBILE BOTTOM NAVIGATION BAR */}
        <div className="h-16 bg-slate-900 border-t border-slate-800 px-2 flex items-center justify-around shrink-0 z-30">
          <button
            onClick={() => {
              onSelectTab('pos');
              setShowMobileMoreMenu(false);
            }}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition ${
              activeTab === 'pos' ? 'text-blue-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-bold">POS</span>
          </button>

          <button
            onClick={() => {
              onSelectTab('inventory');
              setShowMobileMoreMenu(false);
            }}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition ${
              activeTab === 'inventory' ? 'text-blue-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-bold">Stock</span>
          </button>

          <button
            onClick={() => {
              onSelectTab('stocktake');
              setShowMobileMoreMenu(false);
            }}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition ${
              activeTab === 'stocktake' ? 'text-blue-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-bold">Audit</span>
          </button>

          <button
            onClick={() => {
              onSelectTab('cashmanagement');
              setShowMobileMoreMenu(false);
            }}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition ${
              activeTab === 'cashmanagement' ? 'text-blue-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Landmark className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-bold">Cash</span>
          </button>

          <button
            onClick={() => setShowMobileMoreMenu(!showMobileMoreMenu)}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition ${
              showMobileMoreMenu ? 'text-blue-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-bold">More</span>
          </button>
        </div>

        {/* HOME INDICATOR BAR AT BOTTOM OF PHONE */}
        <div className="h-4 bg-slate-900 flex items-center justify-center shrink-0">
          <div className="w-32 h-1 bg-slate-600 rounded-full" />
        </div>
      </div>

      {/* FLOATING QUICK-SWITCH BUTTON: Always visible in mobile mode on any screen/device */}
      <div className="fixed bottom-5 right-5 z-50">
        <button
          id="btn-floating-switch-to-computer"
          onClick={onSwitchToComputer}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black rounded-full shadow-2xl shadow-blue-900/80 border border-blue-400/50 flex items-center gap-2 transition-all transform active:scale-95 hover:scale-105 cursor-pointer ring-2 ring-blue-500/40"
          title="Exit phone mode and return to full PC version"
        >
          <Monitor className="w-4 h-4 text-blue-100" />
          <span>Switch to Full Version</span>
        </button>
      </div>
    </div>
  );
};
