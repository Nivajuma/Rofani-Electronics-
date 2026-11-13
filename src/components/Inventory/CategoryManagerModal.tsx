import React, { useState, useMemo } from 'react';
import {
  X,
  Layers,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  AlertTriangle,
  FolderPlus,
  Tag,
  Package,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Product } from '../../types';

export interface CategoryItem {
  id: string;
  name: string;
  subcategories: string[];
}

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  products: Product[];
  onAddCategory: (name: string, subcategories?: string[]) => void;
  onEditCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (categoryName: string, reassignToCategory: string) => void;
  onAddSubcategory: (categoryName: string, subName: string) => void;
  onEditSubcategory: (categoryName: string, oldSubName: string, newSubName: string) => void;
  onDeleteSubcategory: (categoryName: string, subName: string, reassignToSub?: string) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  products,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onAddSubcategory,
  onEditSubcategory,
  onDeleteSubcategory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSubs, setNewCatSubs] = useState('');

  // Editing state for category
  const [editingCatName, setEditingCatName] = useState<string | null>(null);
  const [tempCatName, setTempCatName] = useState('');

  // Adding subcategory to specific category
  const [addingSubToCat, setAddingSubToCat] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');

  // Editing subcategory
  const [editingSub, setEditingSub] = useState<{ catName: string; subName: string } | null>(null);
  const [tempSubName, setTempSubName] = useState('');

  // Delete Category confirmation modal
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [reassignCategoryTarget, setReassignCategoryTarget] = useState<string>('General');

  // Delete Subcategory confirmation modal
  const [subToDelete, setSubToDelete] = useState<{ catName: string; subName: string } | null>(null);
  const [reassignSubTarget, setReassignSubTarget] = useState<string>('General');

  // Expanded categories map for collapsible views
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  // Toast notice
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Compute product counts per category and subcategory
  const counts = useMemo(() => {
    const catMap: Record<string, number> = {};
    const subMap: Record<string, number> = {};

    (products || []).forEach((p) => {
      const c = (p.category || 'General').trim();
      const s = (p.subcategory || 'General').trim();
      catMap[c.toLowerCase()] = (catMap[c.toLowerCase()] || 0) + 1;
      const key = `${c.toLowerCase()}:::${s.toLowerCase()}`;
      subMap[key] = (subMap[key] || 0) + 1;
    });

    return { catMap, subMap };
  }, [products]);

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categories;

    return categories.filter((c) => {
      const matchCat = c.name.toLowerCase().includes(query);
      const matchSub = (c.subcategories || []).some((s) => s.toLowerCase().includes(query));
      return matchCat || matchSub;
    });
  }, [categories, searchQuery]);

  if (!isOpen) return null;

  const toggleExpand = (catName: string) => {
    setExpandedCats((prev) => ({
      ...prev,
      [catName]: prev[catName] === undefined ? false : !prev[catName],
    }));
  };

  const isExpanded = (catName: string) => {
    return expandedCats[catName] !== false; // expanded by default
  };

  // Handler: Add new category
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    const exists = categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      showToast(`Category "${trimmed}" already exists.`, 'error');
      return;
    }

    const subs = newCatSubs
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    onAddCategory(trimmed, subs.length > 0 ? subs : ['General']);
    setNewCatName('');
    setNewCatSubs('');
    setIsAddingCategory(false);
    showToast(`✨ Category "${trimmed}" created successfully!`);
  };

  // Handler: Save category rename
  const handleSaveCategoryRename = (oldName: string) => {
    const trimmed = tempCatName.trim();
    if (!trimmed || trimmed.toLowerCase() === oldName.toLowerCase()) {
      setEditingCatName(null);
      return;
    }

    const exists = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.name.toLowerCase() !== oldName.toLowerCase()
    );
    if (exists) {
      showToast(`Category "${trimmed}" already exists.`, 'error');
      return;
    }

    onEditCategory(oldName, trimmed);
    setEditingCatName(null);
    showToast(`Renamed category to "${trimmed}".`);
  };

  // Handler: Confirm delete category
  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    onDeleteCategory(categoryToDelete, reassignCategoryTarget);
    showToast(`🗑️ Category "${categoryToDelete}" deleted. Products moved to "${reassignCategoryTarget}".`);
    setCategoryToDelete(null);
  };

  // Handler: Create subcategory
  const handleCreateSubcategory = (catName: string) => {
    const trimmed = newSubName.trim();
    if (!trimmed) return;

    const cat = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
    if (cat && cat.subcategories.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Subcategory "${trimmed}" already exists in this category.`, 'error');
      return;
    }

    onAddSubcategory(catName, trimmed);
    setNewSubName('');
    setAddingSubToCat(null);
    showToast(`Added subcategory "${trimmed}" to "${catName}".`);
  };

  // Handler: Save subcategory rename
  const handleSaveSubcategoryRename = (catName: string, oldSubName: string) => {
    const trimmed = tempSubName.trim();
    if (!trimmed || trimmed.toLowerCase() === oldSubName.toLowerCase()) {
      setEditingSub(null);
      return;
    }

    onEditSubcategory(catName, oldSubName, trimmed);
    setEditingSub(null);
    showToast(`Renamed subcategory to "${trimmed}".`);
  };

  // Handler: Confirm delete subcategory
  const handleConfirmDeleteSubcategory = () => {
    if (!subToDelete) return;
    onDeleteSubcategory(subToDelete.catName, subToDelete.subName, reassignSubTarget);
    showToast(`🗑️ Subcategory "${subToDelete.subName}" removed.`);
    setSubToDelete(null);
  };

  const totalSubcategoriesCount = categories.reduce((sum, c) => sum + (c.subcategories?.length || 0), 0);

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-extrabold shadow-md shadow-sky-600/30">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl text-white flex items-center gap-2">
                <span>Category & Subcategory Manager</span>
              </h3>
              <p className="text-xs text-slate-400">
                Create, rename, re-assign, or delete catalog product categories and classifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`px-5 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/70 border-rose-800 text-rose-300'
            }`}
          >
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
              ✕
            </button>
          </div>
        )}

        {/* Toolbar: Stats & Search & New Category Button */}
        <div className="p-4 sm:p-5 bg-slate-950/40 border-b border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories or subcategories..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 text-xs text-slate-400 self-center font-mono">
            <span>
              <strong className="text-sky-400">{categories.length}</strong> Categories
            </span>
            <span>•</span>
            <span>
              <strong className="text-indigo-400">{totalSubcategoriesCount}</strong> Subcategories
            </span>
          </div>

          {/* Add Category Button */}
          <button
            type="button"
            onClick={() => setIsAddingCategory((prev) => !prev)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>

        {/* Inline Create Category Form */}
        {isAddingCategory && (
          <form
            onSubmit={handleCreateCategory}
            className="p-4 bg-sky-950/20 border-b border-sky-900/40 space-y-3 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Create New Product Category
              </span>
              <button
                type="button"
                onClick={() => setIsAddingCategory(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Solar Equipment, Perfumes, Baby Wear..."
                  className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Initial Subcategories (Comma-separated)
                </label>
                <input
                  type="text"
                  value={newCatSubs}
                  onChange={(e) => setNewCatSubs(e.target.value)}
                  placeholder="e.g. Inverters, Solar Panels, Batteries"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingCategory(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 cursor-pointer"
              >
                Save Category
              </button>
            </div>
          </form>
        )}

        {/* Scrollable Categories List */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-slate-800 p-6">
              <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-300">No categories matching "{searchQuery}"</h4>
              <p className="text-xs text-slate-500 mt-1">Try another search term or click "Add Category" above.</p>
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const catProdCount = counts.catMap[cat.name.toLowerCase()] || 0;
              const expanded = isExpanded(cat.name);
              const isEditingThisCat = editingCatName === cat.name;

              return (
                <div
                  key={cat.id || cat.name}
                  className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-sm hover:border-slate-750 transition"
                >
                  {/* Category Header Row */}
                  <div className="p-3.5 sm:p-4 bg-slate-900/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleExpand(cat.name)}
                        className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                        title={expanded ? 'Collapse subcategories' : 'Expand subcategories'}
                      >
                        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      {isEditingThisCat ? (
                        <div className="flex items-center gap-2 flex-1 max-w-sm">
                          <input
                            type="text"
                            value={tempCatName}
                            onChange={(e) => setTempCatName(e.target.value)}
                            className="bg-slate-900 border border-sky-500 rounded-lg px-2.5 py-1 text-xs text-white outline-none w-full font-bold"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveCategoryRename(cat.name);
                              if (e.key === 'Escape') setEditingCatName(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCategoryRename(cat.name)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCatName(null)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="font-extrabold text-sm text-slate-100 truncate">{cat.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              catProdCount > 0
                                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {catProdCount} {catProdCount === 1 ? 'product' : 'products'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions on Category */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setAddingSubToCat(cat.name);
                          setNewSubName('');
                          setExpandedCats((prev) => ({ ...prev, [cat.name]: true }));
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                        title="Add Subcategory"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Subcategory</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatName(cat.name);
                          setTempCatName(cat.name);
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                        title="Rename Category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCategoryToDelete(cat.name);
                          // Default reassign target to another existing category or 'General'
                          const fallback = categories.find((c) => c.name.toLowerCase() !== cat.name.toLowerCase());
                          setReassignCategoryTarget(fallback ? fallback.name : 'General');
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer border border-transparent hover:border-rose-800/60"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories Section (when expanded) */}
                  {expanded && (
                    <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/40 space-y-2.5">
                      {/* Inline Add Subcategory input */}
                      {addingSubToCat === cat.name && (
                        <div className="flex items-center gap-2 p-2 bg-slate-900 rounded-xl border border-sky-800/50 animate-in fade-in">
                          <Tag className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <input
                            type="text"
                            value={newSubName}
                            onChange={(e) => setNewSubName(e.target.value)}
                            placeholder="New subcategory name..."
                            className="bg-transparent text-xs text-white outline-none flex-1 placeholder-slate-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCreateSubcategory(cat.name);
                              if (e.key === 'Escape') setAddingSubToCat(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleCreateSubcategory(cat.name)}
                            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingSubToCat(null)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {/* Subcategories Chips / List */}
                      {(!cat.subcategories || cat.subcategories.length === 0) ? (
                        <p className="text-xs text-slate-500 italic pl-2">No subcategories defined for this category.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {cat.subcategories.map((sub) => {
                            const isEditingThisSub =
                              editingSub?.catName === cat.name && editingSub?.subName === sub;
                            const key = `${cat.name.toLowerCase()}:::${sub.toLowerCase()}`;
                            const subProdCount = counts.subMap[key] || 0;

                            if (isEditingThisSub) {
                              return (
                                <div
                                  key={sub}
                                  className="flex items-center gap-1.5 p-1 bg-slate-900 border border-sky-500 rounded-xl"
                                >
                                  <input
                                    type="text"
                                    value={tempSubName}
                                    onChange={(e) => setTempSubName(e.target.value)}
                                    className="bg-transparent text-xs text-white outline-none px-1.5 font-bold w-32"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveSubcategoryRename(cat.name, sub);
                                      if (e.key === 'Escape') setEditingSub(null);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveSubcategoryRename(cat.name, sub)}
                                    className="p-1 bg-emerald-600 text-white rounded-lg cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSub(null)}
                                    className="p-1 bg-slate-800 text-slate-400 rounded-lg cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={sub}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition group"
                              >
                                <Tag className="w-3 h-3 text-slate-500 group-hover:text-sky-400 transition" />
                                <span className="font-medium">{sub}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-400 font-bold">
                                  {subProdCount}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSub({ catName: cat.name, subName: sub });
                                    setTempSubName(sub);
                                  }}
                                  className="text-slate-500 hover:text-white ml-0.5 cursor-pointer"
                                  title="Rename Subcategory"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSubToDelete({ catName: cat.name, subName: sub });
                                    setReassignSubTarget('General');
                                  }}
                                  className="text-slate-500 hover:text-rose-400 ml-0.5 cursor-pointer"
                                  title="Delete Subcategory"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Changes to categories & subcategories update all inventory filter tabs and catalog records immediately.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODAL: DELETE CATEGORY */}
      {categoryToDelete && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setCategoryToDelete(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Delete Category?</h3>
                <p className="text-xs text-slate-400">Remove "{categoryToDelete}" from store directory</p>
              </div>
            </div>

            {/* Affected products info */}
            {(() => {
              const affectedCount = counts.catMap[categoryToDelete.toLowerCase()] || 0;
              const otherCategories = categories.filter(
                (c) => c.name.toLowerCase() !== categoryToDelete.toLowerCase()
              );

              return (
                <div className="space-y-3">
                  {affectedCount > 0 ? (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2 text-xs text-amber-200">
                      <div className="flex items-center gap-2 font-bold text-amber-300">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>
                          {affectedCount} {affectedCount === 1 ? 'product is' : 'products are'} currently assigned to this category.
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed">
                        Select a target category to reassign these products to so their inventory records stay intact:
                      </p>
                      <div>
                        <select
                          value={reassignCategoryTarget}
                          onChange={(e) => setReassignCategoryTarget(e.target.value)}
                          className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                        >
                          {otherCategories.map((c) => (
                            <option key={c.name} value={c.name}>
                              Move to: {c.name}
                            </option>
                          ))}
                          <option value="General">Move to: General</option>
                          <option value="Uncategorized">Move to: Uncategorized</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-400">
                      No products are currently in this category. It will be removed immediately.
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-rose-600/25 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Category</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE SUBCATEGORY */}
      {subToDelete && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSubToDelete(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Delete Subcategory?</h3>
                <p className="text-xs text-slate-400">
                  Remove "{subToDelete.subName}" from {subToDelete.catName}
                </p>
              </div>
            </div>

            {(() => {
              const key = `${subToDelete.catName.toLowerCase()}:::${subToDelete.subName.toLowerCase()}`;
              const count = counts.subMap[key] || 0;

              return (
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2">
                  <p>
                    {count > 0 ? (
                      <span>
                        <strong className="text-sky-400">{count}</strong> products currently use this subcategory. Their subcategory will be reset to <strong className="text-white">"General"</strong>.
                      </span>
                    ) : (
                      <span>No products are currently tagged with this subcategory.</span>
                    )}
                  </p>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSubToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSubcategory}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-rose-600/25 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Subcategory</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
