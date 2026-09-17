import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Scan, Zap, AlertCircle, RefreshCw, Smartphone, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  sampleBarcodes: { name: string; barcode: string }[];
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  onScan,
  onClose,
  sampleBarcodes,
}) => {
  const [manualBarcode, setManualBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'html5-qr-code-scanner-viewport';

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;
    let isMounted = true;

    const startScanner = async () => {
      try {
        setCameraError(null);
        setIsScanning(false);

        const element = document.getElementById(scannerContainerId);
        if (!element) return;

        // Supported standard retail barcodes: EAN-13, EAN-8, CODE-128, UPC-A, UPC-E, QR, CODE-39
        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.ITF,
        ];

        scanner = new Html5Qrcode(scannerContainerId, {
          formatsToSupport,
          verbose: false,
        });
        html5QrcodeRef.current = scanner;

        const config = {
          fps: 15,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.777778,
        };

        await scanner.start(
          { facingMode },
          config,
          (decodedText) => {
            if (!isMounted) return;
            setLastScanned(decodedText);
            
            // Haptic vibration feedback on mobile
            if ('vibrate' in navigator) {
              try { navigator.vibrate(120); } catch (e) {}
            }
            
            onScan(decodedText);
          },
          () => {
            // Ignore scan frame misses
          }
        );

        if (isMounted) {
          setIsScanning(true);
        }
      } catch (err: any) {
        console.error('Mobile camera barcode scanner start error:', err);
        if (isMounted) {
          setIsScanning(false);
          let msg = 'Camera access blocked or unavailable on this device browser.';
          if (window.top !== window.self) {
            msg += ' Please open the app in a standalone tab or install it to your phone home screen for direct camera permissions.';
          }
          setCameraError(msg);
        }
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scanner) {
        if (scanner.isScanning) {
          scanner.stop().then(() => scanner?.clear()).catch(() => {});
        } else {
          scanner.clear();
        }
      }
    };
  }, [facingMode]);

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
      setLastScanned(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Mobile Barcode Scanner</h3>
              <p className="text-[10px] text-slate-400">Scan product barcodes directly with camera</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleCameraFacing}
              title="Switch camera mode (Back / Front)"
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-sky-400 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Camera Viewport Area */}
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 aspect-[16/10] flex items-center justify-center shadow-inner">
            {/* HTML5 QR Code Container Element */}
            <div id={scannerContainerId} className="w-full h-full object-cover text-slate-200" />

            {/* Scanning active laser & helper overlay */}
            {isScanning && (
              <>
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4">
                  <div className="text-[11px] font-semibold text-sky-300 bg-slate-950/80 px-3 py-1 rounded-full border border-sky-500/40 shadow-lg">
                    Point camera at item barcode
                  </div>
                  <div className="w-full text-center">
                    <span className="text-[10px] text-slate-400 bg-slate-950/90 px-2 py-0.5 rounded border border-slate-800">
                      Camera: {facingMode === 'environment' ? 'Rear (Back)' : 'Front'}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Camera Error / Permission Notice */}
            {!isScanning && cameraError && (
              <div className="absolute inset-0 bg-slate-950 p-4 text-center flex flex-col items-center justify-center space-y-3 z-10">
                <AlertCircle className="w-8 h-8 text-amber-400" />
                <div className="space-y-1 max-w-xs">
                  <p className="text-xs font-semibold text-slate-200">Camera Feed Notice</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{cameraError}</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center pt-1">
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Direct Tab
                  </a>
                  <button
                    onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold px-3 py-1.5 rounded-xl transition"
                  >
                    Retry Camera
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Last Scanned Feedback Banner */}
          {lastScanned && (
            <div className="bg-emerald-950/80 border border-emerald-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-200 font-mono text-xs truncate max-w-[200px]">
                  Scanned: <strong>{lastScanned}</strong>
                </span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                Added to Cart
              </span>
            </div>
          )}

          {/* Manual Barcode Gun / Keyboard Input */}
          <form onSubmit={handleSubmit} className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Scan with Barcode Gun or Type Code:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter barcode e.g. 8901234567891"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1 shrink-0"
              >
                <Zap className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </form>

          {/* Demo Quick Barcode Buttons */}
          <div className="pt-2 border-t border-slate-800">
            <div className="text-[11px] text-slate-400 mb-2 font-semibold">Quick Sample Barcodes (Tap to Scan):</div>
            <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
              {sampleBarcodes.map((item) => (
                <button
                  key={item.barcode}
                  onClick={() => {
                    onScan(item.barcode);
                    setLastScanned(item.barcode);
                  }}
                  className="text-left p-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs transition flex flex-col justify-between"
                >
                  <span className="font-medium truncate text-slate-200 text-[11px]">{item.name}</span>
                  <span className="font-mono text-[10px] text-sky-400">{item.barcode}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
