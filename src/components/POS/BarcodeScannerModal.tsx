import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  Scan,
  Zap,
  AlertCircle,
  RefreshCw,
  Smartphone,
  ExternalLink,
  CheckCircle2,
  Flashlight,
  FlashlightOff,
  Image as ImageIcon,
  Volume2,
  Info,
  Check,
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Product } from '../../types';

interface BarcodeScannerModalProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  sampleBarcodes: { name: string; barcode: string }[];
  products?: Product[];
  onSwitchToAiScanner?: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  onScan,
  onClose,
  sampleBarcodes,
  products = [],
  onSwitchToAiScanner,
}) => {
  const [manualBarcode, setManualBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [unmatchedCode, setUnmatchedCode] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [autoCloseOnScan, setAutoCloseOnScan] = useState(true);
  const [scanCount, setScanCount] = useState(0);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerContainerId = 'html5-qr-code-scanner-viewport';

  // Standard retail formats supported by modern scanners
  const formatsToSupport = [
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.ITF,
    Html5QrcodeSupportedFormats.CODABAR,
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.DATA_MATRIX,
  ];

  // Synthesized audio & haptic vibration feedback for successful scans
  const triggerFeedback = () => {
    // 1. Audio Beep (Web Audio API)
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(920, ctx.currentTime); // 920Hz clean POS beep
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.14);
      }
    } catch (_) {}

    // 2. Mobile Haptic Vibration
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([80, 40, 80]);
      } catch (_) {}
    }
  };

  // Find product with barcode normalization (handles leading zeros, EAN vs UPC)
  const lookupProduct = (codeRaw: string): Product | null => {
    if (!products || products.length === 0) return null;
    const norm = (s?: string) => (s || '').trim().toLowerCase();
    const strip0 = (s?: string) => norm(s).replace(/^0+/, '');
    const code = norm(codeRaw);
    if (!code) return null;

    return (
      products.find((p) => {
        const pCode = norm(p.barcode);
        const pSku = norm(p.sku);
        if (pCode === code || pSku === code) return true;
        if (strip0(pCode) && strip0(pCode) === strip0(code)) return true;
        if (pCode.length === 12 && '0' + pCode === code) return true;
        if (code.length === 12 && '0' + code === pCode) return true;
        return false;
      }) || null
    );
  };

  // Central handler when any barcode is decoded (live camera or photo)
  const handleBarcodeDecoded = (decodedTextRaw: string) => {
    const code = decodedTextRaw.trim();
    if (!code) return;

    triggerFeedback();
    setLastScanned(code);
    setScanCount((prev) => prev + 1);

    const match = lookupProduct(code);
    setScannedProduct(match);
    setUnmatchedCode(match ? null : code);

    // Trigger parent POS callback
    onScan(code);

    if (autoCloseOnScan) {
      setTimeout(() => {
        onClose();
      }, 700);
    }
  };

  // Start live camera scanner
  useEffect(() => {
    let scanner: Html5Qrcode | null = null;
    let isMounted = true;

    const startScanner = async () => {
      try {
        setCameraError(null);
        setIsScanning(false);
        setPhotoError(null);

        const element = document.getElementById(scannerContainerId);
        if (!element) return;

        // Query available video devices on this mobile phone
        try {
          const devices = await Html5Qrcode.getCameras();
          if (isMounted && devices && devices.length > 0) {
            setAvailableCameras(
              devices.map((d, index) => ({
                id: d.id,
                label: d.label || `Camera ${index + 1} (${/back|rear|environment/i.test(d.label) ? 'Rear' : 'Front'})`,
              }))
            );
          }
        } catch (_) {}

        // Enable hardware BarcodeDetector if available on device
        scanner = new Html5Qrcode(scannerContainerId, {
          formatsToSupport,
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        html5QrcodeRef.current = scanner;

        // Configuration optimized for portrait mobile screens
        const config = {
          fps: 20,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const width = Math.min(Math.floor(viewfinderWidth * 0.92), 360);
            const height = Math.min(Math.floor(viewfinderHeight * 0.52), 220);
            return { width, height };
          },
          disableFlip: false,
        };

        // If specific camera ID is chosen, use it; otherwise use environment facing
        const cameraConfig = selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode };

        await scanner.start(
          cameraConfig,
          config,
          (decodedText) => {
            if (!isMounted) return;
            handleBarcodeDecoded(decodedText);
          },
          () => {
            // frame misses ignored
          }
        );

        if (isMounted) {
          setIsScanning(true);
          // Check torch capability
          try {
            const capabilities = (scanner as any).getRunningTrackCapabilities?.() || {};
            setHasTorch(Boolean(capabilities && 'torch' in capabilities && capabilities.torch));
          } catch (_) {
            setHasTorch(false);
          }
        }
      } catch (err: any) {
        console.error('Mobile camera barcode scanner error:', err);
        if (isMounted) {
          setIsScanning(false);
          let msg = 'Could not access phone camera directly.';
          if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
            msg = 'Camera permission was denied. Please allow camera permissions in your mobile browser settings.';
          } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
            msg = 'No camera device found on this phone.';
          } else if (err?.name === 'OverconstrainedError') {
            msg = 'Camera constraints not supported. Try switching camera or using Snap Photo below.';
          }
          if (window.top !== window.self) {
            msg += ' If testing inside preview, tap "Open Direct Window" or use "Take High-Res Photo" below.';
          }
          setCameraError(msg);
        }
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scanner) {
        if (scanner.isScanning) {
          scanner
            .stop()
            .then(() => scanner?.clear())
            .catch(() => {});
        } else {
          try {
            scanner.clear();
          } catch (_) {}
        }
      }
    };
  }, [facingMode, selectedCameraId]);

  // Toggle front vs back camera
  const toggleCameraFacing = () => {
    setSelectedCameraId(null);
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Toggle torch / flashlight
  const toggleTorch = async () => {
    if (!html5QrcodeRef.current || !hasTorch) return;
    try {
      const nextTorch = !isTorchOn;
      await html5QrcodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any],
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  // High-Resolution Photo Capture Fallback (Works 100% on any mobile phone)
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingPhoto(true);
      setPhotoError(null);

      const tempScannerId = 'html5-temp-file-scanner';
      let tempEl = document.getElementById(tempScannerId);
      if (!tempEl) {
        tempEl = document.createElement('div');
        tempEl.id = tempScannerId;
        tempEl.style.display = 'none';
        document.body.appendChild(tempEl);
      }

      const fileScanner = new Html5Qrcode(tempScannerId, {
        formatsToSupport,
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });

      const decodedText = await fileScanner.scanFile(file, true);
      try {
        fileScanner.clear();
      } catch (_) {}

      if (decodedText) {
        handleBarcodeDecoded(decodedText);
      }
    } catch (err: any) {
      console.warn('File barcode scan error:', err);
      setPhotoError(
        'Could not read barcode in photo. Please ensure barcode is in clear focus and well-lit, then try again.'
      );
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Manual code entry
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      handleBarcodeDecoded(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-slate-100 text-sm">Mobile Barcode Scanner</h3>
                {scanCount > 0 && (
                  <span className="bg-emerald-950 text-emerald-400 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border border-emerald-800">
                    {scanCount} scanned
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">Point phone camera or snap high-res photo</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Switch to AI Visual Scan button */}
            {onSwitchToAiScanner && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToAiScanner();
                }}
                className="bg-purple-950/80 hover:bg-purple-900 border border-purple-700/80 text-purple-300 font-bold px-2.5 py-1.5 rounded-xl text-xs transition flex items-center gap-1 shadow-sm"
                title="Switch to AI Visual Recognition: Scan items or order notes without barcode"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">AI Visual</span>
              </button>
            )}

            {/* Torch toggle button */}
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                title={isTorchOn ? 'Turn off torch' : 'Turn on torch'}
                className={`p-2 rounded-xl transition ${
                  isTorchOn ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {isTorchOn ? <Flashlight className="w-4 h-4 fill-amber-300" /> : <FlashlightOff className="w-4 h-4" />}
              </button>
            )}

            {/* Switch camera mode */}
            <button
              type="button"
              onClick={toggleCameraFacing}
              title="Switch Camera (Rear / Front)"
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-sky-400 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-3.5 sm:p-4 space-y-3.5 overflow-y-auto">
          {/* Camera Viewport Area */}
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 min-h-[220px] aspect-[4/3] flex items-center justify-center shadow-inner">
            {/* HTML5 QR Code Container Element */}
            <div id={scannerContainerId} className="w-full h-full object-cover text-slate-200" />

            {/* Scanning active laser & targeting brackets overlay */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3">
                {/* Top status */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-sky-300 bg-slate-950/85 px-2.5 py-1 rounded-full border border-sky-500/40 shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    Align barcode in frame
                  </span>

                  <span className="text-[10px] text-slate-400 bg-slate-950/85 px-2 py-0.5 rounded border border-slate-800 font-mono">
                    {facingMode === 'environment' ? 'Rear Camera' : 'Front Camera'}
                  </span>
                </div>

                {/* Viewfinder Target Reticle with Animated Laser */}
                <div className="relative w-[86%] max-w-[340px] h-32 mx-auto border border-dashed border-sky-500/60 rounded-xl bg-sky-950/10 flex items-center justify-center">
                  {/* Corner Reticles */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-sky-400 rounded-tl" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-sky-400 rounded-tr" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-sky-400 rounded-bl" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-sky-400 rounded-br" />

                  {/* Pulsing red scan laser line */}
                  <div className="w-full h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)] animate-pulse" />
                </div>

                {/* Bottom Tip */}
                <div className="text-center">
                  <span className="text-[10px] text-slate-300 bg-slate-950/85 px-2.5 py-1 rounded-lg border border-slate-800">
                    💡 Hold phone ~15cm (6 inches) away for clear focus
                  </span>
                </div>
              </div>
            )}

            {/* Camera Error / Permission Fallback View */}
            {!isScanning && cameraError && (
              <div className="absolute inset-0 bg-slate-950 p-4 text-center flex flex-col items-center justify-center space-y-2.5 z-10">
                <AlertCircle className="w-8 h-8 text-amber-400" />
                <div className="space-y-1 max-w-xs">
                  <p className="text-xs font-bold text-slate-100">Live Video Notice</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{cameraError}</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-md shadow-sky-600/30"
                  >
                    <Camera className="w-3.5 h-3.5" /> Snap Photo Instead
                  </button>
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold px-3 py-1.5 rounded-xl transition flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Direct Tab
                  </a>
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold px-3 py-1.5 rounded-xl transition"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Multiple Phone Cameras Switcher */}
          {availableCameras.length > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] text-slate-400 shrink-0">Switch Lens:</span>
              <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar flex-1">
                {availableCameras.map((cam, idx) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => setSelectedCameraId(cam.id)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition ${
                      selectedCameraId === cam.id || (!selectedCameraId && idx === 0)
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {cam.label.replace(/camera/i, 'Cam').slice(0, 16)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* High-Resolution Photo Capture Button (Bulletproof fallback for all phones) */}
          <div className="space-y-1.5">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handlePhotoCapture}
              className="hidden"
            />
            <button
              type="button"
              disabled={isProcessingPhoto}
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-sky-300 hover:text-white border border-slate-700 text-xs font-bold transition shadow-sm"
            >
              <Camera className="w-4 h-4 text-sky-400" />
              <span>
                {isProcessingPhoto ? 'Analyzing Barcode Photo...' : '📸 Snap High-Res Photo to Scan'}
              </span>
            </button>
            {photoError && (
              <p className="text-[11px] text-amber-400 bg-amber-950/60 border border-amber-800/60 p-2 rounded-lg leading-tight">
                {photoError}
              </p>
            )}
          </div>

          {/* Scanned Result Banner with Product Recognition */}
          {lastScanned && (
            <div
              className={`rounded-2xl p-3 border text-xs space-y-1.5 transition ${
                scannedProduct
                  ? 'bg-emerald-950/70 border-emerald-800/80 text-emerald-200'
                  : 'bg-amber-950/70 border-amber-800/80 text-amber-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {scannedProduct ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span className="font-mono text-xs font-bold">Code: {lastScanned}</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    scannedProduct ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {scannedProduct ? 'Added to Cart' : 'Not in Catalog'}
                </span>
              </div>

              {scannedProduct ? (
                <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-emerald-900/60">
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-white text-xs truncate">{scannedProduct.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      SKU: {scannedProduct.sku} • Stock: {scannedProduct.stockQuantity}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-extrabold text-emerald-400 text-xs">
                      KSh {scannedProduct.sellingPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-amber-300/90 leading-tight">
                  Barcode read successfully, but no product in your inventory matches this code yet.
                </p>
              )}
            </div>
          )}

          {/* Continuous Scanning Mode Toggle */}
          <div className="flex items-center justify-between px-1 py-1 text-xs text-slate-400">
            <span className="text-[11px]">Auto-close modal on scan:</span>
            <button
              type="button"
              onClick={() => setAutoCloseOnScan(!autoCloseOnScan)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                autoCloseOnScan
                  ? 'bg-sky-950 text-sky-300 border border-sky-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              {autoCloseOnScan ? 'Close Immediately' : 'Multi-Item Continuous'}
            </button>
          </div>

          {/* Manual Barcode Gun / Keyboard Input */}
          <form onSubmit={handleSubmit} className="space-y-1.5 pt-1 border-t border-slate-800">
            <label className="text-xs font-semibold text-slate-300 block">
              Or Type / Scan with Handheld Barcode Gun:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter barcode e.g. 8901234567891"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1 shrink-0 shadow-md shadow-sky-600/20"
              >
                <Zap className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </form>

          {/* Demo Quick Barcode Buttons */}
          {sampleBarcodes && sampleBarcodes.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <div className="text-[11px] text-slate-400 mb-1.5 font-semibold">
                Quick Sample Barcodes (Tap to Test):
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto">
                {sampleBarcodes.slice(0, 6).map((item) => (
                  <button
                    key={item.barcode}
                    type="button"
                    onClick={() => handleBarcodeDecoded(item.barcode)}
                    className="text-left p-1.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs transition flex flex-col justify-between"
                  >
                    <span className="font-medium truncate text-slate-200 text-[10px]">{item.name}</span>
                    <span className="font-mono text-[9px] text-sky-400">{item.barcode}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
