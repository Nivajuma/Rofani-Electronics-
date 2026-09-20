import React, { useState, useRef, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Barcode,
  Printer,
  Edit2,
  Trash2,
  Filter,
  Sparkles,
  Wand2,
  X,
  Layers,
  ChevronRight,
  ChevronLeft,
  FileSpreadsheet,
  Download,
  List,
  LayoutGrid,
  Camera,
  Upload,
  Loader2,
  Image as ImageIcon,
  History,
  ArrowRightLeft,
  Building2,
  RefreshCw,
  VideoOff,
  FolderTree,
  ChevronDown,
  ChevronUp,
  Tag,
  Eye,
  ZoomIn,
  Check,
  Images,
  Smartphone,
  Star,
  Zap,
  Gem,
  TrendingUp,
  DollarSign,
  Award,
  ShieldAlert
} from 'lucide-react';
import { Product, Supplier, BarcodeScanLog, User, Transaction } from '../../types';
import { generateAutoBarcode, printBarcodeLabels, printBatchBarcodes } from '../../utils/barcode';
import { calculateProfitMargin } from '../../utils/margin';
import { SpreadsheetImportModal } from './SpreadsheetImportModal';
import { ExcelSpreadsheetView } from './ExcelSpreadsheetView';
import { ImageGeneratorModal } from './ImageGeneratorModal';
import { detectDuplicateProducts, deduplicateProducts } from '../../utils/deduplicate';
import { optimizeImageFile, optimizeImageDataUrl } from '../../utils/imageOptimizer';
import { BarcodeScanHistoryModal, BarcodeScanHistoryView } from './BarcodeScanHistoryModal';
import { computeProductsPerformance, computePerformanceSummary, ProductPerformanceInfo } from '../../utils/salesPerformance';
import {
  findConflictingProductWithImage,
  detectRepeatedItemPhotos,
  resolveRepeatedCatalogPhotos
} from '../../utils/productImages';

interface InventoryViewProps {
  products: Product[];
  categories: any[];
  suppliers: Supplier[];
  transactions?: Transaction[];
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onBatchImportProducts?: (importedProducts: Product[], replaceExisting: boolean) => void;
  onAddSupplier?: (supplier: Supplier) => void;
  initialShowLowStockOnly?: boolean;
  onViewProductHistory?: (product: Product) => void;
  onOpenStoreManagerModal?: () => void;
  currentUser?: User;
  allUsers?: User[];
  scanLogs?: BarcodeScanLog[];
  onRecordScanLog?: (log: BarcodeScanLog) => void;
  onClearScanLogs?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  categories,
  suppliers,
  transactions = [],
  onSaveProduct,
  onDeleteProduct,
  onBatchImportProducts,
  onAddSupplier,
  initialShowLowStockOnly = false,
  onViewProductHistory,
  onOpenStoreManagerModal,
  currentUser = {
    id: 'usr-1',
    name: 'John Doe (Admin)',
    role: 'Admin',
    email: 'admin@rofani.co.ke',
    pin: '1234',
  },
  allUsers = [],
  scanLogs = [],
  onRecordScanLog = () => {},
  onClearScanLogs = () => {},
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(initialShowLowStockOnly);
  const [performanceFilter, setPerformanceFilter] = useState<'All' | 'high_sales_high_profit' | 'low_sales' | 'high_sales_low_profit' | 'low_sales_high_profit' | 'unranked_no_sales'>('All');

  // Sales Velocity & Profit Performance Analytics
  const performanceMap = React.useMemo(() => {
    return computeProductsPerformance(products, transactions);
  }, [products, transactions]);

  const performanceSummary = React.useMemo(() => {
    return computePerformanceSummary(performanceMap);
  }, [performanceMap]);

  // Sync state when initialShowLowStockOnly prop changes from parent
  React.useEffect(() => {
    if (initialShowLowStockOnly !== undefined) {
      setShowLowStockOnly(initialShowLowStockOnly);
    }
  }, [initialShowLowStockOnly]);

  // View Mode: 'standard' (table) vs 'excel' (grid) vs 'grouped' (hierarchy) vs 'scan_history' (barcode scan log)
  const [inventoryViewMode, setInventoryViewMode] = useState<'standard' | 'excel' | 'grouped' | 'scan_history'>('standard');
  const [showScanHistoryModal, setShowScanHistoryModal] = useState<boolean>(false);

  // Custom Category & Subcategory Creation in Modal
  const [isCustomCategoryInput, setIsCustomCategoryInput] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [isCustomSubcategoryInput, setIsCustomSubcategoryInput] = useState(false);
  const [customSubcategoryName, setCustomSubcategoryName] = useState('');

  // Custom Supplier Creation in Modal
  const [isCustomSupplierInput, setIsCustomSupplierInput] = useState(false);
  const [customSupplierName, setCustomSupplierName] = useState('');

  // Selected Supplier for AI Item Scans (Camera / Gallery / Batch)
  const [selectedScanSupplierId, setSelectedScanSupplierId] = useState<string>(
    suppliers[0]?.id || ''
  );

  useEffect(() => {
    if (!selectedScanSupplierId && suppliers.length > 0) {
      setSelectedScanSupplierId(suppliers[0].id);
    }
  }, [suppliers, selectedScanSupplierId]);

  // Grouped View Collapsed Accordions State
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Pagination & View State for 300+ items
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showSheetImportModal, setShowSheetImportModal] = useState<boolean>(false);
  const [showImageStudioModal, setShowImageStudioModal] = useState<boolean>(false);

  // Modal State for New/Edit Item
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // Camera & Gallery Upload Refs & State
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const batchGalleryInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isAiIdentifying, setIsAiIdentifying] = useState(false);
  const [isBatchScanning, setIsBatchScanning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentName?: string }>({
    current: 0,
    total: 0,
  });
  const [aiIdentifyResult, setAiIdentifyResult] = useState<string | null>(null);
  const [autoSaveOnCameraSnap, setAutoSaveOnCameraSnap] = useState<boolean>(true);
  const [autoAddSuccessToast, setAutoAddSuccessToast] = useState<string | null>(null);

  // Auto Deduplicate Repeated Items State
  const [showDeduplicateModal, setShowDeduplicateModal] = useState<boolean>(false);
  const [showAiScanModal, setShowAiScanModal] = useState<boolean>(false);
  const [isDragOverPhoto, setIsDragOverPhoto] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const duplicateGroups = detectDuplicateProducts(products);
  const totalDuplicateItemsToDelete = duplicateGroups.reduce((acc, g) => acc + g.duplicateItems.length, 0);
  const totalStockToMerge = duplicateGroups.reduce((acc, g) => acc + g.totalStockToMerge, 0);

  // Detect repeated photos across entire catalog
  const repeatedPhotoGroups = React.useMemo(() => {
    return detectRepeatedItemPhotos(products);
  }, [products]);

  const totalItemsWithRepeatedPhotos = repeatedPhotoGroups.reduce(
    (acc, g) => acc + g.products.length,
    0
  );

  const repeatedProductIds = React.useMemo(() => {
    const ids = new Set<string>();
    repeatedPhotoGroups.forEach((g) => {
      g.products.forEach((p) => ids.add(p.id));
    });
    return ids;
  }, [repeatedPhotoGroups]);

  const handleFixAllRepeatedPhotos = () => {
    const result = resolveRepeatedCatalogPhotos(products);
    if (result.fixedItemsCount === 0) return;

    if (onBatchImportProducts) {
      onBatchImportProducts(result.updatedProducts, true);
    } else {
      result.updatedProducts.forEach((p) => {
        onSaveProduct(p);
      });
    }

    setAutoAddSuccessToast(
      `✨ Reassigned ${result.fixedItemsCount} product photos with 100% unique studio photography!`
    );
  };

  const handleConfirmDeduplicate = () => {
    const result = deduplicateProducts(products);
    if (onBatchImportProducts) {
      onBatchImportProducts(result.cleanedProducts, true);
    }
    setShowDeduplicateModal(false);
    setAutoAddSuccessToast(
      `✨ Auto-deleted ${result.removedProductsCount} repeated items & merged ${result.mergedStockUnitsTotal} stock units into unique products!`
    );
  };

  // In-App Live WebCam Stream State & Refs (Zero-heap-spike camera)
  const [showLiveCameraModal, setShowLiveCameraModal] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraStreamError, setCameraStreamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const startLiveCamera = async (facing: 'environment' | 'user' = 'environment') => {
    setCameraStreamError(null);
    setShowLiveCameraModal(true);

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Error starting live camera stream:', err);
      setCameraStreamError(
        'Live WebCam access denied or unavailable. Tap "Phone Gallery" below to choose or snap a photo directly.'
      );
    }
  };

  const stopLiveCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowLiveCameraModal(false);
    setCameraStreamError(null);
  };

  // Ensure video element receives stream whenever modal mounts
  useEffect(() => {
    if (showLiveCameraModal && videoRef.current && mediaStreamRef.current) {
      if (videoRef.current.srcObject !== mediaStreamRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [showLiveCameraModal]);

  // Clipboard paste support for photos (Ctrl+V / Cmd+V anywhere while adding/editing product)
  useEffect(() => {
    if (!showModal) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            processImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showModal]);

  const captureLiveCameraSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    let width = video.videoWidth || video.clientWidth || 640;
    let height = video.videoHeight || video.clientHeight || 480;

    if (width <= 10 || height <= 10) {
      alert('Camera is still focusing/loading. Please wait a second and tap snap again.');
      return;
    }

    // Downscale directly on capture to keep memory under 2MB
    const MAX_DIM = 640;
    if (width > MAX_DIM || height > MAX_DIM) {
      if (width > height) {
        height = Math.round((height * MAX_DIM) / width);
        width = MAX_DIM;
      } else {
        width = Math.round((width * MAX_DIM) / height);
        height = MAX_DIM;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

      // Clean up canvas and immediately release phone camera hardware sensor
      canvas.width = 0;
      canvas.height = 0;
      stopLiveCamera();

      if (dataUrl && dataUrl.length > 100) {
        const activeSupplier = suppliers.find((s) => s.id === selectedScanSupplierId) || suppliers[0];
        setEditingProduct((prev) => {
          const base = prev || {
            id: `prod-${Date.now()}`,
            name: '',
            sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
            barcode: generateAutoBarcode(),
            category: categories[0]?.name || 'Electronics',
            subcategory: categories[0]?.subcategories[0] || 'General',
            sizeCapacity: '',
            costPrice: 0,
            sellingPrice: 0,
            stockQuantity: 10,
            minStockAlert: 5,
            unit: 'pcs',
            supplierId: activeSupplier?.id || '',
            supplierName: activeSupplier?.name || 'Direct Wholesale',
            description: '',
            createdAt: new Date().toISOString().slice(0, 10),
            updatedAt: new Date().toISOString().slice(0, 10),
          };
          return { ...base, imageUrl: dataUrl };
        });

        // If user took camera snap inside the Quick AI Scan modal or add flow, run identification
        handleAiIdentifyProduct(dataUrl);
      }
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    startLiveCamera(nextFacing);
  };

  const handleAiIdentifyProduct = async (
    imageDataUrl: string,
    targetProduct?: Partial<Product> | null,
    isManualInModal: boolean = false
  ) => {
    if (!imageDataUrl) return;
    setIsAiIdentifying(true);
    setAiIdentifyResult(null);

    try {
      const response = await fetch('/api/ai/identify-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imageDataUrl }),
      });

      let data: any = null;
      if (response.ok) {
        data = await response.json();
      }

      const current = targetProduct || editingProduct;
      const itemName = 'Scanned Item';
      const itemCategory = data?.category || categories[0]?.name || 'Electronics';
      const itemSubcategory = data?.subcategory || categories[0]?.subcategories[0] || 'General';
      const itemPrice = data?.suggestedPriceKSh || 1200;
      const itemCost = data?.suggestedCostKSh || 800;
      const itemDescription = data?.description || 'Product photo captured from camera.';
      const itemSku = data?.suggestedSku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;

      const activeSupplier = suppliers.find((s) => s.id === selectedScanSupplierId) || suppliers[0];
      const targetSupplierId = isManualInModal && current?.supplierId ? current.supplierId : (activeSupplier?.id || '');
      const targetSupplierName = isManualInModal && current?.supplierName ? current.supplierName : (activeSupplier?.name || 'Direct Wholesale');

      if (autoSaveOnCameraSnap && showAiScanModal && !isManualInModal && !showModal) {
        // Construct auto-saved product and save immediately from Quick Scanner
        const autoSavedProduct: Product = {
          id: current?.id && !current.id.startsWith('prod-') ? current.id : `prod-${Date.now()}`,
          name: itemName,
          sku: itemSku,
          barcode: current?.barcode || generateAutoBarcode(),
          category: itemCategory,
          subcategory: itemSubcategory,
          sizeCapacity: current?.sizeCapacity || '',
          description: itemDescription,
          costPrice: itemCost,
          sellingPrice: itemPrice,
          stockQuantity: current?.stockQuantity || 10,
          minStockAlert: current?.minStockAlert || 5,
          unit: 'pcs',
          supplierId: targetSupplierId,
          supplierName: targetSupplierName,
          imageUrl: imageDataUrl,
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
        };

        onSaveProduct(autoSavedProduct);
        setShowModal(false);
        setShowAiScanModal(false);
        setEditingProduct(null);
        setAutoAddSuccessToast(`⚡ AI AUTO-ADDED TO INVENTORY: "${autoSavedProduct.name}" (${autoSavedProduct.category}) @ KSh ${autoSavedProduct.sellingPrice.toLocaleString()} - Stock: ${autoSavedProduct.stockQuantity} pcs`);
        setTimeout(() => setAutoAddSuccessToast(null), 8000);
      } else {
        // Populate fields and show modal with photo intact for review
        setEditingProduct((prev) => {
          const base = prev || current || {
            id: `prod-${Date.now()}`,
            name: itemName,
            sku: itemSku,
            barcode: generateAutoBarcode(),
            category: itemCategory,
            subcategory: itemSubcategory,
            sizeCapacity: '',
            costPrice: itemCost,
            sellingPrice: itemPrice,
            stockQuantity: 10,
            minStockAlert: 5,
            unit: 'pcs',
            supplierId: targetSupplierId,
            supplierName: targetSupplierName,
            description: itemDescription,
            createdAt: new Date().toISOString().slice(0, 10),
            updatedAt: new Date().toISOString().slice(0, 10),
          };

          return {
            ...base,
            name: base.name ? base.name : itemName,
            category: base.category && base.category !== 'General' ? base.category : itemCategory,
            subcategory: base.subcategory && base.subcategory !== 'General' ? base.subcategory : itemSubcategory,
            sellingPrice: base.sellingPrice || itemPrice,
            costPrice: base.costPrice || itemCost,
            description: base.description || itemDescription,
            sku: base.sku || itemSku,
            supplierId: base.supplierId || targetSupplierId,
            supplierName: base.supplierName || targetSupplierName,
            imageUrl: imageDataUrl,
          };
        });
        setShowModal(true);
        setShowAiScanModal(false);
        setAiIdentifyResult(`✨ AI Scanned: "${itemName}" (${itemCategory}) - Est. KSh ${itemPrice.toLocaleString()}`);
      }
    } catch (err) {
      console.error('Error running AI Camera product identification:', err);
      const activeSupplier = suppliers.find((s) => s.id === selectedScanSupplierId) || suppliers[0];
      const targetSupplierId = activeSupplier?.id || '';
      const targetSupplierName = activeSupplier?.name || 'Direct Wholesale';
      setEditingProduct((prev) => {
        const base = prev || {
          id: `prod-${Date.now()}`,
          name: 'Scanned Item',
          sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
          barcode: generateAutoBarcode(),
          category: categories[0]?.name || 'Electronics',
          subcategory: categories[0]?.subcategories[0] || 'General',
          sizeCapacity: '',
          costPrice: 800,
          sellingPrice: 1200,
          stockQuantity: 10,
          minStockAlert: 5,
          unit: 'pcs',
          supplierId: targetSupplierId,
          supplierName: targetSupplierName,
          description: 'Product photo attached. Please verify and confirm specifications.',
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
        };
        return { ...base, imageUrl: imageDataUrl };
      });
      setShowModal(true);
      setShowAiScanModal(false);
      setAiIdentifyResult('Photo attached: "Scanned Item". Please verify and confirm details.');
    } finally {
      setIsAiIdentifying(false);
    }
  };

  const handleClearPhotoAndMemory = () => {
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';

    setEditingProduct((prev) => (prev ? { ...prev, imageUrl: '' } : null));
    setAiIdentifyResult(null);
    setIsAiIdentifying(false);
    setIsUploadingPhoto(false);
  };

  const processImageFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|webp|gif|heic|heif|bmp|svg|avif)$/i)) {
      alert('Please select a valid image file (JPG, PNG, WEBP, GIF, SVG, HEIC, etc.).');
      return;
    }

    setIsUploadingPhoto(true);

    try {
      // 1. Optimize directly with low-memory pipeline (max 640px, ~40KB JPEG)
      const compressedDataUrl = await optimizeImageFile(file, 640, 0.8);

      if (!compressedDataUrl || compressedDataUrl.length < 50) {
        throw new Error('Image could not be compressed');
      }

      // 2. Set the compressed image preview
      setEditingProduct((prev) => {
        const base = prev || {
          id: `prod-${Date.now()}`,
          name: '',
          sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
          barcode: generateAutoBarcode(),
          category: categories[0]?.name || 'Electronics',
          subcategory: categories[0]?.subcategories[0] || 'General',
          sizeCapacity: '',
          costPrice: 0,
          sellingPrice: 0,
          stockQuantity: 10,
          minStockAlert: 5,
          unit: 'pcs',
          supplierId: suppliers[0]?.id || '',
          supplierName: suppliers[0]?.name || 'Direct Wholesale',
          description: '',
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
        };
        return { ...base, imageUrl: compressedDataUrl };
      });

      setIsUploadingPhoto(false);

      // 3. Run AI identification with the lightweight photo
      if (showAiScanModal || !showModal) {
        handleAiIdentifyProduct(compressedDataUrl);
      }
    } catch (err) {
      console.error('Error optimizing image file:', err);
      setIsUploadingPhoto(false);
      alert('Could not process this image file. Please try taking a fresh photo.');
    }
  };

  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    e.target.value = '';
  };

  const handleBatchGalleryFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files) as File[];
    e.target.value = '';

    setIsBatchScanning(true);
    setBatchProgress({ current: 0, total: fileList.length });

    let addedCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file: File = fileList[i];
      setBatchProgress({
        current: i + 1,
        total: fileList.length,
        currentName: file.name,
      });

      try {
        const compressedDataUrl = await optimizeImageFile(file, 640, 0.75);
        if (!compressedDataUrl) continue;

        const response = await fetch('/api/ai/identify-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: compressedDataUrl }),
        });

        if (response.ok) {
          const data = await response.json();
          const activeSupplier = suppliers.find((s) => s.id === selectedScanSupplierId) || suppliers[0];
          const autoProduct: Product = {
            id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: 'Scanned Item',
            sku: data?.suggestedSku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
            barcode: generateAutoBarcode(),
            category: data?.category || categories[0]?.name || 'Electronics',
            subcategory: data?.subcategory || categories[0]?.subcategories[0] || 'General',
            sizeCapacity: '',
            description: data?.description || 'Auto-added from mobile photo gallery.',
            costPrice: data?.suggestedCostKSh || 1000,
            sellingPrice: data?.suggestedPriceKSh || 1500,
            stockQuantity: 10,
            minStockAlert: 5,
            unit: 'pcs',
            supplierId: activeSupplier?.id || '',
            supplierName: activeSupplier?.name || 'Direct Wholesale',
            imageUrl: compressedDataUrl,
            createdAt: new Date().toISOString().slice(0, 10),
            updatedAt: new Date().toISOString().slice(0, 10),
          };

          onSaveProduct(autoProduct);
          addedCount++;
        }
      } catch (err) {
        console.error('Error processing batch gallery file:', file.name, err);
      }
    }

    setIsBatchScanning(false);
    setShowAiScanModal(false);
    if (addedCount > 0) {
      setAutoAddSuccessToast(
        `⚡ AI AUTO-ADDED ${addedCount} ITEM${addedCount > 1 ? 'S' : ''} FROM YOUR PHONE GALLERY DIRECTLY INTO INVENTORY!`
      );
      setTimeout(() => setAutoAddSuccessToast(null), 8000);
    }
  };

  // Modal State for On-The-Fly New Supplier
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupName, setNewSupName] = useState('');
  const [newSupContact, setNewSupContact] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupEmail, setNewSupEmail] = useState('');
  const [newSupAddress, setNewSupAddress] = useState('');

  const handleSaveNewSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;

    const createdSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      name: newSupName.trim(),
      contactPerson: newSupContact.trim() || 'General Sales Dept',
      phone: newSupPhone.trim() || 'N/A',
      email: newSupEmail.trim() || 'contact@supplier.com',
      address: newSupAddress.trim() || 'Wholesale Industrial District',
      totalSuppliedValue: 0,
    };

    if (onAddSupplier) {
      onAddSupplier(createdSupplier);
    }

    if (editingProduct) {
      setEditingProduct((prev) =>
        prev
          ? {
              ...prev,
              supplierId: createdSupplier.id,
              supplierName: createdSupplier.name,
            }
          : prev
      );
    }

    setSelectedScanSupplierId(createdSupplier.id);
    setIsCustomSupplierInput(false);
    setCustomSupplierName('');

    setNewSupName('');
    setNewSupContact('');
    setNewSupPhone('');
    setNewSupEmail('');
    setNewSupAddress('');
    setShowAddSupplierModal(false);
    setAutoAddSuccessToast(`✨ Supplier "${createdSupplier.name}" added and assigned!`);
    setTimeout(() => setAutoAddSuccessToast(null), 5000);
  };

  // Consolidate categories from prop 'categories' and all categories & subcategories present in 'products'
  const consolidatedCategories = React.useMemo(() => {
    const categoryMap = new Map<string, Set<string>>();

    // 1. Add categories from categories prop
    (categories || []).forEach((cat: any) => {
      if (!cat.name) return;
      const cName = cat.name.trim();
      if (!categoryMap.has(cName)) {
        categoryMap.set(cName, new Set());
      }
      const subSet = categoryMap.get(cName)!;
      (cat.subcategories || []).forEach((sub: string) => {
        if (sub) subSet.add(sub.trim());
      });
    });

    // 2. Add categories and subcategories from products (including all imported items)
    (products || []).forEach((prod) => {
      const catName = prod.category ? prod.category.trim() : 'General';
      const subName = prod.subcategory ? prod.subcategory.trim() : '';
      if (!categoryMap.has(catName)) {
        categoryMap.set(catName, new Set());
      }
      if (subName) {
        categoryMap.get(catName)!.add(subName);
      }
    });

    // Convert map to array
    const result: { id: string; name: string; subcategories: string[] }[] = [];
    categoryMap.forEach((subSet, catName) => {
      const subs = Array.from(subSet).sort((a, b) => a.localeCompare(b));
      result.push({
        id: `cat-${catName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: catName,
        subcategories: subs.length > 0 ? subs : ['General'],
      });
    });

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, products]);

  // Available subcategories for dropdown filter
  const currentCategoryObj = consolidatedCategories.find((c) => c.name === selectedCategory);
  const availableSubcategories = currentCategoryObj ? currentCategoryObj.subcategories : [];

  // Filtered list
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSubCat = selectedSubcategory === 'All' || p.subcategory === selectedSubcategory;
    const matchesLowStock = !showLowStockOnly || p.stockQuantity <= p.minStockAlert;

    let matchesPerf = true;
    const perf = performanceMap[p.id];
    if (performanceFilter === 'high_sales_high_profit') {
      matchesPerf = perf?.tier === 'high_sales_high_profit';
    } else if (performanceFilter === 'low_sales') {
      matchesPerf = perf?.tier === 'low_sales_low_profit' || perf?.tier === 'low_sales_high_profit';
    } else if (performanceFilter === 'high_sales_low_profit') {
      matchesPerf = perf?.tier === 'high_sales_low_profit';
    } else if (performanceFilter === 'low_sales_high_profit') {
      matchesPerf = perf?.tier === 'low_sales_high_profit';
    } else if (performanceFilter === 'unranked_no_sales') {
      matchesPerf = perf?.tier === 'unranked_no_sales';
    }

    return matchesSearch && matchesCat && matchesSubCat && matchesLowStock && matchesPerf;
  });

  // Grouped products for Grouped Hierarchy View mode
  const groupedProducts = React.useMemo(() => {
    const groups: Record<string, Record<string, Product[]>> = {};

    filteredProducts.forEach((p) => {
      const cat = p.category ? p.category.trim() : 'Uncategorized';
      const sub = p.subcategory ? p.subcategory.trim() : 'General';

      if (!groups[cat]) {
        groups[cat] = {};
      }
      if (!groups[cat][sub]) {
        groups[cat][sub] = [];
      }
      groups[cat][sub].push(p);
    });

    return groups;
  }, [filteredProducts]);

  const toggleCategoryCollapse = (catName: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catName]: !prev[catName] }));
  };

  const handleExpandAllCategories = () => {
    setCollapsedCategories({});
  };

  const handleCollapseAllCategories = () => {
    const allCollapsed: Record<string, boolean> = {};
    Object.keys(groupedProducts).forEach((cat) => {
      allCollapsed[cat] = true;
    });
    setCollapsedCategories(allCollapsed);
  };

  // Calculate Pagination Slices
  const totalPages = itemsPerPage > 0 ? Math.ceil(filteredProducts.length / itemsPerPage) : 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts =
    itemsPerPage > 0 ? filteredProducts.slice(startIndex, startIndex + itemsPerPage) : filteredProducts;

  // Open modal for NEW item
  const handleOpenNewModal = (prefillCategory?: string, prefillSubcategory?: string) => {
    const autoCode = generateAutoBarcode();
    const defaultCat = prefillCategory || consolidatedCategories[0]?.name || 'Electronics';
    const defaultSub = prefillSubcategory || consolidatedCategories.find((c) => c.name === defaultCat)?.subcategories[0] || 'General';
    const activeScanSupplier = suppliers.find((s) => s.id === selectedScanSupplierId) || suppliers[0];
    const defaultSupId = activeScanSupplier?.id || suppliers[0]?.id || '';
    const defaultSupName = activeScanSupplier?.name || suppliers[0]?.name || 'Direct Wholesale';

    setIsCustomCategoryInput(false);
    setCustomCategoryName('');
    setIsCustomSubcategoryInput(false);
    setCustomSubcategoryName('');
    setIsCustomSupplierInput(false);
    setCustomSupplierName('');
    setShowAddSupplierModal(false);
    setShowLiveCameraModal(false);
    setShowDeduplicateModal(false);
    setShowImageStudioModal(false);

    setEditingProduct({
      id: `prod-${Date.now()}`,
      name: '',
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: autoCode,
      category: defaultCat,
      subcategory: defaultSub,
      sizeCapacity: '',
      description: '',
      costPrice: '' as any,
      sellingPrice: '' as any,
      stockQuantity: '' as any,
      minStockAlert: '5' as any,
      unit: 'pcs',
      supplierId: defaultSupId,
      supplierName: defaultSupName,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setShowModal(true);
  };

  // Open modal for EDITing item
  const handleOpenEditModal = (p: Product) => {
    setIsCustomCategoryInput(false);
    setCustomCategoryName('');
    setIsCustomSubcategoryInput(false);
    setCustomSubcategoryName('');
    setIsCustomSupplierInput(false);
    setCustomSupplierName('');
    setShowAddSupplierModal(false);
    setShowLiveCameraModal(false);
    setShowDeduplicateModal(false);
    setShowImageStudioModal(false);
    setEditingProduct({ ...p });
    setShowModal(true);
  };

  // Save product submit
  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name) return;

    const finalCat = isCustomCategoryInput && customCategoryName.trim()
      ? customCategoryName.trim()
      : editingProduct.category || 'General';

    const finalSub = isCustomSubcategoryInput && customSubcategoryName.trim()
      ? customSubcategoryName.trim()
      : editingProduct.subcategory || 'General';

    const parseNum = (val: any, defaultVal = 0) => {
      if (val === '' || val === undefined || val === null) return defaultVal;
      const parsed = parseFloat(String(val));
      return isNaN(parsed) ? defaultVal : parsed;
    };

    const parseIntNum = (val: any, defaultVal = 0) => {
      if (val === '' || val === undefined || val === null) return defaultVal;
      const parsed = parseInt(String(val), 10);
      return isNaN(parsed) ? defaultVal : parsed;
    };

    let finalSupplierId = editingProduct.supplierId;
    let finalSupplierName = editingProduct.supplierName || 'Direct Wholesale';

    if (isCustomSupplierInput && customSupplierName.trim()) {
      const supName = customSupplierName.trim();
      const existing = suppliers.find(
        (s) => s.name.toLowerCase().trim() === supName.toLowerCase().trim()
      );
      if (existing) {
        finalSupplierId = existing.id;
        finalSupplierName = existing.name;
      } else {
        const createdSupplier: Supplier = {
          id: `sup-${Date.now()}`,
          name: supName,
          contactPerson: 'General Sales Dept',
          phone: 'N/A',
          email: 'contact@supplier.com',
          address: 'Wholesale Industrial District',
          totalSuppliedValue: 0,
        };
        if (onAddSupplier) {
          onAddSupplier(createdSupplier);
        }
        finalSupplierId = createdSupplier.id;
        finalSupplierName = createdSupplier.name;
        setSelectedScanSupplierId(createdSupplier.id);
      }
    } else if (!finalSupplierId && suppliers.length > 0) {
      finalSupplierId = suppliers[0].id;
      finalSupplierName = suppliers[0].name;
    }

    const prodToSave: Product = {
      ...(editingProduct as Product),
      category: finalCat,
      subcategory: finalSub,
      supplierId: finalSupplierId,
      supplierName: finalSupplierName,
      costPrice: parseNum(editingProduct.costPrice, 0),
      sellingPrice: parseNum(editingProduct.sellingPrice, 0),
      stockQuantity: parseIntNum(editingProduct.stockQuantity, 0),
      minStockAlert: parseIntNum(editingProduct.minStockAlert, 0),
    };

    onSaveProduct(prodToSave);
    setShowModal(false);
    setEditingProduct(null);
    setIsCustomCategoryInput(false);
    setCustomCategoryName('');
    setIsCustomSubcategoryInput(false);
    setCustomSubcategoryName('');
    setIsCustomSupplierInput(false);
    setCustomSupplierName('');
  };

  // Generate barcode button in form
  const handleGenerateBarcodeInForm = () => {
    if (editingProduct) {
      setEditingProduct({
        ...editingProduct,
        barcode: generateAutoBarcode()
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner & View Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-950 border border-sky-800 text-sky-400 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
              <span>Stock & Inventory Catalog</span>
            </h2>
            <p className="text-xs text-slate-400">
              Manage 300+ items in Excel Grid layout or standard table view with AI Image Generation
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setInventoryViewMode('standard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                inventoryViewMode === 'standard'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Standard Table</span>
            </button>

            <button
              onClick={() => setInventoryViewMode('excel')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                inventoryViewMode === 'excel'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel Grid View</span>
            </button>

            <button
              onClick={() => setInventoryViewMode('grouped')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                inventoryViewMode === 'grouped'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Grouped Hierarchy by Category & Sub-Category"
            >
              <FolderTree className="w-4 h-4" />
              <span>Grouped Hierarchy</span>
            </button>

            <button
              id="btn-inventory-tab-scan-history"
              onClick={() => setInventoryViewMode('scan_history')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                inventoryViewMode === 'scan_history'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Barcode Scanner History & Staff Audit Log"
            >
              <Barcode className="w-4 h-4" />
              <span>Scan History</span>
              {scanLogs.length > 0 && (
                <span className="bg-sky-400/20 text-sky-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-sky-400/30">
                  {scanLogs.length}
                </span>
              )}
            </button>
          </div>

          {onOpenStoreManagerModal && (
            <button
              id="btn-inventory-transfer-stock"
              onClick={onOpenStoreManagerModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
              title="Transfer stock between store outlets and view branch inventory"
            >
              <ArrowRightLeft className="w-4 h-4" /> Transfer Stock / Outlets
            </button>
          )}

          <button
            id="btn-inventory-open-scan-history-modal"
            onClick={() => setShowScanHistoryModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg"
            title="Open Barcode Scanner History & Audit Log Modal"
          >
            <Barcode className="w-4 h-4 text-sky-400" />
            <span>Scan Log ({scanLogs.length})</span>
          </button>

          <button
            id="btn-inventory-import-sheet"
            onClick={() => setShowSheetImportModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <FileSpreadsheet className="w-4 h-4" /> Import Sheet
          </button>

          <button
            id="btn-inventory-print-barcodes"
            onClick={() => {
              const batchData = filteredProducts.map((p) => ({
                name: p.name,
                price: p.sellingPrice,
                barcode: p.barcode,
                count: 1
              }));
              printBatchBarcodes(batchData, `Inventory Barcodes Sheet (${filteredProducts.length} items)`);
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg"
            title="Print 1 barcode label for every item in current inventory view"
          >
            <Barcode className="w-4 h-4 text-sky-400" /> Print All Barcodes
          </button>

          <button
            id="btn-inventory-autodelete-duplicates"
            onClick={() => setShowDeduplicateModal(true)}
            className="bg-amber-950/80 hover:bg-amber-900 border border-amber-600/80 text-amber-200 font-extrabold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg relative"
            title="Scan inventory for repeated/duplicate items and auto-delete redundant copies while merging stock"
          >
            <Trash2 className="w-4 h-4 text-amber-400" />
            <span>Auto Delete Duplicates</span>
            {duplicateGroups.length > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono">
                {duplicateGroups.length}
              </span>
            )}
          </button>

          <button
            id="btn-inventory-add-item"
            onClick={() => handleOpenNewModal()}
            className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-sky-600/20"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>

          <button
            id="btn-inventory-gallery-auto-add"
            onClick={() => {
              setShowAiScanModal(true);
              // Trigger gallery picker directly
              galleryInputRef.current?.click();
            }}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-teal-600/20 border border-teal-400/40 cursor-pointer"
            title="Pick a photo from your mobile phone gallery - AI extracts specs & auto-adds to inventory!"
          >
            <Smartphone className="w-4 h-4 text-emerald-300" />
            <span>📱 Phone Gallery (AI Add)</span>
          </button>

          <button
            id="btn-inventory-camera-auto-add"
            onClick={() => {
              setShowAiScanModal(true);
            }}
            className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-500/30 border border-emerald-300/50 cursor-pointer"
            title="Snap phone camera photo, choose from mobile gallery or batch add multiple items - AI will automatically identify, categorize & add items into stock!"
          >
            <Sparkles className="w-4 h-4 text-slate-950 animate-pulse" />
            <span>⚡ AI Vision Scanner</span>
          </button>
        </div>
      </div>

      {/* Repeated / Duplicate Items Alert Banner */}
      {duplicateGroups.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 border border-amber-500/80 p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse text-amber-400" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-100 flex items-center gap-2">
                <span>Repeated / Duplicate Items Detected</span>
                <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {duplicateGroups.length} {duplicateGroups.length === 1 ? 'group' : 'groups'} ({totalDuplicateItemsToDelete} repeated items)
                </span>
              </h4>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Found duplicate items matching barcode, SKU, or name. Auto-delete redundant copies and safely combine their stock quantities!
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDeduplicateModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20 shrink-0"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Auto Delete Repeated Items ({totalDuplicateItemsToDelete})</span>
          </button>
        </div>
      )}

      {/* Repeated Photos Alert Banner */}
      {totalItemsWithRepeatedPhotos > 0 && (
        <div className="bg-gradient-to-r from-purple-950/90 via-slate-900 to-indigo-950/90 border border-purple-500/80 p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/40 shrink-0">
              <ImageIcon className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-purple-100 flex items-center gap-2">
                <span>Repeated Product Photos Detected</span>
                <span className="bg-purple-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {repeatedPhotoGroups.length} photos shared across {totalItemsWithRepeatedPhotos} items
                </span>
              </h4>
              <p className="text-xs text-purple-300/80 mt-0.5">
                Multiple items are using identical stock photos. Reassign them automatically with distinct studio shots so every product has a unique photo!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleFixAllRepeatedPhotos}
              className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-purple-600/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Fix Repeated Photos (Make Unique)</span>
            </button>
          </div>
        </div>
      )}

      {/* Auto-Add AI Camera Success Toast Banner */}
      {autoAddSuccessToast && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-emerald-500/80 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-emerald-300 font-extrabold text-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/40">
              <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
            </span>
            <span>{autoAddSuccessToast}</span>
          </div>
          <button
            onClick={() => setAutoAddSuccessToast(null)}
            className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-slate-950 rounded-lg text-xs transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {inventoryViewMode === 'excel' ? (
        <ExcelSpreadsheetView
          products={products}
          categories={categories}
          suppliers={suppliers}
          transactions={transactions}
          onSaveProduct={onSaveProduct}
          onDeleteProduct={onDeleteProduct}
          onBatchImportProducts={onBatchImportProducts}
          showLowStockOnly={showLowStockOnly}
          onToggleLowStockOnly={() => setShowLowStockOnly(!showLowStockOnly)}
          onViewProductHistory={onViewProductHistory}
        />
      ) : inventoryViewMode === 'scan_history' ? (
        <BarcodeScanHistoryView
          scanLogs={scanLogs}
          products={products}
          currentUser={currentUser}
          allUsers={allUsers}
          onRecordScanLog={onRecordScanLog}
          onClearScanLogs={onClearScanLogs}
          onClose={() => setInventoryViewMode('standard')}
          onSelectProductForEdit={(prod) => {
            handleOpenEditModal(prod);
          }}
        />
      ) : (
        <>
          {/* Sales Performance & Profit Velocity KPI Matrix Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. High Sales • High Profit (Top Performers) */}
            <button
              type="button"
              onClick={() => setPerformanceFilter(performanceFilter === 'high_sales_high_profit' ? 'All' : 'high_sales_high_profit')}
              className={`p-3.5 rounded-2xl border text-left transition relative overflow-hidden flex flex-col justify-between ${
                performanceFilter === 'high_sales_high_profit'
                  ? 'bg-emerald-950/70 border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-700">
                  <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" /> Top Performer
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-400">
                  {performanceSummary.highSalesHighProfitUnits} sold
                </span>
              </div>
              <div>
                <div className="text-xl font-black text-white flex items-baseline gap-1.5">
                  <span>{performanceSummary.highSalesHighProfitCount}</span>
                  <span className="text-xs text-slate-400 font-normal">items</span>
                </div>
                <div className="text-[11px] font-bold text-emerald-300 line-clamp-1 mt-0.5">
                  High Sales & High Profit
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  KSh {performanceSummary.highSalesHighProfitProfit.toLocaleString()} profit
                </div>
              </div>
            </button>

            {/* 2. Lower Sold Items (Slow Movers) */}
            <button
              type="button"
              onClick={() => setPerformanceFilter(performanceFilter === 'low_sales' ? 'All' : 'low_sales')}
              className={`p-3.5 rounded-2xl border text-left transition relative overflow-hidden flex flex-col justify-between ${
                performanceFilter === 'low_sales'
                  ? 'bg-amber-950/70 border-amber-400 ring-2 ring-amber-500/40 shadow-lg shadow-amber-950/50'
                  : 'bg-slate-900/90 border-amber-500/40 hover:border-amber-400 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-700">
                  <AlertTriangle className="w-3 h-3 text-amber-400" /> Lower Sold
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-400">
                  Slow
                </span>
              </div>
              <div>
                <div className="text-xl font-black text-white flex items-baseline gap-1.5">
                  <span>{performanceSummary.lowSalesLowProfitCount + performanceSummary.lowSalesHighProfitCount}</span>
                  <span className="text-xs text-slate-400 font-normal">items</span>
                </div>
                <div className="text-[11px] font-bold text-amber-300 line-clamp-1 mt-0.5">
                  Lower Sold Items
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1 mt-1">
                  Low velocity movers
                </div>
              </div>
            </button>

            {/* 3. High Volume Driver (High Sales, Low Margin) */}
            <button
              type="button"
              onClick={() => setPerformanceFilter(performanceFilter === 'high_sales_low_profit' ? 'All' : 'high_sales_low_profit')}
              className={`p-3.5 rounded-2xl border text-left transition relative overflow-hidden flex flex-col justify-between ${
                performanceFilter === 'high_sales_low_profit'
                  ? 'bg-sky-950/70 border-sky-400 ring-2 ring-sky-500/40 shadow-lg shadow-sky-950/50'
                  : 'bg-slate-900/90 border-sky-500/30 hover:border-sky-400 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-950 text-sky-300 border border-sky-700">
                  <Zap className="w-3 h-3 text-sky-400" /> Volume Driver
                </span>
                <span className="text-[10px] font-mono font-bold text-sky-400">
                  Fast
                </span>
              </div>
              <div>
                <div className="text-xl font-black text-white flex items-baseline gap-1.5">
                  <span>{performanceSummary.highSalesLowProfitCount}</span>
                  <span className="text-xs text-slate-400 font-normal">items</span>
                </div>
                <div className="text-[11px] font-bold text-sky-300 line-clamp-1 mt-0.5">
                  High Sales, Lower Margin
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1 mt-1">
                  High turnover volume
                </div>
              </div>
            </button>

            {/* 4. High Margin Potential (Low Sales, High Profit) */}
            <button
              type="button"
              onClick={() => setPerformanceFilter(performanceFilter === 'low_sales_high_profit' ? 'All' : 'low_sales_high_profit')}
              className={`p-3.5 rounded-2xl border text-left transition relative overflow-hidden flex flex-col justify-between ${
                performanceFilter === 'low_sales_high_profit'
                  ? 'bg-purple-950/70 border-purple-400 ring-2 ring-purple-500/40 shadow-lg shadow-purple-950/50'
                  : 'bg-slate-900/90 border-purple-500/30 hover:border-purple-400 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-700">
                  <Gem className="w-3 h-3 text-purple-400" /> High Margin
                </span>
                <span className="text-[10px] font-mono font-bold text-purple-400">
                  Premium
                </span>
              </div>
              <div>
                <div className="text-xl font-black text-white flex items-baseline gap-1.5">
                  <span>{performanceSummary.lowSalesHighProfitCount}</span>
                  <span className="text-xs text-slate-400 font-normal">items</span>
                </div>
                <div className="text-[11px] font-bold text-purple-300 line-clamp-1 mt-0.5">
                  High Profit, Lower Sold
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1 mt-1">
                  High profit per unit
                </div>
              </div>
            </button>

            {/* 5. Unranked / No Sales Yet */}
            <button
              type="button"
              onClick={() => setPerformanceFilter(performanceFilter === 'unranked_no_sales' ? 'All' : 'unranked_no_sales')}
              className={`p-3.5 rounded-2xl border text-left transition relative overflow-hidden flex flex-col justify-between ${
                performanceFilter === 'unranked_no_sales'
                  ? 'bg-slate-800 border-slate-400 ring-2 ring-slate-500/40 shadow-lg'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-600 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-950 text-slate-400 border border-slate-800">
                  <Package className="w-3 h-3 text-slate-400" /> Unranked
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  0 sold
                </span>
              </div>
              <div>
                <div className="text-xl font-black text-white flex items-baseline gap-1.5">
                  <span>{performanceSummary.unrankedCount}</span>
                  <span className="text-xs text-slate-400 font-normal">items</span>
                </div>
                <div className="text-[11px] font-bold text-slate-300 line-clamp-1 mt-0.5">
                  No Sales Recorded
                </div>
                <div className="text-[10px] text-slate-500 line-clamp-1 mt-1">
                  New stock / pending
                </div>
              </div>
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search */}
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Name, SKU, Barcode, Description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs pl-9 pr-4 py-2 rounded-xl focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Category Dropdown */}
              <div className="md:col-span-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubcategory('All');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-sky-500"
                >
                  <option value="All">All Categories ({consolidatedCategories.length})</option>
                  {consolidatedCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory Dropdown */}
              <div className="md:col-span-2">
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  disabled={selectedCategory === 'All'}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-sky-500 disabled:opacity-50"
                >
                  <option value="All">All Subcategories</option>
                  {availableSubcategories.map((sub: string) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Low Stock Toggle Button */}
              <div className="md:col-span-2">
                <button
                  onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    showLowStockOnly
                      ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Low Stock Alerts</span>
                </button>
              </div>
            </div>

            {/* Active Performance Filter Chips Row */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Performance Tier:</span>
              <button
                type="button"
                onClick={() => setPerformanceFilter('All')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  performanceFilter === 'All'
                    ? 'bg-slate-200 text-slate-950 shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                All Items ({products.length})
              </button>

              <button
                type="button"
                onClick={() => setPerformanceFilter('high_sales_high_profit')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  performanceFilter === 'high_sales_high_profit'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/80'
                }`}
              >
                <Star className="w-3 h-3 fill-current" />
                <span>⭐ High Sales & High Profit ({performanceSummary.highSalesHighProfitCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setPerformanceFilter('low_sales')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  performanceFilter === 'low_sales'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'bg-amber-950/60 text-amber-300 hover:bg-amber-900/60 border border-amber-800/80'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>⚠️ Lower Sold Items ({performanceSummary.lowSalesLowProfitCount + performanceSummary.lowSalesHighProfitCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setPerformanceFilter('high_sales_low_profit')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  performanceFilter === 'high_sales_low_profit'
                    ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                    : 'bg-sky-950/60 text-sky-300 hover:bg-sky-900/60 border border-sky-800/80'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>⚡ High Volume ({performanceSummary.highSalesLowProfitCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setPerformanceFilter('low_sales_high_profit')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  performanceFilter === 'low_sales_high_profit'
                    ? 'bg-purple-500 text-slate-950 shadow-md font-black'
                    : 'bg-purple-950/60 text-purple-300 hover:bg-purple-900/60 border border-purple-800/80'
                }`}
              >
                <Gem className="w-3 h-3" />
                <span>💎 High Margin ({performanceSummary.lowSalesHighProfitCount})</span>
              </button>

              {performanceFilter !== 'All' && (
                <button
                  type="button"
                  onClick={() => setPerformanceFilter('All')}
                  className="px-2 py-1 text-slate-400 hover:text-rose-400 text-xs flex items-center gap-1 ml-auto"
                >
                  <X className="w-3 h-3" /> Clear Filter
                </button>
              )}
            </div>
          </div>

      {/* GROUPED CATEGORY & SUBCATEGORY HIERARCHY ACCORDIONS OR STANDARD TABLE */}
      {inventoryViewMode === 'grouped' ? (
        <div className="space-y-6">
          {/* Expand / Collapse Controls & Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">
                Grouped Catalog Summary:
              </span>
              <span className="bg-sky-950 text-sky-300 border border-sky-800/80 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                {Object.keys(groupedProducts).length} Categories
              </span>
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/80 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                {filteredProducts.length} Items Listed
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExpandAllCategories}
                className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-sm"
              >
                <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
                <span>Expand All</span>
              </button>
              <button
                onClick={handleCollapseAllCategories}
                className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-sm"
              >
                <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Collapse All</span>
              </button>
            </div>
          </div>

          {Object.keys(groupedProducts).length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-2">
              <FolderTree className="w-12 h-12 mx-auto text-slate-600 mb-2" />
              <p className="font-bold text-slate-300 text-sm">No items found matching current search filters</p>
              <p className="text-xs">Try clearing search terms or selecting "All Categories".</p>
            </div>
          ) : (
            Object.entries(groupedProducts).map(([categoryName, subCategoryMap]) => {
              const isCollapsed = collapsedCategories[categoryName];
              const allCatProducts = Object.values(subCategoryMap).flat();
              const totalCatStock = allCatProducts.reduce((sum, p) => sum + p.stockQuantity, 0);
              const totalCatValue = allCatProducts.reduce((sum, p) => sum + p.sellingPrice * p.stockQuantity, 0);

              return (
                <div
                  key={categoryName}
                  className="bg-slate-900 border border-slate-800/90 rounded-3xl overflow-hidden shadow-xl transition"
                >
                  {/* Category Header Banner */}
                  <div className="p-4 bg-slate-950/80 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleCategoryCollapse(categoryName)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl transition"
                        title={isCollapsed ? 'Expand Category' : 'Collapse Category'}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-sky-400" />
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
                          <FolderTree className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                            <span>{categoryName}</span>
                            <span className="bg-sky-500/20 border border-sky-500/30 text-sky-300 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono">
                              {Object.keys(subCategoryMap).length} Sub-Categories
                            </span>
                          </h3>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            Total Items: <strong className="text-slate-200">{allCatProducts.length}</strong> • Stock:{' '}
                            <strong className="text-emerald-400">{totalCatStock.toLocaleString()} units</strong> • Value:{' '}
                            <strong className="text-sky-300">KSh {totalCatValue.toLocaleString()}</strong>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleOpenNewModal(categoryName)}
                        className="bg-sky-950 hover:bg-sky-900 border border-sky-700/80 text-sky-300 font-extrabold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1 shadow-sm"
                        title={`Add a new item directly under ${categoryName}`}
                      >
                        <Plus className="w-3.5 h-3.5 text-sky-400" />
                        <span>Add Item Here</span>
                      </button>

                      <button
                        onClick={() => toggleCategoryCollapse(categoryName)}
                        className="p-2 text-slate-400 hover:text-white"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-5 h-5" />
                        ) : (
                          <ChevronUp className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Accordion Body: Sub-Categories */}
                  {!isCollapsed && (
                    <div className="p-4 space-y-5 bg-slate-900/60">
                      {Object.entries(subCategoryMap).map(([subName, subProducts]) => {
                        const subStockTotal = subProducts.reduce((sum, p) => sum + p.stockQuantity, 0);
                        const subValuation = subProducts.reduce((sum, p) => sum + p.sellingPrice * p.stockQuantity, 0);

                        return (
                          <div
                            key={subName}
                            className="bg-slate-950/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-md"
                          >
                            {/* Subcategory Bar */}
                            <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <Tag className="w-3.5 h-3.5 text-sky-400" />
                                <span className="font-extrabold text-slate-200 text-xs">
                                  {subName}
                                </span>
                                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                                  {subProducts.length} {subProducts.length === 1 ? 'item' : 'items'}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3">
                                <span>Stock: <strong className="text-emerald-400">{subStockTotal} pcs</strong></span>
                                <span>Valuation: <strong className="text-sky-300">KSh {subValuation.toLocaleString()}</strong></span>
                              </div>
                            </div>

                            {/* Product Table Rows */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs text-slate-300">
                                <thead className="bg-slate-950/90 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
                                  <tr>
                                    <th className="p-2.5">Product & SKU</th>
                                    <th className="p-2.5">Variant / Size</th>
                                    <th className="p-2.5">Barcode</th>
                                    <th className="p-2.5 text-right">Cost Price</th>
                                    <th className="p-2.5 text-right">Selling Price</th>
                                    <th className="p-2.5 text-center">Margin %</th>
                                    <th className="p-2.5 text-center">Sales & Profit Tier</th>
                                    <th className="p-2.5 text-center">Stock Level</th>
                                    <th className="p-2.5 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                  {subProducts.map((p) => {
                                    const isLow = p.stockQuantity <= p.minStockAlert;
                                    const isOut = p.stockQuantity <= 0;
                                    const marginInfo = calculateProfitMargin(p.costPrice, p.sellingPrice);
                                    const perf = performanceMap[p.id];

                                    return (
                                      <tr key={p.id} className={`hover:bg-slate-800/50 transition ${perf ? perf.accentBorderLeft : ''} ${perf ? perf.tableRowHighlight : ''}`}>
                                        <td className="p-2.5">
                                          <div className="flex items-center gap-3">
                                            {p.imageUrl ? (
                                              <div className="relative group/thumb shrink-0">
                                                <img
                                                  src={p.imageUrl}
                                                  alt={p.name}
                                                  referrerPolicy="no-referrer"
                                                  onClick={() => setPreviewImage({ url: p.imageUrl!, title: p.name })}
                                                  className={`w-10 h-10 rounded-xl object-cover shadow-sm cursor-pointer group-hover/thumb:border-sky-400 transition ${
                                                    repeatedProductIds.has(p.id)
                                                      ? 'border-2 border-amber-500 ring-2 ring-amber-500/30'
                                                      : 'border border-slate-700'
                                                  }`}
                                                />
                                                {repeatedProductIds.has(p.id) && (
                                                  <div
                                                    title="Repeated Photo: This photo is shared by multiple items"
                                                    className="absolute -top-1.5 -left-1.5 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow-md z-10"
                                                  >
                                                    <ShieldAlert className="w-2.5 h-2.5" />
                                                  </div>
                                                )}
                                                <button
                                                  type="button"
                                                  onClick={() => setPreviewImage({ url: p.imageUrl!, title: p.name })}
                                                  className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/thumb:opacity-100 rounded-xl flex items-center justify-center text-white transition"
                                                  title="View Photo"
                                                >
                                                  <Eye className="w-3.5 h-3.5 text-white drop-shadow" />
                                                </button>
                                              </div>
                                            ) : (
                                              <button
                                                type="button"
                                                onClick={() => handleOpenEditModal(p)}
                                                title="Add Item Photo"
                                                className="w-10 h-10 rounded-xl bg-slate-950 border border-dashed border-slate-800 hover:border-sky-500/60 flex items-center justify-center text-slate-600 hover:text-sky-400 shrink-0 transition cursor-pointer"
                                              >
                                                <ImageIcon className="w-4 h-4" />
                                              </button>
                                            )}
                                            <div>
                                              <div className="font-bold text-slate-100">{p.name}</div>
                                              <div className="text-[10px] text-slate-400 font-mono">
                                                SKU: {p.sku} {p.supplierName ? `• ${p.supplierName}` : ''}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="p-2.5 font-mono text-[11px] text-slate-300">
                                          {p.sizeCapacity || '—'}
                                        </td>
                                        <td className="p-2.5 font-mono text-[11px] text-slate-400">
                                          {p.barcode}
                                        </td>
                                        <td className="p-2.5 text-right font-mono text-slate-400">
                                          KSh {p.costPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-2.5 text-right font-mono font-bold text-sky-400">
                                          KSh {p.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-2.5 text-center font-mono font-bold text-[11px]">
                                          <span className={`px-2 py-0.5 rounded border text-[10px] ${marginInfo.badgeBg} ${marginInfo.badgeText} ${marginInfo.badgeBorder}`}>
                                            {marginInfo.marginPercent.toFixed(1)}%
                                          </span>
                                        </td>
                                        <td className="p-2.5 text-center">
                                          {perf && perf.tier !== 'unranked_no_sales' ? (
                                            <div className="inline-flex flex-col items-center gap-1">
                                              <span
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border shadow-sm ${perf.badgeBg} ${perf.badgeText} ${perf.badgeBorder}`}
                                                title={perf.description}
                                              >
                                                {perf.tier === 'high_sales_high_profit' && <Star className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400 shrink-0" />}
                                                {perf.tier === 'low_sales_low_profit' && <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                                                {perf.tier === 'high_sales_low_profit' && <Zap className="w-2.5 h-2.5 text-sky-400 shrink-0" />}
                                                {perf.tier === 'low_sales_high_profit' && <Gem className="w-2.5 h-2.5 text-purple-400 shrink-0" />}
                                                <span>{perf.tierShortLabel}</span>
                                              </span>
                                              <span className="text-[9px] font-mono text-slate-400">
                                                {perf.unitsSold} sold • KSh {perf.totalProfit.toLocaleString()}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                                              0 sold
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-center">
                                          {isOut ? (
                                            <span className="bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded text-[10px] font-extrabold">
                                              OUT OF STOCK
                                            </span>
                                          ) : isLow ? (
                                            <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-[10px] font-extrabold">
                                              LOW ({p.stockQuantity} {p.unit})
                                            </span>
                                          ) : (
                                            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                              {p.stockQuantity} {p.unit}
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-right">
                                          <div className="flex items-center justify-end gap-1">
                                            {onViewProductHistory && (
                                              <button
                                                onClick={() => onViewProductHistory(p)}
                                                title="View Item Audit Logs & Sales History"
                                                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-sky-400 rounded transition"
                                              >
                                                <History className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleOpenEditModal(p)}
                                              title="Edit Item Details"
                                              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded transition"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => onDeleteProduct(p.id)}
                                              title="Delete Item"
                                              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Inventory Catalog Table (Standard View) */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5 w-16 text-center">Photo</th>
                <th className="p-3.5">Product & SKU</th>
                <th className="p-3.5">Category & Size</th>
                <th className="p-3.5">Barcode</th>
                <th className="p-3.5 text-right">Cost Price</th>
                <th className="p-3.5 text-right">Selling Price</th>
                <th className="p-3.5 text-center">Sales & Profit Tier</th>
                <th className="p-3.5 text-center">Stock Level</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    No products matching current search filters.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const isLow = p.stockQuantity <= p.minStockAlert;
                  const isOut = p.stockQuantity <= 0;
                  const perf = performanceMap[p.id];

                  return (
                    <tr key={p.id} className={`hover:bg-slate-800/50 transition ${perf ? perf.accentBorderLeft : ''} ${perf ? perf.tableRowHighlight : ''}`}>
                      {/* Photo Thumbnail */}
                      <td className="p-3.5 text-center">
                        {p.imageUrl ? (
                          <div className="relative group/thumb inline-block">
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              onClick={() => setPreviewImage({ url: p.imageUrl!, title: p.name })}
                              className={`w-11 h-11 rounded-xl object-cover shadow-sm cursor-pointer group-hover/thumb:border-sky-400 group-hover/thumb:scale-105 transition duration-200 ${
                                repeatedProductIds.has(p.id)
                                  ? 'border-2 border-amber-500 ring-2 ring-amber-500/30'
                                  : 'border border-slate-700'
                              }`}
                            />
                            {repeatedProductIds.has(p.id) && (
                              <div
                                title="Repeated Photo: This photo is shared by multiple items"
                                className="absolute -top-1.5 -left-1.5 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow-md z-10"
                              >
                                <ShieldAlert className="w-3 h-3" />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => setPreviewImage({ url: p.imageUrl!, title: p.name })}
                              className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/thumb:opacity-100 rounded-xl flex items-center justify-center text-white transition cursor-pointer"
                              title="View Full Size Photo"
                            >
                              <Eye className="w-4 h-4 text-white drop-shadow" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(p)}
                            title="Add Item Photo"
                            className="w-11 h-11 rounded-xl bg-slate-950 border border-dashed border-slate-800 hover:border-sky-500/60 flex flex-col items-center justify-center text-slate-600 hover:text-sky-400 mx-auto transition group/noimg cursor-pointer"
                          >
                            <ImageIcon className="w-4 h-4" />
                            <span className="text-[8px] mt-0.5 opacity-0 group-hover/noimg:opacity-100 transition font-bold">+Photo</span>
                          </button>
                        )}
                      </td>

                      {/* Name & SKU */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-100 text-xs">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          SKU: {p.sku} {p.supplierName ? `• ${p.supplierName}` : ''}
                        </div>
                        {p.description && (
                          <div className="text-[10px] text-slate-500 line-clamp-1 italic mt-0.5">
                            {p.description}
                          </div>
                        )}
                      </td>

                      {/* Category & Subcategory & Size */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 font-semibold text-sky-400">
                          <span>{p.category}</span>
                          {p.subcategory && (
                            <>
                              <ChevronRight className="w-3 h-3 text-slate-600" />
                              <span className="text-slate-300">{p.subcategory}</span>
                            </>
                          )}
                        </div>
                        {p.sizeCapacity && (
                          <span className="inline-block mt-1 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] px-1.5 py-0.2 rounded font-mono">
                            {p.sizeCapacity}
                          </span>
                        )}
                      </td>

                      {/* Barcode & Print Button */}
                      <td className="p-3.5 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-200 text-[11px]">
                            {p.barcode}
                          </span>
                          <button
                            onClick={() => printBarcodeLabels(p.name, p.sellingPrice, p.barcode, 12)}
                            title="Print Barcode Labels Sheet"
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-sky-400 rounded transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Cost Price */}
                      <td className="p-3.5 text-right font-mono font-medium text-slate-400">
                        KSh {p.costPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Selling Price */}
                      <td className="p-3.5 text-right font-mono font-bold text-slate-100 text-sm">
                        KSh {p.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Sales & Profit Tier Badge */}
                      <td className="p-3.5 text-center">
                        {perf && perf.tier !== 'unranked_no_sales' ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border shadow-sm ${perf.badgeBg} ${perf.badgeText} ${perf.badgeBorder}`}
                              title={perf.description}
                            >
                              {perf.tier === 'high_sales_high_profit' && <Star className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400 shrink-0" />}
                              {perf.tier === 'low_sales_low_profit' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                              {perf.tier === 'high_sales_low_profit' && <Zap className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                              {perf.tier === 'low_sales_high_profit' && <Gem className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                              <span>{perf.tierLabel}</span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              <strong className="text-slate-200">{perf.unitsSold} sold</strong> • {perf.marginPercent.toFixed(0)}% margin
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-800/80 text-slate-400 border border-slate-700 font-mono">
                            0 sold (Unranked)
                          </span>
                        )}
                      </td>

                      {/* Stock Level Badge */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono ${
                            isOut
                              ? 'bg-red-950/80 text-red-400 border border-red-800'
                              : isLow
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-800'
                              : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                          }`}
                        >
                          {isLow && <AlertTriangle className="w-3 h-3" />}
                          {p.stockQuantity} {p.unit}
                        </span>
                        <div className="text-[9px] text-slate-500 mt-0.5">Min Alert: {p.minStockAlert}</div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-sky-400 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete ${p.name}?`)) onDeleteProduct(p.id);
                            }}
                            className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination Controls for 300+ items */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs px-2 py-1 rounded-lg focus:outline-none focus:border-sky-500"
            >
              <option value={25}>25 items per page</option>
              <option value={50}>50 items per page</option>
              <option value={100}>100 items per page</option>
              <option value={300}>300 items per page</option>
              <option value={0}>All ({filteredProducts.length})</option>
            </select>
            <span className="text-slate-500 hidden sm:inline">
              Showing {filteredProducts.length === 0 ? 0 : startIndex + 1} to{' '}
              {itemsPerPage > 0 ? Math.min(startIndex + itemsPerPage, filteredProducts.length) : filteredProducts.length}{' '}
              of {filteredProducts.length} items
            </span>
          </div>

          {itemsPerPage > 0 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 font-mono font-bold text-slate-200">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  )}

      {/* MODAL: ADD / EDIT PRODUCT */}
      {showModal && editingProduct && (
        <div
          className="fixed inset-0 z-[2000] bg-slate-950/90 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              setEditingProduct(null);
            }
          }}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 my-auto relative z-[2010]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50 shrink-0">
              <div>
                <h3 className="font-bold text-slate-200 text-base">
                  {editingProduct.id?.startsWith('prod-') ? 'Add New Inventory Item' : 'Edit Item Details'}
                </h3>
                <p className="text-[11px] text-slate-400">Use phone camera or enter product details manually</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <Camera className="w-4 h-4" /> Camera AI Scan
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowModal(false);
                    setEditingProduct(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitProduct} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-slate-200 font-bold mb-1 text-sm">
                      Product / Item Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Enter full item name e.g. Wireless Speaker, Sugar 1kg, Soda 500ml..."
                      value={editingProduct.name || ''}
                      onChange={(e) =>
                        setEditingProduct((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                      }
                      className="w-full bg-slate-950 border-2 border-sky-500/70 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-slate-100 font-bold text-sm focus:outline-none shadow-sm shadow-sky-500/10 placeholder:text-slate-500 placeholder:font-normal"
                    />
                  </div>

                {/* Category */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">Category *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategoryInput(!isCustomCategoryInput);
                        if (!isCustomCategoryInput) {
                          setCustomCategoryName('');
                        }
                      }}
                      className="text-sky-400 hover:text-sky-300 font-bold text-[11px] flex items-center gap-1 transition bg-sky-950/60 hover:bg-sky-900/80 px-2 py-0.5 rounded-lg border border-sky-800/80"
                    >
                      {isCustomCategoryInput ? (
                        <span>← Select Existing</span>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" /> + New Category
                        </>
                      )}
                    </button>
                  </div>

                  {isCustomCategoryInput ? (
                    <input
                      type="text"
                      required
                      placeholder="e.g. Groceries, Dairy, Beverages, Stationery..."
                      value={customCategoryName}
                      onChange={(e) => {
                        setCustomCategoryName(e.target.value);
                        setEditingProduct({
                          ...editingProduct,
                          category: e.target.value
                        });
                      }}
                      className="w-full bg-slate-950 border-2 border-sky-500 rounded-xl px-3 py-2 text-slate-100 font-bold text-xs focus:outline-none"
                    />
                  ) : (
                    <select
                      value={editingProduct.category || ''}
                      onChange={(e) => {
                        const catName = e.target.value;
                        if (catName === '__NEW__') {
                          setIsCustomCategoryInput(true);
                          setCustomCategoryName('');
                          return;
                        }
                        const catObj = consolidatedCategories.find((c) => c.name === catName);
                        setEditingProduct({
                          ...editingProduct,
                          category: catName,
                          subcategory: catObj?.subcategories[0] || 'General'
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
                    >
                      {consolidatedCategories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                      <option value="__NEW__" className="font-bold text-sky-400 bg-slate-900">
                        + Add Custom New Category...
                      </option>
                    </select>
                  )}
                </div>

                {/* Subcategory */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">Subcategory</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomSubcategoryInput(!isCustomSubcategoryInput);
                        if (!isCustomSubcategoryInput) {
                          setCustomSubcategoryName('');
                        }
                      }}
                      className="text-sky-400 hover:text-sky-300 font-bold text-[11px] flex items-center gap-1 transition bg-sky-950/60 hover:bg-sky-900/80 px-2 py-0.5 rounded-lg border border-sky-800/80"
                    >
                      {isCustomSubcategoryInput ? (
                        <span>← Select Existing</span>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" /> + New Subcategory
                        </>
                      )}
                    </button>
                  </div>

                  {isCustomSubcategoryInput ? (
                    <input
                      type="text"
                      placeholder="e.g. Cold Drinks, Snacks, Airtime..."
                      value={customSubcategoryName}
                      onChange={(e) => {
                        setCustomSubcategoryName(e.target.value);
                        setEditingProduct({
                          ...editingProduct,
                          subcategory: e.target.value
                        });
                      }}
                      className="w-full bg-slate-950 border-2 border-sky-500 rounded-xl px-3 py-2 text-slate-100 font-bold text-xs focus:outline-none"
                    />
                  ) : (
                    <select
                      value={editingProduct.subcategory || ''}
                      onChange={(e) => {
                        const subName = e.target.value;
                        if (subName === '__NEW__') {
                          setIsCustomSubcategoryInput(true);
                          setCustomSubcategoryName('');
                          return;
                        }
                        setEditingProduct({ ...editingProduct, subcategory: subName });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
                    >
                      {(
                        consolidatedCategories.find((c) => c.name === editingProduct.category)?.subcategories || ['General']
                      ).map((sub: string) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                      <option value="__NEW__" className="font-bold text-sky-400 bg-slate-900">
                        + Add Custom New Subcategory...
                      </option>
                    </select>
                  )}
                </div>

                {/* Size / Capacity */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Size / Capacity / Variant <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500ml, 1kg, XL, 128GB"
                    value={editingProduct.sizeCapacity || ''}
                    onChange={(e) =>
                      setEditingProduct((prev) => (prev ? { ...prev, sizeCapacity: e.target.value } : prev))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* SKU */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={editingProduct.sku || ''}
                    onChange={(e) =>
                      setEditingProduct((prev) => (prev ? { ...prev, sku: e.target.value } : prev))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Barcode & Auto Generator */}
                <div className="sm:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-300 font-semibold">Barcode Number</label>
                    <button
                      type="button"
                      onClick={handleGenerateBarcodeInForm}
                      className="text-sky-400 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Auto-Generate Barcode
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={editingProduct.barcode || ''}
                      onChange={(e) =>
                        setEditingProduct((prev) => (prev ? { ...prev, barcode: e.target.value } : prev))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        printBarcodeLabels(
                          editingProduct.name || 'Sample',
                          editingProduct.sellingPrice || 0,
                          editingProduct.barcode || '0000',
                          8
                        )
                      }
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Printer className="w-4 h-4" /> Print Sheet
                    </button>
                  </div>
                </div>

                {/* Cost Price */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Cost Price (KSh)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editingProduct.costPrice ?? ''}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, costPrice: parseFloat(e.target.value) || 0 } : prev
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Selling Price (KSh)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editingProduct.sellingPrice ?? ''}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, sellingPrice: parseFloat(e.target.value) || 0 } : prev
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono font-bold text-sky-400 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Stock Quantity */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Initial Stock Qty</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={editingProduct.stockQuantity ?? ''}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, stockQuantity: parseInt(e.target.value, 10) || 0 } : prev
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Low Stock Threshold */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Min Stock Alert Limit</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={editingProduct.minStockAlert ?? ''}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, minStockAlert: parseInt(e.target.value, 10) || 0 } : prev
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Unit of Measure</label>
                  <select
                    value={editingProduct.unit || 'pcs'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="liters">Liters (L)</option>
                    <option value="boxes">Boxes</option>
                    <option value="packs">Packs</option>
                  </select>
                </div>

                {/* Supplier */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-sky-400" />
                      <span>Supplier *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomSupplierInput(!isCustomSupplierInput);
                        if (!isCustomSupplierInput) {
                          setCustomSupplierName('');
                        }
                      }}
                      className="text-sky-400 hover:text-sky-300 font-bold text-[11px] flex items-center gap-1 transition bg-sky-950/60 hover:bg-sky-900/80 px-2 py-0.5 rounded-lg border border-sky-800/80 cursor-pointer"
                    >
                      {isCustomSupplierInput ? (
                        <span>← Pick Existing</span>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" /> Add Supplier
                        </>
                      )}
                    </button>
                  </div>

                  {isCustomSupplierInput ? (
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          autoFocus
                          placeholder="Type new supplier name..."
                          value={customSupplierName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomSupplierName(val);
                            setEditingProduct((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    supplierName: val,
                                  }
                                : prev
                            );
                          }}
                          className="flex-1 bg-slate-950 border-2 border-sky-500 rounded-xl px-3 py-2 text-slate-100 font-bold text-xs focus:outline-none shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAddSupplierModal(true)}
                          className="bg-slate-800 hover:bg-slate-700 text-sky-400 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-slate-700 shrink-0 cursor-pointer"
                          title="Open full supplier details form"
                        >
                          Details...
                        </button>
                      </div>
                      <p className="text-[10px] text-sky-300">
                        ✨ New supplier will be automatically created upon saving this item.
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        value={editingProduct.supplierId || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__NEW__') {
                            setShowAddSupplierModal(true);
                            return;
                          }
                          const sup = suppliers.find((s) => s.id === val);
                          setEditingProduct({
                            ...editingProduct,
                            supplierId: sup?.id || '',
                            supplierName: sup?.name || 'Direct Supplier',
                          });
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                      >
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.contactPerson && s.contactPerson !== 'N/A' ? `(${s.contactPerson})` : ''}
                          </option>
                        ))}
                        <option value="__NEW__" className="font-bold text-sky-400 bg-slate-900">
                          + Add New Supplier...
                        </option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowAddSupplierModal(true)}
                        className="bg-slate-800 hover:bg-slate-700 text-sky-400 px-3 py-2 rounded-xl text-xs font-bold border border-slate-700 shrink-0 flex items-center gap-1 cursor-pointer"
                        title="Add new supplier"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Product Image Section with Live Preview, Upload, Camera, AI Studio & Drag-and-Drop */}
                <div className="sm:col-span-2 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-200 font-bold text-xs">
                      Product Photo
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Supports JPG, PNG, WEBP, Camera snap, URL or Ctrl+V paste
                    </span>
                  </div>

                  {/* AI Vision Status Notification */}
                  {isAiIdentifying ? (
                    <div className="bg-sky-950/80 border border-sky-800 p-2.5 rounded-xl text-xs text-sky-300 flex items-center gap-2 animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-sky-400 shrink-0" />
                      <span>Gemini AI Vision analyzing photo... Auto-suggesting item name, category & pricing...</span>
                    </div>
                  ) : aiIdentifyResult ? (
                    <div className="bg-emerald-950/80 border border-emerald-800 p-2.5 rounded-xl text-xs text-emerald-300 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{aiIdentifyResult}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAiIdentifyResult(null)}
                        className="text-emerald-400 hover:text-white p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : null}

                  {/* Photo Dropzone & Controls */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOverPhoto(true);
                    }}
                    onDragLeave={() => setIsDragOverPhoto(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOverPhoto(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) processImageFile(file);
                    }}
                    className={`border-2 border-dashed rounded-2xl p-3.5 transition-all ${
                      isDragOverPhoto
                        ? 'border-emerald-400 bg-emerald-950/40'
                        : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* Image Thumbnail or Upload Trigger */}
                      {isUploadingPhoto ? (
                        <div className="w-20 h-20 rounded-2xl bg-slate-900 flex flex-col items-center justify-center text-sky-400 shrink-0 border border-slate-800">
                          <Loader2 className="w-6 h-6 animate-spin mb-1" />
                          <span className="text-[9px] text-slate-400">Loading...</span>
                        </div>
                      ) : editingProduct.imageUrl ? (
                        <div className="relative group shrink-0">
                          <img
                            src={editingProduct.imageUrl}
                            alt="Product Preview"
                            referrerPolicy="no-referrer"
                            className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500/80 shadow-md cursor-pointer hover:opacity-90 transition"
                            onClick={() =>
                              setPreviewImage({
                                url: editingProduct.imageUrl!,
                                title: editingProduct.name || 'Product Photo Preview'
                              })
                            }
                            onError={(e) => {
                              // Fallback on broken image link
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&auto=format&fit=crop&q=60';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage({
                                url: editingProduct.imageUrl!,
                                title: editingProduct.name || 'Product Photo Preview'
                              })
                            }
                            className="absolute bottom-1 right-1 bg-slate-950/80 hover:bg-slate-900 text-white p-1 rounded-lg shadow-sm border border-slate-700 transition"
                            title="View Full Size"
                          >
                            <ZoomIn className="w-3 h-3 text-slate-200" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingProduct({ ...editingProduct, imageUrl: '' })}
                            className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-500 text-white p-1 rounded-full shadow-lg transition"
                            title="Remove Photo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => galleryInputRef.current?.click()}
                          className="w-20 h-20 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-dashed border-slate-700 hover:border-emerald-500 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-400 shrink-0 cursor-pointer transition group"
                          title="Click to select image file"
                        >
                          <Upload className="w-6 h-6 mb-1 text-slate-500 group-hover:text-emerald-400 group-hover:-translate-y-0.5 transition" />
                          <span className="text-[10px] font-bold">Add Photo</span>
                        </div>
                      )}

                      {/* Action Buttons & URL Input */}
                      <div className="flex-1 w-full space-y-2.5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          <button
                            type="button"
                            onClick={() => startLiveCamera('environment')}
                            className="bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 font-extrabold px-2.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            Live Camera
                          </button>

                          <button
                            type="button"
                            onClick={() => galleryInputRef.current?.click()}
                            className="bg-sky-950/90 hover:bg-sky-900 border border-sky-700/80 text-sky-300 font-extrabold px-2.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                            title="Choose photo from mobile phone gallery or browse computer files"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            Phone Gallery
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowImageStudioModal(true)}
                            className="bg-purple-950/90 hover:bg-purple-900 border border-purple-700/80 text-purple-300 font-extrabold px-2.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            AI Studio
                          </button>

                          {editingProduct.imageUrl ? (
                            <button
                              type="button"
                              onClick={handleClearPhotoAndMemory}
                              title="Clear photo"
                              className="bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-bold px-2.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              Remove
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => galleryInputRef.current?.click()}
                              className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold px-2.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              Browse
                            </button>
                          )}
                        </div>

                        {/* Image URL Input & AI Vision Auto-fill Trigger */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Image URL or drop / paste photo here:</span>
                            {editingProduct.imageUrl && !isAiIdentifying && (
                              <button
                                type="button"
                                onClick={() => handleAiIdentifyProduct(editingProduct.imageUrl!, null, true)}
                                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-extrabold flex items-center gap-1 bg-emerald-950 border border-emerald-800 px-2.5 py-0.5 rounded-lg transition hover:bg-emerald-900 cursor-pointer"
                              >
                                <Wand2 className="w-3 h-3" /> Auto-Fill Details with AI
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="https://images.unsplash.com/photo-..."
                              value={editingProduct.imageUrl || ''}
                              onChange={(e) =>
                                setEditingProduct((prev) => (prev ? { ...prev, imageUrl: e.target.value } : prev))
                              }
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-sky-500 font-mono"
                            />
                            {editingProduct.imageUrl && (
                              <button
                                type="button"
                                onClick={() => setEditingProduct({ ...editingProduct, imageUrl: '' })}
                                className="absolute right-2 top-2 text-slate-400 hover:text-white"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {(() => {
                            if (!editingProduct.imageUrl) return null;
                            const conflict = findConflictingProductWithImage(
                              editingProduct.imageUrl,
                              editingProduct.id,
                              products
                            );
                            if (!conflict) return null;
                            return (
                              <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1.5 rounded-lg mt-1">
                                <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                                <span>
                                  Repeated photo: Already used by <strong className="text-white font-medium">"{conflict.name}"</strong>
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Item Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of specifications or usage instructions..."
                    value={editingProduct.description || ''}
                    onChange={(e) =>
                      setEditingProduct((prev) => (prev ? { ...prev, description: e.target.value } : prev))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 font-bold px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-6 py-2.5 rounded-xl transition shadow-lg shadow-sky-600/20 cursor-pointer"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: SPREADSHEET / BULK 300+ ITEMS IMPORTER */}
      <SpreadsheetImportModal
        isOpen={showSheetImportModal}
        onClose={() => setShowSheetImportModal(false)}
        suppliers={suppliers}
        categories={categories}
        onImportProducts={(newProds, replace) => {
          if (onBatchImportProducts) {
            onBatchImportProducts(newProds, replace);
          } else {
            newProds.forEach((p) => onSaveProduct(p));
          }
        }}
      />

      {/* MODAL: AI PRODUCT IMAGE STUDIO */}
      <ImageGeneratorModal
        isOpen={showImageStudioModal}
        onClose={() => setShowImageStudioModal(false)}
        product={editingProduct as Product}
        allProducts={products}
        onApplyImage={(_, imgUrl) => {
          if (editingProduct) {
            setEditingProduct({ ...editingProduct, imageUrl: imgUrl });
          }
        }}
        onBulkApplyImages={(imageMap) => {
          products.forEach((p) => {
            if (imageMap[p.id]) {
              onSaveProduct({ ...p, imageUrl: imageMap[p.id] });
            }
          });
        }}
      />

      {/* MODAL: ADD NEW SUPPLIER ON THE FLY */}
      {showAddSupplierModal && (
        <div
          className="fixed inset-0 z-[3000] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddSupplierModal(false);
            }
          }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Add New Supplier</h3>
                  <p className="text-[10px] text-slate-400">Register new wholesale vendor on the fly</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Supplier / Vendor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kenya Wholesale Distributors Ltd"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Contact Representative</label>
                  <input
                    type="text"
                    placeholder="e.g. John Kamau"
                    value={newSupContact}
                    onChange={(e) => setNewSupContact(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +254 712 345 678"
                    value={newSupPhone}
                    onChange={(e) => setNewSupPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. sales@wholesaler.com"
                  value={newSupEmail}
                  onChange={(e) => setNewSupEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Physical Address / City</label>
                <input
                  type="text"
                  placeholder="e.g. Industrial Area, Nairobi"
                  value={newSupAddress}
                  onChange={(e) => setNewSupAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 rounded-xl transition shadow-lg shadow-sky-600/20"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LIVE WEBCAM SCANNER (Zero-Heap Memory Mode) */}
      {showLiveCameraModal && (
        <div className="fixed inset-0 z-[1050] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Camera className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Live WebCam AI Vision
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Instant scan frame — zero device RAM pressure
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={stopLiveCamera}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Viewport Container */}
            <div className="relative bg-black flex items-center justify-center aspect-video sm:aspect-[4/3] w-full overflow-hidden">
              {cameraStreamError ? (
                <div className="p-6 text-center text-rose-300 space-y-3">
                  <VideoOff className="w-10 h-10 text-rose-400 mx-auto opacity-80" />
                  <p className="text-xs">{cameraStreamError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      stopLiveCamera();
                      cameraInputRef.current?.click();
                    }}
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow"
                  >
                    Use File Camera Instead
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Camera Aiming Reticle Overlay */}
                  <div className="absolute inset-0 pointer-events-none border-2 border-emerald-500/40 rounded-2xl m-6 flex items-center justify-center">
                    <div className="w-full max-w-[200px] aspect-square border-2 border-dashed border-emerald-400/70 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-emerald-400/60 animate-ping" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Controls */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between gap-2 sm:gap-3">
              <button
                type="button"
                onClick={toggleCameraFacing}
                title="Switch rear/front camera"
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-3 rounded-2xl transition flex items-center gap-1.5 text-xs font-bold"
              >
                <RefreshCw className="w-4 h-4 text-sky-400" />
                <span className="hidden sm:inline">Flip Camera</span>
              </button>

              <button
                type="button"
                onClick={captureLiveCameraSnap}
                disabled={!!cameraStreamError}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold py-3.5 px-3 rounded-2xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 text-xs sm:text-sm"
              >
                <Sparkles className="w-4 h-4 text-emerald-200 animate-bounce" />
                Snap & AI Auto-Scan Product
              </button>

              <button
                type="button"
                onClick={stopLiveCamera}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-3 rounded-2xl transition text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AUTO DELETE REPEATED ITEMS & MERGE INVENTORY */}
      {showDeduplicateModal && (
        <div className="fixed inset-0 z-[1050] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Trash2 className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Auto-Delete Repeated Items & Merge Stock
                  </h3>
                  <p className="text-xs text-slate-400">
                    Removes duplicate catalog entries while preserving & combining inventory stock quantities
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeduplicateModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {duplicateGroups.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-white">No Repeated Items Found!</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    All products in your inventory have unique barcodes, SKUs, and names. Your catalog is clean and free of duplicates.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-200">
                    <div>
                      <span className="font-extrabold text-amber-300 text-sm block">Deduplication Summary</span>
                      <span>
                        Found <strong className="text-white">{duplicateGroups.length} duplicate groups</strong> containing{' '}
                        <strong className="text-amber-300">{totalDuplicateItemsToDelete} repeated entries</strong>.
                      </span>
                    </div>
                    <div className="text-right bg-amber-900/60 border border-amber-700/80 px-3 py-1.5 rounded-xl font-mono text-xs">
                      <div className="text-amber-300 font-bold">+{totalStockToMerge} Units</div>
                      <div className="text-[10px] text-amber-400/80">Stock to Merge</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Detected Duplicate Clusters ({duplicateGroups.length})
                    </h5>

                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {duplicateGroups.map((group) => (
                        <div key={group.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                            <span className="font-bold text-white flex items-center gap-2">
                              <span>{group.primaryItem.name}</span>
                              <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-sky-300">
                                {group.matchReason}
                              </span>
                            </span>
                            <span className="text-emerald-400 font-extrabold font-mono text-[11px]">
                              Combined Stock: {group.primaryItem.stockQuantity + group.totalStockToMerge} {group.primaryItem.unit || 'pcs'}
                            </span>
                          </div>

                          {/* Primary Item Kept */}
                          <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-2.5 text-xs text-emerald-200">
                            <div className="flex items-center gap-2">
                              <span className="bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] px-2 py-0.5 rounded">
                                KEEP (Primary)
                              </span>
                              <span className="font-semibold">{group.primaryItem.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({group.primaryItem.sku})</span>
                            </div>
                            <span className="font-bold font-mono text-emerald-400">
                              Stock: {group.primaryItem.stockQuantity}
                            </span>
                          </div>

                          {/* Duplicate Items Deleted */}
                          <div className="space-y-1.5 pl-3 border-l-2 border-amber-500/40">
                            {group.duplicateItems.map((dup) => (
                              <div key={dup.id} className="flex items-center justify-between bg-rose-950/20 border border-rose-900/40 rounded-xl p-2 text-xs text-rose-300">
                                <div className="flex items-center gap-2">
                                  <span className="bg-rose-500/20 text-rose-400 font-bold text-[10px] px-2 py-0.5 rounded">
                                    DELETE & MERGE
                                  </span>
                                  <span>{dup.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">({dup.sku})</span>
                                </div>
                                <span className="font-bold font-mono text-amber-400">
                                  +{dup.stockQuantity} stock merged
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeduplicateModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs transition"
              >
                Close
              </button>

              {duplicateGroups.length > 0 && (
                <button
                  type="button"
                  onClick={handleConfirmDeduplicate}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-xs transition shadow-lg shadow-amber-500/20 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Confirm & Auto-Delete Repeated Items ({totalDuplicateItemsToDelete})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DEDICATED AI ITEM SCANNER & PHOTO UPLOAD */}
      {showAiScanModal && (
        <div className="fixed inset-0 z-[1050] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/30">
                  <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    AI Product Vision Scanner
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pick photos from mobile gallery or snap with camera to auto-add items into stock
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAiScanModal(false);
                  setIsAiIdentifying(false);
                  setIsBatchScanning(false);
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Batch Processing Progress Bar */}
              {isBatchScanning ? (
                <div className="bg-sky-950/90 border border-sky-700/80 p-4 rounded-2xl space-y-2.5 shadow-lg animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-sky-200">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                      <span>Extracting photo {batchProgress.current} of {batchProgress.total}...</span>
                    </span>
                    <span className="font-mono text-emerald-400">
                      {Math.round((batchProgress.current / (batchProgress.total || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-sky-800/80">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-sky-400 h-full transition-all duration-300 rounded-full"
                      style={{
                        width: `${Math.max(5, Math.round((batchProgress.current / (batchProgress.total || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-sky-300/80 italic truncate">
                    Processing: {batchProgress.currentName || 'Product photo'} - AI extracting details & adding to catalog...
                  </p>
                </div>
              ) : isAiIdentifying ? (
                <div className="bg-sky-950/90 border border-sky-700/80 p-3.5 rounded-2xl text-xs text-sky-200 flex items-center gap-3 animate-pulse shadow-md">
                  <Loader2 className="w-5 h-5 animate-spin text-sky-400 shrink-0" />
                  <div>
                    <p className="font-bold text-sky-100">Gemini AI Vision Analyzing Product...</p>
                    <p className="text-[11px] text-sky-300/90">Identifying brand, model, category, wholesale cost & retail price in Kenya.</p>
                  </div>
                </div>
              ) : isUploadingPhoto ? (
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-xs text-slate-300 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400 shrink-0" />
                  <span>Processing image file from device...</span>
                </div>
              ) : null}

              {/* Target Supplier Selection & Add New Supplier for AI Scanned Items */}
              <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-sky-400" />
                    <span>Assigned Supplier for Scanned Items</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddSupplierModal(true)}
                    className="text-sky-400 hover:text-sky-300 font-bold text-[11px] flex items-center gap-1 transition bg-sky-950/80 hover:bg-sky-900 px-2.5 py-1 rounded-lg border border-sky-800/80 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Supplier
                  </button>
                </div>

                <div className="flex gap-2 items-center">
                  <select
                    value={selectedScanSupplierId || (suppliers[0]?.id || '')}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setShowAddSupplierModal(true);
                        return;
                      }
                      setSelectedScanSupplierId(e.target.value);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.contactPerson && s.contactPerson !== 'N/A' ? `(${s.contactPerson})` : ''}
                      </option>
                    ))}
                    <option value="__NEW__" className="font-bold text-sky-400 bg-slate-800">
                      + Add New Supplier...
                    </option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddSupplierModal(true)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-xl transition cursor-pointer"
                    title="Add new supplier on the fly"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Items captured from Camera or Gallery will automatically be linked to this supplier.</span>
                  {selectedScanSupplierId && (
                    <span className="text-emerald-400 font-semibold truncate ml-1">
                      Active: {suppliers.find((s) => s.id === selectedScanSupplierId)?.name || 'Direct Wholesale'}
                    </span>
                  )}
                </p>
              </div>

              {/* Main Selection Actions */}
              <div className="grid grid-cols-1 gap-2.5">
                {/* 1. Mobile Phone Gallery Pick (Single) */}
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="bg-gradient-to-r from-teal-950/80 to-slate-950 hover:from-teal-900/90 hover:to-slate-900 border-2 border-teal-500/60 hover:border-teal-400 p-4 rounded-2xl flex items-center gap-3.5 text-left transition shadow-md group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/40 group-hover:scale-105 transition shrink-0">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white group-hover:text-teal-200 flex items-center gap-1.5">
                        <span>Choose from Phone Gallery / Albums</span>
                      </h4>
                      <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-md border border-teal-500/30">
                        1 Photo
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Select any photo from your mobile gallery; AI will instantly identify & auto-add to inventory
                    </p>
                  </div>
                </button>

                {/* 2. Batch Multiple Gallery Photos Selection */}
                <button
                  type="button"
                  onClick={() => batchGalleryInputRef.current?.click()}
                  className="bg-gradient-to-r from-emerald-950/80 to-slate-950 hover:from-emerald-900/90 hover:to-slate-900 border-2 border-emerald-500/60 hover:border-emerald-400 p-4 rounded-2xl flex items-center gap-3.5 text-left transition shadow-md group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/40 group-hover:scale-105 transition shrink-0">
                    <Images className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-200 flex items-center gap-1.5">
                        <span>Batch Gallery Photos (AI Multi-Add)</span>
                      </h4>
                      <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30">
                        Multiple
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Select 2, 5, or 10+ photos from your phone gallery to auto-extract and add all items in bulk
                    </p>
                  </div>
                </button>

                {/* 3. Take Live Camera Photo */}
                <button
                  type="button"
                  onClick={() => {
                    startLiveCamera('environment');
                  }}
                  className="bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/60 p-3.5 rounded-2xl flex items-center gap-3.5 text-left transition group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-500/40 group-hover:scale-105 transition shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-slate-200 group-hover:text-white">
                      Live In-App Camera Viewfinder
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Live hardware stream with zero memory spike & instantaneous snapshot
                    </p>
                  </div>
                </button>
              </div>

              {/* Drag & Drop Upload Zone for Desktop */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOverPhoto(true);
                }}
                onDragLeave={() => setIsDragOverPhoto(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOverPhoto(false);
                  const files = e.dataTransfer.files;
                  if (files && files.length > 1) {
                    const syntheticEvent = { target: { files, value: '' } } as any;
                    handleBatchGalleryFilesSelected(syntheticEvent);
                  } else if (files && files[0]) {
                    processImageFile(files[0]);
                  }
                }}
                onClick={() => galleryInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all ${
                  isDragOverPhoto
                    ? 'border-emerald-400 bg-emerald-950/50 scale-[1.01]'
                    : 'border-slate-800 hover:border-emerald-500/70 bg-slate-950/60 hover:bg-slate-950/90'
                }`}
              >
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-300">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Or drag & drop photo files directly here</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Supports JPG, PNG, WEBP, GIF, SVG, HEIC / Phone camera roll photos
                </p>
              </div>

              {/* Paste URL */}
              <div className="bg-slate-950/70 border border-slate-800/90 p-3 rounded-2xl space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Or Paste an Online Product Image URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    id="input-ai-image-url"
                    placeholder="https://example.com/product-image.jpg"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const target = e.currentTarget.value.trim();
                        if (target) {
                          handleAiIdentifyProduct(target);
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('input-ai-image-url') as HTMLInputElement;
                      const url = input?.value.trim();
                      if (url) {
                        handleAiIdentifyProduct(url);
                      } else {
                        alert('Please enter an image URL.');
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer"
                  >
                    Scan URL
                  </button>
                </div>
              </div>

              {/* Auto-Add Option Toggle */}
              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-bold text-xs select-none">
                  <input
                    type="checkbox"
                    checked={autoSaveOnCameraSnap}
                    onChange={(e) => setAutoSaveOnCameraSnap(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 bg-slate-950 border-slate-700 rounded cursor-pointer"
                  />
                  <span>⚡ Instant Auto-Save into Inventory</span>
                </label>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  {autoSaveOnCameraSnap ? 'Auto-adds to stock immediately' : 'Open review modal first'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAiScanModal(false);
                  setIsAiIdentifying(false);
                  setIsBatchScanning(false);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMAGE PREVIEW LIGHTBOX */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[3000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 pr-4">
                <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
                <h4 className="font-bold text-sm text-slate-200 truncate">{previewImage.title}</h4>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-950/60 max-h-[75vh] overflow-hidden">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                referrerPolicy="no-referrer"
                className="max-h-[68vh] w-auto max-w-full rounded-2xl object-contain border border-slate-800 shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BARCODE SCAN HISTORY & STAFF AUDIT LOG */}
      <BarcodeScanHistoryModal
        isOpen={showScanHistoryModal}
        onClose={() => setShowScanHistoryModal(false)}
        scanLogs={scanLogs}
        products={products}
        currentUser={currentUser}
        allUsers={allUsers}
        onRecordScanLog={onRecordScanLog}
        onClearScanLogs={onClearScanLogs}
        onSelectProductForEdit={(prod) => {
          setShowScanHistoryModal(false);
          handleOpenEditModal(prod);
        }}
      />

      {/* Permanently Mounted Hidden File Inputs for Device Camera & File Picker */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoSelected}
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelected}
      />
      <input
        type="file"
        ref={batchGalleryInputRef}
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleBatchGalleryFilesSelected}
      />
    </div>
  );
};
