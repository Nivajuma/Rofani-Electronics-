import React, { useState, useEffect } from 'react';
import { Camera, Check, X, Zap, ShieldCheck } from 'lucide-react';
import {
  getCameraPermissionStatus,
  requestPersistentCameraAccess,
  isAutoCameraAllowedOnStartup,
  CameraPermissionState
} from '../../utils/cameraPermissions';

export const CameraStartupPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [grantedSuccess, setGrantedSuccess] = useState(false);

  useEffect(() => {
    // Check if auto-allow on startup is active
    if (!isAutoCameraAllowedOnStartup()) return;

    // Check if dismissed in this session
    if (sessionStorage.getItem('rofani_dismiss_camera_prompt') === 'true') return;

    const evaluatePermission = async () => {
      const status = await getCameraPermissionStatus();
      if (status === 'prompt') {
        // Show lightweight banner encouraging 1-tap permanent permission
        setShowPrompt(true);
      }
    };

    evaluatePermission();
  }, []);

  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    try {
      const res = await requestPersistentCameraAccess();
      if (res.success) {
        setGrantedSuccess(true);
        setTimeout(() => {
          setShowPrompt(false);
        }, 2200);
      } else {
        setShowPrompt(false);
      }
    } catch {
      setShowPrompt(false);
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('rofani_dismiss_camera_prompt', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md bg-slate-900/95 border border-sky-500/50 backdrop-blur-md shadow-2xl rounded-2xl p-3 text-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {grantedSuccess ? '✅ Camera Access Permanently Allowed!' : 'Auto-Allow Camera on Rofani'}
            </p>
            <p className="text-[10px] text-slate-300 truncate">
              {grantedSuccess
                ? 'Your phone will now open barcode scanner without asking'
                : 'Tap to remember camera permission permanently'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!grantedSuccess && (
            <button
              type="button"
              disabled={isAuthorizing}
              onClick={handleAuthorize}
              className="bg-sky-600 hover:bg-sky-500 active:scale-95 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1 shadow-md shadow-sky-600/30"
            >
              <Zap className="w-3 h-3" />
              <span>{isAuthorizing ? 'Authorizing...' : 'Allow Forever'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
