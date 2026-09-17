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
  Upload
} from 'lucide-react';
import { Product } from '../../types';

interface ImageGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onApplyImage: (productId: string, imageUrl: string) => void;
  onBulkApplyImages?: (imageMap: Record<string, string>) => void;
  allProducts?: Product[];
}

// Curated high quality product photography presets by category keywords
const STUDIO_PHOTO_PRESETS: Record<string, string[]> = {
  electronics: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80', // Headphones
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=80', // Smartwatch
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=80', // Smartphone
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&auto=format&fit=crop&q=80', // Laptop
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80', // Earbuds
  ],
  boutique: [
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&auto=format&fit=crop&q=80', // Fashion dress
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&auto=format&fit=crop&q=80', // Handbag
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80', // Red Sneakers
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80', // Watch
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=500&auto=format&fit=crop&q=80', // Apparel
  ],
  beverages: [
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80', // Drink
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80', // Soft drink
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', // Juice glass
    'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop&q=80', // Coffee cup
  ],
  beauty: [
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80', // Perfume bottle
    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=500&auto=format&fit=crop&q=80', // Skincare cream
    'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=500&auto=format&fit=crop&q=80', // Hair care
  ],
  general: [
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=80', // Vintage Camera
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&auto=format&fit=crop&q=80', // Headphones studio
    'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=500&auto=format&fit=crop&q=80', // Shoe box
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80', // Audio
  ]
};

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

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

  // Auto detect product category category list
  const catKey = product?.category?.toLowerCase() || '';
  let defaultCategoryPhotos = STUDIO_PHOTO_PRESETS.general;
  if (catKey.includes('electr') || catKey.includes('phone') || catKey.includes('audio') || catKey.includes('comput')) {
    defaultCategoryPhotos = STUDIO_PHOTO_PRESETS.electronics;
  } else if (catKey.includes('boutique') || catKey.includes('fash') || catKey.includes('cloth') || catKey.includes('wear')) {
    defaultCategoryPhotos = STUDIO_PHOTO_PRESETS.boutique;
  } else if (catKey.includes('bever') || catKey.includes('snack') || catKey.includes('food')) {
    defaultCategoryPhotos = STUDIO_PHOTO_PRESETS.beverages;
  } else if (catKey.includes('care') || catKey.includes('beaut') || catKey.includes('perfum')) {
    defaultCategoryPhotos = STUDIO_PHOTO_PRESETS.beauty;
  }

  // Generate AI Images Simulation / Unsplash Search
  const handleGenerateAiImages = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const keyword = encodeURIComponent(
        product ? product.name.split(' ')[0] : 'product'
      );
      
      // Dynamic studio seed URLs
      const newOptions = [
        `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80`,
        `https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80`,
        `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80`,
        `https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&auto=format&fit=crop&q=80`,
        ...defaultCategoryPhotos
      ].slice(0, 6);

      setGeneratedOptions(newOptions);
      setSelectedImage(newOptions[0]);
      setIsGenerating(false);
    }, 600);
  };

  // Bulk generate images for all items in catalog without images
  const handleBulkGenerate = () => {
    if (!onBulkApplyImages) return;
    setIsGenerating(true);

    setTimeout(() => {
      const imageMap: Record<string, string> = {};
      allProducts.forEach((p, idx) => {
        const cKey = p.category.toLowerCase();
        let pool = STUDIO_PHOTO_PRESETS.general;
        if (cKey.includes('electr') || cKey.includes('phone') || cKey.includes('laptop')) {
          pool = STUDIO_PHOTO_PRESETS.electronics;
        } else if (cKey.includes('boutique') || cKey.includes('fashion') || cKey.includes('dress')) {
          pool = STUDIO_PHOTO_PRESETS.boutique;
        } else if (cKey.includes('bever') || cKey.includes('snack')) {
          pool = STUDIO_PHOTO_PRESETS.beverages;
        } else if (cKey.includes('care') || cKey.includes('beauty')) {
          pool = STUDIO_PHOTO_PRESETS.beauty;
        }
        const assigned = pool[idx % pool.length];
        imageMap[p.id] = assigned;
      });

      onBulkApplyImages(imageMap);
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
                  <span>Target Photography Style:</span>
                  <span className="font-semibold text-purple-400">Clean Studio E-Commerce</span>
                </div>
              </div>

              <button
                disabled={isGenerating || allProducts.length === 0}
                onClick={handleBulkGenerate}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-extrabold px-8 py-3.5 rounded-2xl text-xs transition flex items-center justify-center gap-2 mx-auto shadow-xl shadow-purple-600/30"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Catalog Images...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Auto-Assign Studio Images to All {allProducts.length} Items Now</span>
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
                <label className="block text-xs font-semibold text-slate-300">
                  Select Generated Studio Shot:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {(generatedOptions.length > 0 ? generatedOptions : defaultCategoryPhotos).map((imgUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedImage(imgUrl);
                        setCustomUrlInput('');
                      }}
                      className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer aspect-square bg-slate-950 transition ${
                        selectedImage === imgUrl && !customUrlInput
                          ? 'border-purple-500 ring-2 ring-purple-500/40'
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
                    </div>
                  ))}
                </div>
              </div>

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
