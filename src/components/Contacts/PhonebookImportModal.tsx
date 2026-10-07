import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Smartphone,
  Upload,
  CheckCircle2,
  AlertCircle,
  Users,
  Building2,
  FileText,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  Phone,
  Mail,
  UserPlus,
  Edit2,
  Trash2,
  Check
} from 'lucide-react';
import { Customer, Supplier } from '../../types';
import {
  isContactPickerSupported,
  isTopFrame,
  isRunningInIframe,
  pickFromDevicePhonebook,
  parseContactFile,
  parseRawTextContacts,
  convertToCustomers,
  convertToSuppliers,
  PickedContact
} from '../../utils/phoneContacts';

interface PhonebookImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTarget?: 'customers' | 'suppliers';
  onImportCustomers: (customers: Customer[]) => void;
  onImportSuppliers: (suppliers: Supplier[]) => void;
}

export const PhonebookImportModal: React.FC<PhonebookImportModalProps> = ({
  isOpen,
  onClose,
  defaultTarget = 'customers',
  onImportCustomers,
  onImportSuppliers,
}) => {
  const [targetType, setTargetType] = useState<'customers' | 'suppliers'>(defaultTarget);
  const [customerType, setCustomerType] = useState<Customer['customerType']>('Individual');
  const [supplierCategory, setSupplierCategory] = useState('General Merchandise');
  
  const [contacts, setContacts] = useState<PickedContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Staged contacts editing
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingPhone, setEditingPhone] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [activeTab, setActiveTab] = useState<'device' | 'vcf' | 'paste'>('device');
  const [pastedText, setPastedText] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPickerSupported = isContactPickerSupported();

  useEffect(() => {
    if (isOpen) {
      setTargetType(defaultTarget);
      setErrorMessage('');
      setSuccessNotice('');
      // Default to the file import tab which works 100% reliably in all environments
      setActiveTab('vcf');
    }
  }, [isOpen, defaultTarget]);

  if (!isOpen) return null;

  // Handler: Direct Native Contact Picker
  const handlePickFromDevice = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      if (isRunningInIframe() || !isContactPickerSupported()) {
        setActiveTab('vcf');
        setErrorMessage(
          'Notice: Mobile browser policy restricts direct address book popups inside embedded web frames. Switched to phone contacts file import below—tap "Choose Contacts File" to pick your contacts (.vcf or .csv)!'
        );
        fileInputRef.current?.click();
        setIsLoading(false);
        return;
      }

      const picked = await pickFromDevicePhonebook(true);
      if (picked.length === 0) {
        setIsLoading(false);
        return;
      }
      setContacts(picked);
      setSelectedIds(new Set(picked.map((c) => c.id)));
      setSuccessNotice(`Found ${picked.length} contact(s) from your phone book!`);
    } catch {
      setActiveTab('vcf');
      setErrorMessage(
        'Notice: Browser security policy restricts direct address book popups inside embedded web frames. Switched to contact file import below—tap "Choose Contacts File" to pick your exported .vcf or .csv contacts.'
      );
      fileInputRef.current?.click();
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Contact File (.vcf / .csv / vCard) Upload
  const handleVcfFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMessage('');
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseContactFile(text);
        if (parsed.length === 0) {
          setErrorMessage('No valid contacts found in this file. Please check the file format (.vcf, .csv, or text).');
        } else {
          setContacts(parsed);
          setSelectedIds(new Set(parsed.map((c) => c.id)));
          setSuccessNotice(`Parsed ${parsed.length} contact(s) from "${file.name}"!`);
        }
      } catch {
        setErrorMessage('Failed to read file. Please ensure it is a valid .vcf or .csv contact export.');
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setErrorMessage('Error reading file from device.');
      setIsLoading(false);
    };

    reader.readAsText(file);
  };

  // Handler: Parse Pasted Text
  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      setErrorMessage('Please paste names and phone numbers first.');
      return;
    }
    const parsed = parseRawTextContacts(pastedText);
    if (parsed.length === 0) {
      setErrorMessage('Could not extract contacts from the pasted text.');
      return;
    }
    setContacts(parsed);
    setSelectedIds(new Set(parsed.map((c) => c.id)));
    setSuccessNotice(`Extracted ${parsed.length} contact(s) from pasted text!`);
  };

  // Selection toggles
  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Staged contacts edit & delete
  const handleDeleteStagedContact = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      copy.delete(id);
      return copy;
    });
    if (editingContactId === id) {
      setEditingContactId(null);
    }
  };

  const handleStartEditStaged = (c: PickedContact, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingContactId(c.id);
    setEditingName(c.name);
    setEditingPhone(c.phone);
  };

  const handleSaveEditStaged = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingName.trim()) return;
    setContacts((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, name: editingName.trim(), phone: editingPhone.trim() || c.phone } : c
      )
    );
    setEditingContactId(null);
  };

  // Execute Import
  const handleConfirmImport = () => {
    const selectedContacts = contacts.filter((c) => selectedIds.has(c.id));
    if (selectedContacts.length === 0) {
      setErrorMessage('Please select at least one contact to import.');
      return;
    }

    if (targetType === 'customers') {
      const newCustomers = convertToCustomers(selectedContacts, customerType);
      onImportCustomers(newCustomers);
      setSuccessNotice(`Successfully imported ${newCustomers.length} customer(s) to store!`);
    } else {
      const newSuppliers = convertToSuppliers(selectedContacts, supplierCategory);
      onImportSuppliers(newSuppliers);
      setSuccessNotice(`Successfully imported ${newSuppliers.length} supplier(s) to store!`);
    }

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Filtered contacts based on search
  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative my-6 text-slate-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-600/20">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                Add from Phone Book Contacts
              </h2>
              <p className="text-xs text-slate-400">
                Directly import phone contacts as Customers or Suppliers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto space-y-4 py-4 flex-1">
          {/* Target Destination & Tag Selection */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-400">Import Destination:</span>
              <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTargetType('customers')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    targetType === 'customers'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Customers</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('suppliers')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    targetType === 'suppliers'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Suppliers</span>
                </button>
              </div>
            </div>

            {targetType === 'customers' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Default Category:</span>
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="Individual">Individual</option>
                  <option value="Wholesaler">Wholesaler</option>
                  <option value="VIP">VIP</option>
                  <option value="Corporate">Corporate</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Category:</span>
                <select
                  value={supplierCategory}
                  onChange={(e) => setSupplierCategory(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="General Merchandise">General Merchandise</option>
                  <option value="Electronics & Accessories">Electronics & Accessories</option>
                  <option value="Apparel & Boutique">Apparel & Boutique</option>
                  <option value="Food & Beverages">Food & Beverages</option>
                  <option value="Packaging & Logistics">Packaging & Logistics</option>
                </select>
              </div>
            )}
          </div>

          {/* Import Method Tabs */}
          <div className="flex border-b border-slate-800 text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('vcf')}
              className={`px-4 py-2.5 font-bold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'vcf'
                  ? 'border-sky-500 text-sky-400 bg-sky-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4 text-sky-400" />
              <span>📁 Contacts File (.vcf / .csv)</span>
              <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded font-mono">Recommended</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`px-4 py-2.5 font-bold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'paste'
                  ? 'border-sky-500 text-sky-400 bg-sky-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <span>📋 Quick Paste / Text</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('device')}
              className={`px-4 py-2.5 font-bold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'device'
                  ? 'border-sky-500 text-sky-400 bg-sky-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>📱 Direct Phone Book</span>
            </button>
          </div>

          {/* Tab 1: vCard / .vcf / .csv File Upload */}
          {activeTab === 'vcf' && (
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex items-center justify-center text-sky-400 mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-sm font-bold text-slate-200">
                    Import Phone Contacts File (.vcf, .csv, vCard)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Directly select the exported contacts file or contact cards saved on your phone or computer.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".vcf,.vcard,.csv,.txt,text/vcard,text/csv,text/plain"
                  onChange={handleVcfFileUpload}
                  className="hidden"
                />

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/25 transition cursor-pointer active:scale-95"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isLoading ? 'Reading File...' : '📁 Choose Contacts File from Phone (.vcf / .csv)'}</span>
                  </button>
                </div>
              </div>

              {/* Step-by-step how to export from phone */}
              <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 space-y-2">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>How to export contacts from your phone in 10 seconds:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="font-bold text-sky-400 block mb-0.5">🤖 Android Phones:</span>
                    Open <strong>Contacts</strong> app &rarr; Tap Settings or 3 dots &rarr; <strong>Export to .vcf file</strong> &rarr; Save to Downloads.
                  </div>
                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="font-bold text-sky-400 block mb-0.5">🍏 iPhone (iOS):</span>
                    Open <strong>Contacts</strong> &rarr; Select contact(s) &rarr; <strong>Share Contact</strong> &rarr; <strong>Save to Files</strong>.
                  </div>
                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="font-bold text-indigo-400 block mb-0.5">🌐 Google Contacts:</span>
                    Visit <strong>contacts.google.com</strong> &rarr; Tap <strong>Export</strong> &rarr; Choose <strong>vCard (.vcf)</strong> or <strong>CSV</strong>.
                  </div>
                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="font-bold text-emerald-400 block mb-0.5">💬 WhatsApp Contact Cards:</span>
                    Any contact card shared on WhatsApp can be saved to your device and selected here!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Paste Contacts Text */}
          {activeTab === 'paste' && (
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">
                  Paste Phone Numbers & Names:
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  Format: Name + Phone number
                </span>
              </div>
              <textarea
                rows={4}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Example:&#10;John Kamau +254 712 345678&#10;Alice Wanjiku, 0722112233, alice@example.com&#10;Mama Brian Supplies 0733445566"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
              />
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-500">
                  Paste multiple contacts separated by line, comma, or tab.
                </p>
                <button
                  type="button"
                  onClick={handleParsePastedText}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Extract Contacts
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Native Device Phone Book */}
          {activeTab === 'device' && (
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400 mx-auto">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-sm font-bold text-slate-200">
                  Direct Phone Book Address Picker
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Supported natively on Android Chrome and installed Progressive Web Apps (PWA) running in the top window.
                </p>
              </div>

              {isRunningInIframe() ? (
                <div className="bg-amber-950/40 border border-amber-900/60 p-3 rounded-xl text-xs text-amber-300 text-left space-y-2 max-w-md mx-auto">
                  <div className="flex items-center gap-1.5 font-bold text-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Embedded Preview Restriction</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80">
                    Browser security policies (W3C specification) restrict the direct Contact Picker API from opening inside embedded web preview frames.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('vcf');
                      fileInputRef.current?.click();
                    }}
                    className="w-full mt-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition"
                  >
                    📁 Use Contacts File (.vcf / .csv) Instead
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePickFromDevice}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/25 transition cursor-pointer active:scale-95"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{isLoading ? 'Opening Phone Contacts...' : '📱 Open Phone Book Contacts'}</span>
                </button>
              )}
            </div>
          )}

          {/* Notifications */}
          {errorMessage && (
            <div className="bg-rose-950/60 border border-rose-800 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Contacts Selection & Preview Table */}
          {contacts.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
                  >
                    {selectedIds.size === contacts.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    <span>
                      {selectedIds.size === contacts.length ? 'Deselect All' : 'Select All'} ({selectedIds.size}/{contacts.length})
                    </span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter contacts..."
                    className="bg-slate-950 border border-slate-800 text-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/40">
                {filteredContacts.map((contact) => {
                  const isChecked = selectedIds.has(contact.id);
                  const isEditingThis = editingContactId === contact.id;

                  if (isEditingThis) {
                    return (
                      <div
                        key={contact.id}
                        className="p-3 bg-indigo-950/40 border-y border-indigo-700/60 text-xs space-y-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="font-bold text-sky-400 text-[11px]">Edit Contact Information</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            placeholder="Full Name"
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100 text-xs focus:border-sky-500 outline-none"
                          />
                          <input
                            type="text"
                            value={editingPhone}
                            onChange={(e) => setEditingPhone(e.target.value)}
                            placeholder="Phone Number"
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100 text-xs font-mono focus:border-sky-500 outline-none"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingContactId(null)}
                            className="px-2.5 py-1 text-slate-400 hover:text-white text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleSaveEditStaged(contact.id, e)}
                            className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={contact.id}
                      onClick={() => toggleSelect(contact.id)}
                      className={`p-3 flex items-center justify-between gap-3 text-xs cursor-pointer transition ${
                        isChecked ? 'bg-sky-950/20' : 'hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="text-sky-400 shrink-0">
                          {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-600" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-200 truncate">{contact.name}</div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1 font-mono text-emerald-400">
                              <Phone className="w-3 h-3 text-emerald-500" />
                              {contact.phone}
                            </span>
                            {contact.email && (
                              <span className="flex items-center gap-1 text-slate-400 truncate">
                                <Mail className="w-3 h-3 text-slate-500" />
                                {contact.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400 shrink-0 capitalize">
                          {targetType === 'customers' ? customerType : 'Supplier'}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleStartEditStaged(contact, e)}
                          title="Edit this Contact"
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-sky-400 rounded-lg transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteStagedContact(contact.id, e)}
                          title="Remove from import queue"
                          className="p-1.5 bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={selectedIds.size === 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg ${
              selectedIds.size > 0
                ? targetType === 'customers'
                  ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>
              Add {selectedIds.size} Selected to {targetType === 'customers' ? 'Customers' : 'Suppliers'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
