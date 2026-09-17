import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share, PlusSquare, Monitor, CheckCircle2, X, ExternalLink, ShieldCheck, Copy, Check, AlertCircle } from 'lucide-react';

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Standalone public app URL
  const standaloneUrl = window.location.href.includes('ais-') 
    ? window.location.href 
    : 'https://ais-pre-agpwmbkm7pzkfhwvkrsqrv-987405654779.europe-west2.run.app';

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(standaloneUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenStandalone = () => {
    window.open(standaloneUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-100 text-base">Install App on Mobile Phone</h3>
              <p className="text-xs text-slate-400">ROFANI POS Standalone Progressive Web Application</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Studio Frame Warning & Direct Link Button */}
        <div className="bg-gradient-to-r from-amber-950/90 to-slate-900 border border-amber-800/80 p-4 rounded-2xl space-y-3">
          <div className="flex items-start gap-2 text-amber-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold">Avoid Installing "Google AI Studio" Shell</h4>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                If you are currently inside the AI Studio editor window, trying to "Add to Home Screen" will save the AI Studio website instead of the POS app.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleOpenStandalone}
              className="flex-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs px-3.5 py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/20"
            >
              <ExternalLink className="w-4 h-4" /> Open Standalone App Tab
            </button>
            <button
              onClick={handleCopyLink}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 border border-slate-700"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              {copied ? 'Copied Link!' : 'Copy Direct Link'}
            </button>
          </div>
        </div>

        {/* Browser Direct Prompt Trigger if available */}
        {deferredPrompt && !isInstalled && (
          <div className="bg-gradient-to-r from-sky-950 to-blue-950 border border-sky-800/80 p-4 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-sky-400" /> Direct One-Tap Installation
              </div>
              <p className="text-[11px] text-slate-300">Your mobile browser supports instant app installation.</p>
            </div>
            <button
              onClick={handleInstallClick}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 shrink-0"
            >
              Install Now
            </button>
          </div>
        )}

        {isInstalled && (
          <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 p-4 rounded-2xl text-xs flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-sm">App Installed!</div>
              <p className="text-[11px] text-emerald-200">You are running ROFANI POS as a standalone home-screen mobile application.</p>
            </div>
          </div>
        )}

        {/* Step-by-Step Mobile Instructions */}
        <div className="space-y-3 text-xs">
          {/* Android Chrome Instructions */}
          <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-2">
            <div className="font-extrabold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" /> Android Phones (Google Chrome)
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">Chrome</span>
            </div>
            <ol className="list-decimal list-inside text-slate-300 space-y-1 text-[11px] pl-1">
              <li>Tap <strong>"Open Standalone App Tab"</strong> button above (or paste the copied link in mobile Chrome).</li>
              <li>In Chrome, tap the <strong>3 dots menu (⋮)</strong> at top-right.</li>
              <li>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.</li>
              <li>ROFANI POS will install as a mobile app with its own icon on your phone!</li>
            </ol>
          </div>

          {/* iPhone Safari Instructions */}
          <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-2">
            <div className="font-extrabold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Share className="w-4 h-4 text-sky-400" /> iPhones & iPads (Apple Safari)
              </span>
              <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded font-mono">Safari</span>
            </div>
            <ol className="list-decimal list-inside text-slate-300 space-y-1 text-[11px] pl-1">
              <li>Open the standalone app link in <strong>Safari browser</strong> on your iPhone.</li>
              <li>Tap the <strong>Share button</strong> (<Share className="w-3 h-3 inline mx-0.5 text-sky-400" /> square with arrow up).</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong> (<PlusSquare className="w-3 h-3 inline mx-0.5 text-sky-400" />).</li>
              <li>Tap <strong>Add</strong>. Launch ROFANI POS directly from your iPhone home screen anytime!</li>
            </ol>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Standalone PWA & Offline Support
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition"
          >
            Got It
          </button>
        </div>

      </div>
    </div>
  );
};
