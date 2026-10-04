import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Camera,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  Zap,
  Image as ImageIcon,
  Loader2,
  Scan,
  Tag,
  PackagePlus,
  Edit2,
  Save,
  Boxes,
  Barcode,
  Trash2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Product } from '../../types';

export interface ScannedNewItem {
  id: string;
  detectedName: string;
  quantity: number;
  suggestedPriceKSh: number;
  suggestedCostKSh: number;
  category: string;
  subcategory?: string;
  sizeCapacity?: string;
  unit: string;
  suggestedSku: string;
  suggestedBarcode: string;
  description: string;
  selected: boolean;
  isEditing: boolean;
  stockToAdd: number;
  isAdded: boolean;
}

interface DetectedItem {
  product: Product;
  quantity: number;
  confidence: number;
  selected: boolean;
}

interface AiReceiptScannerModalProps {
  products: Product[];
  categories?: any[];
  onAddItemsToReceipt: (itemsToAdd: { product: Product; quantity: number }[]) => void;
  onAddNewProduct?: (product: Product, andAddToCart?: boolean, quantity?: number) => void;
  onBatchAddNewProducts?: (newProducts: { product: Product; quantity: number }[], andAddToCart?: boolean) => void;
  onClose: () => void;
}

export const AiReceiptScannerModal: React.FC<AiReceiptScannerModalProps> = ({
  products,
  categories = [],
  onAddItemsToReceipt,
  onAddNewProduct,
  onBatchAddNewProducts,
  onClose,
}) => {
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [scannedNewItems, setScannedNewItems] = useState<ScannedNewItem[]>([]);
  const [summaryNote, setSummaryNote] = useState<string | null>(null);
  const [autoAddDirectly, setAutoAddDirectly] = useState(true);
  const [addedSuccessMessage, setAddedSuccessMessage] = useState<string | null>(null);
  const [showManualNewItemForm, setShowManualNewItemForm] = useState(false);

  // Manual new item state
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState<number>(1000);
  const [manualCost, setManualCost] = useState<number>(700);
  const [manualCategory, setManualCategory] = useState<string>('Electronics');
  const [manualQty, setManualQty] = useState<number>(1);
  const [manualStock, setManualStock] = useState<number>(10);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Unique category names list for category dropdowns
  const availableCategories = React.useMemo(() => {
    const set = new Set<string>();
    categories.forEach((c) => {
      const name = typeof c === 'string' ? c : c.name;
      if (name) set.add(name);
    });
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    // Add default fallbacks if empty
    ['Electronics', 'Clothing & Boutique', 'Mobile Accessories', 'Footwear', 'Beauty & Cosmetics', 'Groceries'].forEach(
      (cat) => set.add(cat)
    );
    return Array.from(set);
  }, [categories, products]);

  // Audio register confirmation chime & haptic feedback
  const triggerAudioFeedback = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1046, ctx.currentTime); // C6 bell tone
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      }
    } catch (_) {}

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch (_) {}
    }
  };

  // Start phone camera feed
  const startCamera = async () => {
    try {
      setCameraError(null);
      stopCamera();

      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('DEVICE_UNSUPPORTED');
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (firstErr: any) {
        if (firstErr?.name === 'OverconstrainedError' || firstErr?.name === 'ConstraintNotSatisfiedError') {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } else {
          throw firstErr;
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
        await videoRef.current.play().catch(() => {});
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraActive(false);
      let msg = 'Could not access phone camera for AI scan. Please pick from photo gallery.';
      const errName = err?.name || '';
      const errMsg = String(err?.message || '');

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errMsg.toLowerCase().includes('denied')) {
        msg = 'Camera permission was denied. Please allow camera access in browser site settings or pick from gallery.';
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError' || errMsg.toLowerCase().includes('not found')) {
        msg = 'No camera or video capture hardware found on this system. Please upload a receipt photo from gallery.';
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        msg = 'Camera is currently in use by another app or browser tab. Please close other camera apps and retry.';
      } else if (errMsg === 'DEVICE_UNSUPPORTED' || errName === 'TypeError') {
        msg = 'Camera streaming is not supported on this device/browser. Please pick an image from your gallery.';
      }
      setCameraError(msg);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  // Capture frame from video stream
  const handleCaptureFromCamera = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(base64);
      analyzeImageWithAi(base64);
    } catch (err) {
      console.error('Frame capture error:', err);
    }
  };

  // Handle uploaded/picked photo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setCapturedImage(base64);
        analyzeImageWithAi(base64);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Call Gemini multimodal vision endpoint to identify items and match catalog
  const analyzeImageWithAi = async (base64Image: string) => {
    setIsAnalyzing(true);
    setDetectedItems([]);
    setScannedNewItems([]);
    setSummaryNote(null);
    setAddedSuccessMessage(null);

    try {
      const payload = {
        imageBase64: base64Image,
        productsCatalog: products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          sellingPrice: p.sellingPrice,
          category: p.category,
          stockQuantity: p.stockQuantity,
          unit: p.unit,
        })),
      };

      const res = await fetch('/api/ai/scan-receipt-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const rawMatches: any[] = data.matchedItems || [];
      const rawUnmatched: any[] = data.unmatchedItems || [];

      // 1. Link matched items with existing product catalog
      const matchedWithProducts: DetectedItem[] = [];
      rawMatches.forEach((m) => {
        const prod = products.find((p) => p.id === m.productId);
        if (prod) {
          matchedWithProducts.push({
            product: prod,
            quantity: Math.max(1, m.quantity || 1),
            confidence: m.confidence || 0.85,
            selected: true,
          });
        }
      });

      // 2. Parse unmatched items as new items ready to be added into inventory & receipt
      const newItemsParsed: ScannedNewItem[] = rawUnmatched.map((u: any, idx: number) => {
        const estPrice = Math.max(1, Number(u.suggestedPriceKSh) || 1200);
        const estCost = Math.max(0, Number(u.suggestedCostKSh) || Math.round(estPrice * 0.7));
        const detectedQty = Math.max(1, Number(u.quantity) || 1);
        const category = u.category || 'Electronics';
        const catPrefix = category.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'GEN');
        const sku = (u.suggestedSku || `ROF-${catPrefix}-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase();
        const barcode = (u.suggestedBarcode || `${Math.floor(6164000000000 + Math.random() * 900000000000)}`).replace(/\D/g, '');

        return {
          id: `new_scanned_${Date.now()}_${idx}`,
          detectedName: u.detectedName || `Receipt Item #${idx + 1}`,
          quantity: detectedQty,
          suggestedPriceKSh: estPrice,
          suggestedCostKSh: estCost,
          category,
          subcategory: u.subcategory || 'General',
          sizeCapacity: u.sizeCapacity || 'Standard',
          unit: u.unit || 'pcs',
          suggestedSku: sku,
          suggestedBarcode: barcode,
          description: u.description || `Scanned from receipt on ${new Date().toLocaleDateString()}`,
          selected: true,
          isEditing: false,
          stockToAdd: Math.max(detectedQty * 5, 10),
          isAdded: false,
        };
      });

      setDetectedItems(matchedWithProducts);
      setScannedNewItems(newItemsParsed);
      setSummaryNote(data.summaryNote || null);

      // If user enabled "Auto-Add Directly to Receipt" and items were found:
      if (autoAddDirectly && matchedWithProducts.length > 0) {
        triggerAudioFeedback();
        const itemsToAdd = matchedWithProducts.map((i) => ({
          product: i.product,
          quantity: i.quantity,
        }));
        onAddItemsToReceipt(itemsToAdd);

        const totalQty = itemsToAdd.reduce((sum, item) => sum + item.quantity, 0);

        if (newItemsParsed.length === 0) {
          // No new items to review, celebrate and close smoothly
          setAddedSuccessMessage(`Added ${totalQty} item(s) directly to sales receipt! Closing...`);
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          // There are also NEW items that need adding! Keep modal open and notify
          setAddedSuccessMessage(`Added ${totalQty} matched item(s) to receipt. ⚡ Review & add the ${newItemsParsed.length} new item(s) below!`);
        }
      }
    } catch (err: any) {
      console.error('AI receipt scan error:', err);
      setSummaryNote('Could not identify items. Please ensure good lighting and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Convert a ScannedNewItem into a complete Product entity
  const buildProductFromScanned = (item: ScannedNewItem): Product => {
    const timestamp = new Date().toISOString();
    return {
      id: `prod_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      name: item.detectedName.trim(),
      sku: item.suggestedSku?.trim() || `ROF-NEW-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: item.suggestedBarcode?.trim() || `${Math.floor(6164000000000 + Math.random() * 900000000000)}`,
      category: item.category || 'General',
      subcategory: item.subcategory || 'General',
      sizeCapacity: item.sizeCapacity || 'Standard',
      description: item.description || `Scanned from receipt on ${new Date().toLocaleDateString()}`,
      costPrice: Math.max(0, item.suggestedCostKSh || 0),
      sellingPrice: Math.max(1, item.suggestedPriceKSh || 100),
      stockQuantity: Math.max(1, item.stockToAdd || item.quantity * 5 || 10),
      minStockAlert: 3,
      unit: item.unit || 'pcs',
      supplierId: 'direct_wholesale',
      supplierName: 'Direct Wholesale',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  };

  // Add a single new item to catalog and optionally to receipt cart
  const handleAddNewItem = (itemId: string, andAddToCart: boolean = true) => {
    const targetItem = scannedNewItems.find((i) => i.id === itemId);
    if (!targetItem || targetItem.isAdded) return;

    triggerAudioFeedback();
    const newProduct = buildProductFromScanned(targetItem);

    if (onAddNewProduct) {
      onAddNewProduct(newProduct, andAddToCart, targetItem.quantity);
    } else if (andAddToCart) {
      onAddItemsToReceipt([{ product: newProduct, quantity: targetItem.quantity }]);
    }

    setScannedNewItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, isAdded: true, isEditing: false } : i))
    );

    setAddedSuccessMessage(
      `✨ Added "${newProduct.name}" to store inventory${andAddToCart ? ' & sales receipt' : ''}!`
    );
  };

  // Add ALL selected new items to catalog and optionally to receipt cart
  const handleBatchAddAllNewItems = (andAddToCart: boolean = true) => {
    const pendingNewItems = scannedNewItems.filter((i) => i.selected && !i.isAdded);
    if (pendingNewItems.length === 0) return;

    triggerAudioFeedback();
    const preparedProducts = pendingNewItems.map((item) => ({
      product: buildProductFromScanned(item),
      quantity: item.quantity,
    }));

    if (onBatchAddNewProducts) {
      onBatchAddNewProducts(preparedProducts, andAddToCart);
    } else if (onAddNewProduct) {
      preparedProducts.forEach(({ product, quantity }) => {
        onAddNewProduct(product, andAddToCart, quantity);
      });
    } else if (andAddToCart) {
      onAddItemsToReceipt(preparedProducts);
    }

    const addedIds = new Set(pendingNewItems.map((i) => i.id));
    setScannedNewItems((prev) =>
      prev.map((i) => (addedIds.has(i.id) ? { ...i, isAdded: true, isEditing: false } : i))
    );

    setAddedSuccessMessage(
      `✨ Added ${preparedProducts.length} new product(s) to store catalog${andAddToCart ? ' & sales receipt' : ''}!`
    );
  };

  // Toggle selection of a detected matched catalog item
  const toggleItemSelection = (index: number) => {
    setDetectedItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, selected: !item.selected } : item))
    );
  };

  // Adjust detected matched quantity
  const updateMatchedQuantity = (index: number, delta: number) => {
    setDetectedItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      })
    );
  };

  // Update fields on a scanned new item
  const updateScannedNewItem = (id: string, updates: Partial<ScannedNewItem>) => {
    setScannedNewItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
    );
  };

  // Remove a scanned new item from the list
  const removeScannedNewItem = (id: string) => {
    setScannedNewItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Manual addition of an item that was missed on the receipt
  const handleAddManualCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    const catPrefix = manualCategory.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'GEN');
    const newItem: ScannedNewItem = {
      id: `manual_${Date.now()}`,
      detectedName: manualName.trim(),
      quantity: Math.max(1, manualQty),
      suggestedPriceKSh: Math.max(1, manualPrice),
      suggestedCostKSh: Math.max(0, manualCost),
      category: manualCategory,
      unit: 'pcs',
      suggestedSku: `ROF-${catPrefix}-${Math.floor(1000 + Math.random() * 9000)}`,
      suggestedBarcode: `${Math.floor(6164000000000 + Math.random() * 900000000000)}`,
      description: `Manually added from receipt on ${new Date().toLocaleDateString()}`,
      selected: true,
      isEditing: false,
      stockToAdd: Math.max(manualStock, manualQty),
      isAdded: false,
    };

    setScannedNewItems((prev) => [newItem, ...prev]);
    setManualName('');
    setManualPrice(1000);
    setManualCost(700);
    setManualQty(1);
    setManualStock(10);
    setShowManualNewItemForm(false);
  };

  // Manual Add All Selected Matched Items to Receipt
  const handleConfirmAddSelectedMatched = () => {
    const selected = detectedItems.filter((i) => i.selected);
    if (selected.length === 0) return;

    triggerAudioFeedback();
    const itemsToAdd = selected.map((i) => ({
      product: i.product,
      quantity: i.quantity,
    }));

    onAddItemsToReceipt(itemsToAdd);
    const totalQty = itemsToAdd.reduce((sum, item) => sum + item.quantity, 0);
    setAddedSuccessMessage(`Added ${totalQty} item(s) to sales receipt!`);
  };

  // Reset to take another photo
  const handleRetake = () => {
    setCapturedImage(null);
    setDetectedItems([]);
    setScannedNewItems([]);
    setSummaryNote(null);
    setAddedSuccessMessage(null);
    setShowManualNewItemForm(false);
    startCamera();
  };

  const selectedMatchedCount = detectedItems.filter((i) => i.selected).length;
  const totalAmountMatchedSelected = detectedItems
    .filter((i) => i.selected)
    .reduce((sum, i) => sum + i.product.sellingPrice * i.quantity, 0);

  const pendingNewItems = scannedNewItems.filter((i) => !i.isAdded);
  const selectedPendingNewCount = pendingNewItems.filter((i) => i.selected).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-slate-100 text-sm">AI Receipt & Item Scanner</h3>
                <span className="bg-purple-950 border border-purple-800 text-purple-300 text-[10px] font-mono px-1.5 py-0.2 rounded font-bold">
                  Gemini Vision
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Scan receipts, bills, invoices or counter goods • Auto-adds existing & brand new items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!capturedImage && (
              <button
                type="button"
                onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                title="Switch Camera (Back/Front)"
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* Viewport: Live Camera or Captured Image */}
          {!capturedImage ? (
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 aspect-[4/3] flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />

              {/* Reticle & AI Scanning Beam */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-300 bg-slate-950/85 px-2.5 py-1 rounded-full border border-purple-500/40 flex items-center gap-1.5 shadow-sm">
                      <Sparkles className="w-3 h-3 text-amber-300 animate-spin" />
                      Hold over paper receipt, order list or counter goods
                    </span>
                    <span className="text-[10px] text-slate-400 bg-slate-950/85 px-2 py-0.5 rounded border border-slate-800 font-mono">
                      {facingMode === 'environment' ? 'Rear Camera' : 'Front Camera'}
                    </span>
                  </div>

                  {/* Center reticle */}
                  <div className="relative w-[85%] max-w-[340px] h-40 mx-auto border-2 border-dashed border-purple-500/50 rounded-2xl bg-purple-950/10 flex items-center justify-center">
                    <div className="absolute inset-x-4 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_12px_rgba(168,85,247,0.9)] animate-pulse" />
                  </div>

                  <div className="text-center">
                    <span className="text-[10px] text-slate-300 bg-slate-950/85 px-3 py-1 rounded-lg border border-slate-800">
                      💡 Supports multiple items, supplier receipts, price tags & handwritten lists
                    </span>
                  </div>
                </div>
              )}

              {/* Camera Error Notice */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-950 p-4 text-center flex flex-col items-center justify-center space-y-2 z-10">
                  <AlertCircle className="w-8 h-8 text-amber-400" />
                  <p className="text-xs font-bold text-slate-100">Camera Feed Notice</p>
                  <p className="text-[11px] text-slate-400 max-w-xs">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm mt-2 cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" /> Pick Receipt Photo from Gallery
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 aspect-[16/9] flex items-center justify-center shadow-inner">
              <img
                src={capturedImage}
                alt="Captured receipt / items"
                className="w-full h-full object-cover"
              />
              {isAnalyzing && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-center p-4">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  <p className="text-xs font-bold text-white">Gemini AI is reading receipt & items...</p>
                  <p className="text-[11px] text-slate-400">Extracting names, quantities, prices & detecting new products</p>
                </div>
              )}
            </div>
          )}

          {/* Quick Capture Buttons */}
          {!capturedImage && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCaptureFromCamera}
                className="flex-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 active:scale-95 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>📸 Snap & Scan Receipt with AI</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Choose receipt image from phone gallery"
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-3 rounded-xl border border-slate-700 transition shrink-0 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Direct Auto-Add Toggle */}
          <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-slate-300">Auto-Add Matched Items to Receipt</span>
            </div>
            <button
              type="button"
              onClick={() => setAutoAddDirectly(!autoAddDirectly)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                autoAddDirectly
                  ? 'bg-purple-950 text-purple-300 border-purple-800 font-extrabold'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {autoAddDirectly ? 'Auto-Add: ON' : 'Review First: ON'}
            </button>
          </div>

          {/* Success Banner */}
          {addedSuccessMessage && (
            <div className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs p-3 rounded-xl flex items-center gap-2 font-bold animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="flex-1">{addedSuccessMessage}</span>
            </div>
          )}

          {/* Results Section */}
          {capturedImage && !isAnalyzing && (
            <div className="space-y-4 pt-1">
              {/* Summary note */}
              {summaryNote && (
                <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-300 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">{summaryNote}</p>
                </div>
              )}

              {/* SECTION 1: NEW ITEMS DETECTED (READY TO ADD TO STORE & RECEIPT) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <PackagePlus className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                        <span>New Items Detected from Receipt</span>
                        <span className="bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-mono px-1.5 py-0.2 rounded font-bold">
                          {scannedNewItems.length}
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Items found on receipt that aren't in catalog yet. Tap to add them into store inventory & receipt!
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowManualNewItemForm(!showManualNewItemForm)}
                    className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 bg-slate-800/80 hover:bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 transition flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Manual Add</span>
                  </button>
                </div>

                {/* Manual Add Custom Product Form Drawer */}
                {showManualNewItemForm && (
                  <form
                    onSubmit={handleAddManualCustomItem}
                    className="p-3 bg-slate-950 border border-sky-500/40 rounded-2xl space-y-2.5 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-sky-300 border-b border-slate-800 pb-1.5">
                      <span>Add Unmatched Item from Receipt</span>
                      <button
                        type="button"
                        onClick={() => setShowManualNewItemForm(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Item Name *</label>
                        <input
                          type="text"
                          required
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          placeholder="e.g. Type-C Fast Cable 2m"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Category</label>
                        <select
                          value={manualCategory}
                          onChange={(e) => setManualCategory(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                        >
                          {availableCategories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Sell Price (KSh)</label>
                          <input
                            type="number"
                            min="1"
                            value={manualPrice}
                            onChange={(e) => setManualPrice(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-emerald-400 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Cost Price (KSh)</label>
                          <input
                            type="number"
                            min="0"
                            value={manualCost}
                            onChange={(e) => setManualCost(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Receipt Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={manualQty}
                            onChange={(e) => setManualQty(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Initial Stock</label>
                          <input
                            type="number"
                            min="1"
                            value={manualStock}
                            onChange={(e) => setManualStock(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Item to List</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Scanned New Items List */}
                {scannedNewItems.length === 0 ? (
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 text-center text-xs text-slate-500">
                    No new unmatched items detected. All items on receipt matched existing catalog products!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {scannedNewItems.map((item) => {
                      const profitMargin =
                        item.suggestedPriceKSh > 0
                          ? Math.round(
                              ((item.suggestedPriceKSh - item.suggestedCostKSh) / item.suggestedPriceKSh) * 100
                            )
                          : 0;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border transition ${
                            item.isAdded
                              ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                              : item.isEditing
                              ? 'bg-slate-950 border-purple-500/60 shadow-lg'
                              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {/* Normal View */}
                          {!item.isEditing ? (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="flex items-start gap-2.5 min-w-0">
                                {!item.isAdded ? (
                                  <input
                                    type="checkbox"
                                    checked={item.selected}
                                    onChange={(e) =>
                                      updateScannedNewItem(item.id, { selected: e.target.checked })
                                    }
                                    className="w-4 h-4 mt-0.5 rounded text-purple-600 focus:ring-0 cursor-pointer shrink-0"
                                  />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs text-white truncate max-w-xs">
                                      {item.detectedName}
                                    </span>
                                    <span className="bg-slate-800 text-slate-300 text-[9px] px-1.5 py-0.2 rounded border border-slate-700">
                                      {item.category}
                                    </span>
                                    {item.isAdded && (
                                      <span className="bg-emerald-950 border border-emerald-800 text-emerald-300 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                        ✓ Added to Store
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono flex-wrap">
                                    <span className="text-emerald-400 font-bold">
                                      Sell: KSh {item.suggestedPriceKSh.toLocaleString()}
                                    </span>
                                    <span>•</span>
                                    <span>Cost: KSh {item.suggestedCostKSh.toLocaleString()}</span>
                                    <span>•</span>
                                    <span className="text-amber-300 font-sans text-[10px]">
                                      {profitMargin}% margin
                                    </span>
                                    <span>•</span>
                                    <span className="text-slate-300 font-sans text-[10px]">
                                      Receipt: <b>{item.quantity}x</b>
                                    </span>
                                    <span>•</span>
                                    <span className="text-slate-400 font-sans text-[10px]">
                                      Stock: <b>{item.stockToAdd}</b>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                {!item.isAdded ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => updateScannedNewItem(item.id, { isEditing: true })}
                                      title="Edit item details (Price, Name, Barcode)"
                                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleAddNewItem(item.id, false)}
                                      title="Save to catalog inventory only without adding to sales receipt"
                                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold px-2 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer flex items-center gap-1"
                                    >
                                      <Boxes className="w-3 h-3 text-sky-400" />
                                      <span className="hidden xs:inline">Catalog Only</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleAddNewItem(item.id, true)}
                                      title="Add to Store Catalog AND add to current receipt cart"
                                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition shadow-sm flex items-center gap-1 cursor-pointer active:scale-95"
                                    >
                                      <ShoppingBag className="w-3 h-3 text-emerald-200" />
                                      <span>Add to Cart</span>
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-800/60">
                                    <Check className="w-3 h-3" />
                                    <span>Saved</span>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => removeScannedNewItem(item.id)}
                                  title="Dismiss item"
                                  className="p-1.5 hover:bg-red-950/50 text-slate-500 hover:text-red-400 rounded-lg transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Inline Edit Mode */
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                                <span className="font-bold text-purple-300 text-[11px]">Edit New Product Details</span>
                                <button
                                  type="button"
                                  onClick={() => updateScannedNewItem(item.id, { isEditing: false })}
                                  className="text-slate-400 hover:text-white"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-slate-400 block mb-0.5">Item Name</label>
                                  <input
                                    type="text"
                                    value={item.detectedName}
                                    onChange={(e) =>
                                      updateScannedNewItem(item.id, { detectedName: e.target.value })
                                    }
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] text-slate-400 block mb-0.5">Category</label>
                                  <select
                                    value={item.category}
                                    onChange={(e) =>
                                      updateScannedNewItem(item.id, { category: e.target.value })
                                    }
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                                  >
                                    {availableCategories.map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="grid grid-cols-2 gap-1.5">
                                  <div>
                                    <label className="text-[10px] text-slate-400 block mb-0.5">Sell Price (KSh)</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.suggestedPriceKSh}
                                      onChange={(e) =>
                                        updateScannedNewItem(item.id, {
                                          suggestedPriceKSh: Number(e.target.value),
                                        })
                                      }
                                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-emerald-400 font-mono font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-400 block mb-0.5">Cost Price (KSh)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={item.suggestedCostKSh}
                                      onChange={(e) =>
                                        updateScannedNewItem(item.id, {
                                          suggestedCostKSh: Number(e.target.value),
                                        })
                                      }
                                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 font-mono"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-1.5">
                                  <div>
                                    <label className="text-[10px] text-slate-400 block mb-0.5">Receipt Qty</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) =>
                                        updateScannedNewItem(item.id, {
                                          quantity: Number(e.target.value),
                                        })
                                      }
                                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-400 block mb-0.5">Stock to Add</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.stockToAdd}
                                      onChange={(e) =>
                                        updateScannedNewItem(item.id, {
                                          stockToAdd: Number(e.target.value),
                                        })
                                      }
                                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => updateScannedNewItem(item.id, { isEditing: false })}
                                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1 rounded-lg text-xs transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Save className="w-3.5 h-3.5" /> Done Editing
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Batch Action Buttons for New Items */}
                {pendingNewItems.length > 0 && (
                  <div className="p-2.5 bg-gradient-to-r from-emerald-950/60 to-purple-950/60 rounded-xl border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-300 font-semibold text-center sm:text-left">
                      <span>{selectedPendingNewCount} of {pendingNewItems.length} new items selected</span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => handleBatchAddAllNewItems(false)}
                        disabled={selectedPendingNewCount === 0}
                        className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Boxes className="w-3.5 h-3.5 text-sky-400" />
                        <span>All to Catalog Only</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBatchAddAllNewItems(true)}
                        disabled={selectedPendingNewCount === 0}
                        className="flex-1 sm:flex-initial bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:opacity-50 active:scale-95 text-white text-xs font-black px-4 py-2 rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>✨ Add All New Items to Catalog & Receipt</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: MATCHED CATALOG ITEMS */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-1">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-purple-400" />
                    <span>Existing Catalog Matches ({detectedItems.length})</span>
                  </span>
                  <span>Total: KSh {totalAmountMatchedSelected.toLocaleString()}</span>
                </div>

                {detectedItems.length === 0 ? (
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-[11px] text-slate-500 text-center">
                    No existing catalog products matched this receipt. Add items using the new items section above!
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {detectedItems.map((item, idx) => (
                      <div
                        key={item.product.id + idx}
                        onClick={() => toggleItemSelection(idx)}
                        className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                          item.selected
                            ? 'bg-purple-950/30 border-purple-500/40 text-white'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleItemSelection(idx)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded text-purple-600 focus:ring-0 cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate">{item.product.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              KSh {item.product.sellingPrice.toLocaleString()} • {item.product.category}
                            </p>
                          </div>
                        </div>

                        {/* Quantity Counter */}
                        <div
                          className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => updateMatchedQuantity(idx, -1)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center font-mono font-bold text-xs text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateMatchedQuantity(idx, 1)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Matched Items Action Button */}
                {detectedItems.length > 0 && (
                  <button
                    type="button"
                    disabled={selectedMatchedCount === 0}
                    onClick={handleConfirmAddSelectedMatched}
                    className="w-full bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-50 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/30 cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Add {selectedMatchedCount} Matched Catalog Items to Receipt</span>
                  </button>
                )}
              </div>

              {/* Bottom Footer Actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retake Photo
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 px-3 rounded-xl text-xs transition cursor-pointer text-center"
                >
                  Done / Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
