import React, { useState, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  ChevronRight,
  Settings,
  HelpCircle,
  Sparkles,
  Download
} from 'lucide-react';
import {
  getCameraPermissionStatus,
  requestPersistentCameraAccess,
  isAutoCameraAllowedOnStartup,
  setAutoCameraAllowedOnStartup,
  isIos,
  isAndroid,
  isStandalonePwa,
  isInsideIframe,
  CameraPermissionState
} from '../../utils/cameraPermissions';

export const CameraPermissionsCard: React.FC = () => {
  const [permissionStatus, setPermissionStatus] = useState<CameraPermissionState>('prompt');
  const [autoAllow, setAutoAllow] = useState(isAutoCameraAllowedOnStartup());
  const [isRequesting, setIsRequesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'warning' | 'info' } | null>(null);
  const [activeGuideTab, setActiveGuideTab] = useState<'auto' | 'android' | 'ios' | 'pwa'>(
    isIos() ? 'ios' : isAndroid() ? 'android' : 'auto'
  );

  const checkStatus = async () => {
    const status = await getCameraPermissionStatus();
    setPermissionStatus(status);
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleToggleAutoAllow = (val: boolean) => {
    setAutoAllow(val);
    setAutoCameraAllowedOnStartup(val);
    if (val && permissionStatus !== 'granted') {
      handleRequestPermission();
    }
  };

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    setStatusMessage(null);
    try {
      const res = await requestPersistentCameraAccess();
      setPermissionStatus(res.status);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: 'Camera permission granted! Your browser will now allow camera access automatically without asking every time.',
        });
      } else {
        setStatusMessage({
          type: 'warning',
          text: res.errorMessage || 'Please enable camera in your phone browser site settings.',
        });
      }
    } catch (e: any) {
      setStatusMessage({
        type: 'warning',
        text: 'Camera access could not be activated. See instructions below.',
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const standalone = isStandalonePwa();
  const insideIframe = isInsideIframe();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>Phone Camera & Barcode Auto-Permission</span>
              <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 font-mono px-1.5 py-0.5 rounded font-bold">
                Persistent Access
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Configure your phone browser to remember camera permissions permanently so Rofani never asks every time
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {permissionStatus === 'granted' ? (
            <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Always Allowed</span>
            </span>
          ) : permissionStatus === 'denied' ? (
            <span className="bg-red-950/80 border border-red-500/60 text-red-300 text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1.5 shadow-sm">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span>Blocked in Browser</span>
            </span>
          ) : (
            <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1.5 shadow-sm">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Prompt on Use</span>
            </span>
          )}
        </div>
      </div>

      {/* Toast Notice */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
              : 'bg-amber-950/70 border-amber-500/50 text-amber-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Action Banner */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">Auto-Allow Camera on App Open</span>
            {autoAllow && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
            Pre-authorizes the phone camera when opening Rofani so cashiers can scan barcodes instantly without repeated permission dialogs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
          <button
            type="button"
            disabled={isRequesting}
            onClick={handleRequestPermission}
            className="flex-1 md:flex-initial bg-sky-600 hover:bg-sky-500 active:scale-95 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/30"
          >
            <Zap className="w-4 h-4" />
            <span>{permissionStatus === 'granted' ? 'Re-Verify Camera' : 'Allow Camera Permanently'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleAutoAllow(!autoAllow)}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition shrink-0 ${
              autoAllow
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            {autoAllow ? 'Auto: ON' : 'Auto: OFF'}
          </button>
        </div>
      </div>

      {/* Preview Warning helper if running inside iframe */}
      {insideIframe && (
        <div className="bg-amber-950/40 border border-amber-700/60 rounded-xl p-3.5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-bold text-amber-200">
              Why does your browser ask every time inside the preview?
            </p>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Mobile browsers (Chrome & Safari) intentionally reset permissions inside nested preview windows for security. To save camera access <strong>forever</strong> without asking again, open the app in a direct standalone window or install it to your phone home screen:
            </p>
            <div className="pt-1.5 flex gap-2">
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Direct Standalone Window</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Browser-Specific "Always Allow" Guide Tabs */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-sky-400" />
            <span>How to set Camera to "Always Allow" on your phone:</span>
          </span>

          <div className="flex gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveGuideTab('android')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                activeGuideTab === 'android'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              🤖 Android (Chrome)
            </button>
            <button
              type="button"
              onClick={() => setActiveGuideTab('ios')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                activeGuideTab === 'ios'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              🍏 iPhone (Safari)
            </button>
            <button
              type="button"
              onClick={() => setActiveGuideTab('pwa')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                activeGuideTab === 'pwa'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              📲 Install PWA
            </button>
          </div>
        </div>

        {/* Tab 1: Android Chrome */}
        {activeGuideTab === 'android' && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs text-slate-300">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>Android Chrome Permanent Permission Steps:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-400">
              <li>
                In Chrome, tap the <strong className="text-slate-200">🔒 Padlock</strong> or <strong className="text-slate-200">Tune/Sliders</strong> icon to the left of the website URL.
              </li>
              <li>
                Tap <strong className="text-slate-200">Permissions</strong> (or <strong className="text-slate-200">Site settings</strong>).
              </li>
              <li>
                Find <strong className="text-slate-200">Camera</strong> and switch it from <em className="text-amber-400">"Ask every time"</em> to <strong className="text-emerald-400">"Allow"</strong>.
              </li>
              <li>
                Chrome will now permanently remember this setting and never prompt you again when opening the app.
              </li>
            </ol>
          </div>
        )}

        {/* Tab 2: iPhone Safari */}
        {activeGuideTab === 'ios' && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs text-slate-300">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>iPhone (iOS Safari) Permanent Permission Steps:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-400">
              <li>
                In Safari, tap the <strong className="text-slate-200">aA</strong> icon on the left side of the address bar.
              </li>
              <li>
                Tap <strong className="text-slate-200">Website Settings</strong> in the menu.
              </li>
              <li>
                Under the <strong className="text-slate-200">Camera</strong> option, tap and select <strong className="text-emerald-400">Allow</strong> (change from <em>Ask</em>).
              </li>
              <li>
                Safari will now grant permanent camera access without prompting on future visits.
              </li>
            </ol>
          </div>
        )}

        {/* Tab 3: PWA Add to Home Screen */}
        {activeGuideTab === 'pwa' && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs text-slate-300">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>Add Rofani App to Home Screen (Recommended):</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When installed to your phone home screen, Android and iOS treat Rofani as an installed standalone app, granting persistent permissions and fullscreen viewing:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
              <li>
                <strong className="text-slate-200">Android</strong>: Tap the three dots (⋮) in Chrome → tap <strong className="text-sky-400">Install App</strong> (or <em>Add to Home screen</em>).
              </li>
              <li>
                <strong className="text-slate-200">iPhone</strong>: Tap the Share button (⎋ with arrow) in Safari → tap <strong className="text-sky-400">Add to Home Screen</strong>.
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
