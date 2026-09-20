import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Check,
  RefreshCw,
  X,
  Layers,
  Search,
  Sliders,
  Download,
  AlertCircle,
  Camera,
  Upload,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { Product } from '../../types';
import {
  CATEGORY_IMAGE_POOLS,
  getCategoryPool,
  assignUniqueCatalogImages,
  detectRepeatedItemPhotos,
  normalizeImageUrl,
  generateDistinctSeedUrl
} from '../../utils/productImages';

interface ImageGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onApplyImage: (productId: string, imageUrl: string) => void;
  onBulkApplyImages?: (imageMap: Record<string, string>) => void;
  allProducts?: Product[];
}

export const ImageGeneratorModal: React.FC<ImageGeneratorModalProps> = ({
  isOpen,
  onClose,
  product,
  onApplyImage,
  onBulkApplyImages,
  allProducts = [],
}) => {
  const [promptText, setPromptText] = useState(
    product ? `Photorealistic studio shot of ${product.name}, clean white background, 4k e-commerce photo` : ''
  );
  const [selectedPresetStyle, setSelectedPresetStyle] = useState('Studio White E-Commerce');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOptions, setGeneratedOptions] = useState<string[]>([]);
  const [mode, setMode] = useState<'single' | 'bulk'>(product ? 'single' : 'bulk');
  const [onlyMissingPhotos, setOnlyMissingPhotos] = useState(true);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Detect which photos are already in use across the catalog (excluding the current item being edited)
  const usedPhotosMap = React.useMemo(() => {
    const map = new Map<string, string>();
    allProducts.forEach((p) => {
      if (p.imageUrl && (!product || p.id !== product.id)) {
        const norm = normalizeImageUrl(p.imageUrl);
        if (norm) {
          map.set(norm, p.name);
        }
      }
    });
    return map;
  }, [allProducts, product]);

  const existingRepeatedGroups = React.useMemo(() => {
    return detectRepeatedItemPhotos(allProducts);
  }, [allProducts]);

  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      // Immediately set selected image
      setSelectedImage(rawDataUrl);
      setCustomUrlInput('');

      // Background compression
      try {
        const img = new Image();
        img.onload = () => {
          const MAX_SIZE = 600;
          let width = img.width;
          let height = img.height;

          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            } else {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
              if (compressedDataUrl && compressedDataUrl.length > 50) {
                setSelectedImage(compressedDataUrl);
              }
            }
          }
        };
        img.src = rawDataUrl;
      } catch (err) {
        console.warn('Canvas resize skipped in image studio modal', err);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  // Auto detect product category image pool using curated pools
  const defaultCategoryPhotos = getCategoryPool(product?.category || '', product?.name || '');

  // Generate AI Images Simulation / Unsplash Search with non-repeating options
  const handleGenerateAiImages = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // Find candidate photos from category pool that are NOT used elsewhere in catalog
      const pool = getCategoryPool(product?.category || '', product?.name || '');
      const uniqueFromPool = pool.filter((url) => {
        const norm = normalizeImageUrl(url);
        return !usedPhotosMap.has(norm);
      });

      // Distinct seed options
      const seedOptions = [1, 2, 3, 4].map((s) =>
        generateDistinctSeedUrl(
          product?.category || 'Retail',
          product?.name || 'Item',
          `${product?.id || 'prod'}-${Date.now()}-${s}`
        )
      );

      const candidateCombined = [
        ...uniqueFromPool,
        ...seedOptions,
        ...pool
      ];

      // Deduplicate within the options list
      const seen = new Set<string>();
      const finalOptions: string[] = [];
      for (const opt of candidateCombined) {
        const n = normalizeImageUrl(opt);
        if (!seen.has(n)) {
          seen.add(n);
          finalOptions.push(opt);
        }
        if (finalOptions.length >= 8) break;
      }

      setGeneratedOptions(finalOptions);
      setSelectedImage(finalOptions[0] || '');
      setIsGenerating(false);
    }, 600);
  };

  // Bulk generate non-repeating unique images for catalog
  const handleBulkGenerate = () => {
    if (!onBulkApplyImages) return;
    setIsGenerating(true);

    setTimeout(() => {
      // Filter items to process
      const itemsToProcess = onlyMissingPhotos
        ? allProducts.filter((p) => !p.imageUrl)
        : allProducts;

      // Assign unique images using the deduplication engine
      const uniqueImageAssignments = assignUniqueCatalogImages(itemsToProcess, allProducts);

      onBulkApplyImages(uniqueImageAssignments);
      setIsGenerating(false);
      onClose();
    }, 1000);
  };

  const handleApplySingle = () => {
    const finalUrl = customUrlInput.trim() || selectedImage || defaultCategoryPhotos[0];
    if (product && finalUrl) {
      onApplyImage(product.id, finalUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[1050] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-950 border border-purple-800 text-purple-400 rounded-2xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                <span>AI Product Image Studio</span>
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] px-2 py-0.5 rounded-full font-mono">
                  4K Studio Quality
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Generate high-resolution e-commerce photos or assign studio images automatically.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Controls Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMode('single')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                mode === 'single' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Single Item Image
            </button>
            <button
              onClick={() => setMode('bulk')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                mode === 'bulk' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Bulk Auto-Assign (All 300+ Items)
            </button>
          </div>

          {product && (
            <span className="text-xs font-bold text-purple-400 bg-purple-950/80 px-3 py-1 rounded-full border border-purple-800">
              Editing: {product.name}
            </span>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {mode === 'bulk' ? (
            /* Bulk Image Generator Option */
            <div className="space-y-4 text-center py-6">
              <div className="w-16 h-16 bg-purple-950/80 border border-purple-800 text-purple-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                <Wand2 className="w-8 h-8 animate-pulse" />
              </div>

              <div>
                <h4 className="font-extrabold text-lg text-slate-100">
                  Auto-Assign AI Studio Product Images to Catalog
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Automatically matches all {allProducts.length} items in your catalog (Phones, Electronics, Fashion, Beauty, Beverages) with studio photography thumbnails instantly.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left max-w-md mx-auto space-y-2 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Total Products in Inventory:</span>
                  <span className="font-mono font-bold text-white">{allProducts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Items Without Photos:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {allProducts.filter((p) => !p.imageUrl).length}
                  </span>
                </div>
                {existingRepeatedGroups.length > 0 && (
                  <div className="flex items-center justify-between text-rose-400 bg-rose-950/40 p-2 rounded-xl border border-rose-900/50">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Repeated Photos Detected:
                    </span>
                    <span className="font-bold">
                      {existingRepeatedGroups.reduce((acc, g) => acc + g.products.length, 0)} items share photos
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>Deduplication Algorithm:</span>
                  <span className="font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Unique Image Guarantee
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={onlyMissingPhotos}
                      onChange={(e) => setOnlyMissingPhotos(e.target.checked)}
                      className="rounded accent-purple-600 w-4 h-4 cursor-pointer"
                    />
                    <span>Only generate for items missing photos (preserve custom ones)</span>
                  </label>
                </div>
              </div>

              <button
                disabled={isGenerating || allProducts.length === 0}
                onClick={handleBulkGenerate}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-extrabold px-8 py-3.5 rounded-2xl text-xs transition flex items-center justify-center gap-2 mx-auto shadow-xl shadow-purple-600/30 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Assigning Unique Photos to Catalog...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {onlyMissingPhotos
                        ? `Auto-Assign Unique Photos to ${allProducts.filter((p) => !p.imageUrl).length} Items Without Photos`
                        : `Reassign Unique Photos to All ${allProducts.length} Items (No Repetitions)`}
                    </span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Single Product AI Studio Generator */
            <div className="space-y-5">
              {/* Prompt Input & Presets */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Describe the Product Photo or Prompt:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="e.g. Samsung Galaxy A15 smartphone on minimalist white marble table, studio lighting"
                    className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={handleGenerateAiImages}
                    disabled={isGenerating}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shrink-0"
                  >
                    {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    <span>Generate AI Shots</span>
                  </button>
                </div>

                {/* Preset Style Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  <span className="text-slate-500 text-[11px] shrink-0">Style Preset:</span>
                  {[
                    'Studio White E-Commerce',
                    'Dark Neon Futuristic',
                    'Luxury Velvet Display',
                    'Minimalist Pastel'
                  ].map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setSelectedPresetStyle(style)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition shrink-0 ${
                        selectedPresetStyle === style
                          ? 'bg-purple-600 text-white shadow'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generated Image Gallery Picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Select Generated Studio Shot:
                  </label>
                  <span className="text-[11px] text-emerald-400 font-medium">
                    ✨ Distinct photo recommendations
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {(generatedOptions.length > 0 ? generatedOptions : defaultCategoryPhotos).map((imgUrl, idx) => {
                    const norm = normalizeImageUrl(imgUrl);
                    const inUseByProduct = usedPhotosMap.get(norm);

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedImage(imgUrl);
                          setCustomUrlInput('');
                        }}
                        className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer aspect-square bg-slate-950 transition ${
                          selectedImage === imgUrl && !customUrlInput
                            ? 'border-purple-500 ring-2 ring-purple-500/40'
                            : inUseByProduct
                            ? 'border-amber-700/60 hover:border-amber-500'
                            : 'border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Generated Option ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        {selectedImage === imgUrl && !customUrlInput && (
                          <div className="absolute top-2 right-2 bg-purple-600 text-white p-1 rounded-full shadow">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {inUseByProduct && (
                          <div className="absolute bottom-1.5 inset-x-1.5 bg-slate-950/90 text-amber-300 border border-amber-500/30 px-1 py-0.5 rounded text-[9px] truncate font-medium text-center shadow">
                            In use: {inUseByProduct}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Warning if current choice is already used */}
              {(() => {
                const currentChoice = customUrlInput.trim() || selectedImage;
                if (!currentChoice) return null;
                const norm = normalizeImageUrl(currentChoice);
                const duplicateOwner = usedPhotosMap.get(norm);
                if (!duplicateOwner) return null;

                return (
                  <div className="p-3 bg-amber-950/60 border border-amber-800/80 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Repeated Photo Warning:</span>
                      <span>
                        This photo is already assigned to <strong className="text-white font-semibold">"{duplicateOwner}"</strong>.
                        To ensure each product has a unique identity, consider picking an unused photo option above.
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Hidden Inputs for Camera & Phone Gallery */}
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

              {/* Snap Photo or Gallery Upload */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">
                  Upload Real Photo from Phone:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 font-extrabold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Camera className="w-4 h-4 text-emerald-400" />
                    Take Photo (Camera)
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="bg-sky-950/90 hover:bg-sky-900 border border-sky-700/80 text-sky-300 font-extrabold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Upload className="w-4 h-4 text-sky-400" />
                    Phone Gallery / File
                  </button>
                </div>
              </div>

              {/* Direct Image URL Option */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-slate-400">
                  Or Paste Custom Image URL directly:
                </label>
                <input
                  type="text"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3.5 py-2 rounded-xl focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition"
          >
            Cancel
          </button>

          {mode === 'single' && (
            <button
              type="button"
              disabled={!selectedImage && !customUrlInput}
              onClick={handleApplySingle}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-purple-600/20"
            >
              <Check className="w-4 h-4" />
              <span>Apply Selected Studio Image</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
