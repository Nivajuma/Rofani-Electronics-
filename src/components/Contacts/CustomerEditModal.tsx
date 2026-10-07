import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  ShieldCheck,
  Smartphone,
  Upload,
  Clipboard,
  Plus,
  Trash2,
  Users,
  Star,
  Check,
  Edit2
} from 'lucide-react';
import { Customer, CustomerContactItem } from '../../types';
import {
  isContactPickerSupported,
  pickFromDevicePhonebook,
  parseContactFile,
  parseRawTextContacts,
} from '../../utils/phoneContacts';

interface CustomerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSave: (customer: Customer) => void;
}

export const CustomerEditModal: React.FC<CustomerEditModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [kraPin, setKraPin] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [customerType, setCustomerType] = useState<'Individual' | 'Wholesaler' | 'Corporate' | 'VIP'>('Individual');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [phonebookNotice, setPhonebookNotice] = useState<string>('');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Contacts List management
  const [contactsList, setContactsList] = useState<CustomerContactItem[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('+254 ');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactRole, setNewContactRole] = useState('Alternative');
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);

  const handlePickFromPhonebook = async () => {
    setPhonebookNotice('');
    if (isContactPickerSupported()) {
      try {
        const picked = await pickFromDevicePhonebook(false);
        if (picked.length > 0) {
          const c = picked[0];
          setName(c.name || name);
          if (c.phone && c.phone !== 'N/A') setPhone(c.phone);
          if (c.email) setEmail(c.email);
          if (c.address) setAddress(c.address);
          setPhonebookNotice(`✨ Auto-filled details for ${c.name} from phone book!`);
          setTimeout(() => setPhonebookNotice(''), 4000);
        }
      } catch {
        setPhonebookNotice('📱 Select your phone contacts file (.vcf / .csv) to auto-fill.');
        fileInputRef.current?.click();
      }
    } else {
      setPhonebookNotice('📱 Select your phone contacts file (.vcf / .csv) to auto-fill.');
      fileInputRef.current?.click();
    }
  };

  const handleVcfSingleContactUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseContactFile(text);
      if (parsed.length > 0) {
        const c = parsed[0];
        setName(c.name || name);
        if (c.phone && c.phone !== 'N/A') setPhone(c.phone);
        if (c.email) setEmail(c.email);
        if (c.address) setAddress(c.address);
        setPhonebookNotice(`✨ Imported ${c.name} from contacts file!`);
        setTimeout(() => setPhonebookNotice(''), 4000);
      } else {
        setPhonebookNotice('No valid contact found in file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleQuickPasteSubmit = () => {
    if (!pasteInput.trim()) return;
    const parsed = parseRawTextContacts(pasteInput);
    if (parsed.length > 0) {
      const c = parsed[0];
      if (c.name && c.name !== 'Contact 1') setName(c.name);
      if (c.phone && c.phone !== 'N/A') setPhone(c.phone);
      if (c.email) setEmail(c.email);
      if (c.address) setAddress(c.address);
      setPhonebookNotice(`✨ Extracted ${c.name || 'contact'} from pasted info!`);
      setShowPasteBox(false);
      setPasteInput('');
      setTimeout(() => setPhonebookNotice(''), 4000);
    } else {
      setPhonebookNotice('Could not extract name or phone from pasted text.');
    }
  };

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setPhone(customer.phone === 'N/A' ? '' : customer.phone || '');
      setEmail(customer.email || '');
      setAddress(customer.address || '');
      setKraPin(customer.kraPin || '');
      setCreditLimit(customer.creditLimit ? customer.creditLimit.toString() : '');
      setCustomerType(customer.customerType || 'Individual');
      setNotes(customer.notes || '');

      let list = customer.contactsList ? [...customer.contactsList] : [];
      if (list.length === 0 && customer.phone && customer.phone !== 'N/A') {
        list = [
          {
            id: `c-prim-${customer.id}`,
            name: `${customer.name} (Primary)`,
            phone: customer.phone,
            email: customer.email,
            role: 'Primary',
            isPrimary: true,
          },
        ];
      }
      setContactsList(list);
    } else {
      setName('');
      setPhone('+254 ');
      setEmail('');
      setAddress('');
      setKraPin('');
      setCreditLimit('');
      setCustomerType('Individual');
      setNotes('');
      setContactsList([]);
    }
    setErrors({});
    setShowAddContactForm(false);
    setEditingContactIndex(null);
  }, [customer, isOpen]);

  const handleSaveContactItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = newContactPhone.trim();
    if (!cleanPhone || cleanPhone === '+254') {
      return;
    }
    const cleanName = newContactName.trim() || `${name || 'Customer'} (Contact ${contactsList.length + 1})`;

    if (editingContactIndex !== null) {
      const updated = [...contactsList];
      updated[editingContactIndex] = {
        ...updated[editingContactIndex],
        name: cleanName,
        phone: cleanPhone,
        email: newContactEmail.trim() || undefined,
        role: newContactRole,
      };
      setContactsList(updated);
      setEditingContactIndex(null);
    } else {
      const newItem: CustomerContactItem = {
        id: `c-item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name: cleanName,
        phone: cleanPhone,
        email: newContactEmail.trim() || undefined,
        role: newContactRole,
        isPrimary: contactsList.length === 0,
      };
      setContactsList([...contactsList, newItem]);
    }

    setNewContactName('');
    setNewContactPhone('+254 ');
    setNewContactEmail('');
    setNewContactRole('Alternative');
    setShowAddContactForm(false);
  };

  const handleStartEditContactItem = (idx: number) => {
    const item = contactsList[idx];
    setEditingContactIndex(idx);
    setNewContactName(item.name || '');
    setNewContactPhone(item.phone || '+254 ');
    setNewContactEmail(item.email || '');
    setNewContactRole(item.role || 'Alternative');
    setShowAddContactForm(true);
  };

  const handleDeleteContactItem = (idx: number) => {
    const item = contactsList[idx];
    const updated = contactsList.filter((_, i) => i !== idx);
    if (item.isPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
      setPhone(updated[0].phone);
    }
    setContactsList(updated);
    if (editingContactIndex === idx) {
      setEditingContactIndex(null);
      setShowAddContactForm(false);
    }
  };

  const handleSetPrimaryContactItem = (idx: number) => {
    const updated = contactsList.map((item, i) => ({
      ...item,
      isPrimary: i === idx,
    }));
    setContactsList(updated);
    setPhone(updated[idx].phone);
    if (updated[idx].email) setEmail(updated[idx].email);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; phone?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Customer name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const primaryItem = contactsList.find((c) => c.isPrimary);
    const mainPhone = phone.trim() || (primaryItem ? primaryItem.phone : 'N/A');

    const updatedCustomer: Customer = {
      id: customer ? customer.id : `cust-${Date.now()}`,
      name: name.trim(),
      phone: mainPhone,
      email: email.trim() || (primaryItem?.email || undefined),
      address: address.trim() || undefined,
      kraPin: kraPin.trim() ? kraPin.trim().toUpperCase() : undefined,
      creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
      customerType,
      notes: notes.trim() || undefined,
      contactsList: contactsList.length > 0 ? contactsList : undefined,
      totalPurchases: customer ? customer.totalPurchases : 0,
      currentBalanceDue: customer ? customer.currentBalanceDue : 0,
      updatedAt: new Date().toISOString().slice(0, 10),
      createdAt: customer?.createdAt || new Date().toISOString().slice(0, 10),
    };

    onSave(updatedCustomer);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100">
                {customer ? 'Edit Customer Profile' : 'Add New Customer'}
              </h3>
              <p className="text-xs text-slate-400">
                Manage contact details, credit terms, and KRA tax compliance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden file input for contacts file */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".vcf,.vcard,.csv,.txt,text/vcard,text/csv,text/plain"
          onChange={handleVcfSingleContactUpload}
          className="hidden"
        />

        {/* Quick Phonebook Contact Picker Banner */}
        <div className="mt-4 p-3 bg-sky-950/40 border border-sky-900/60 rounded-2xl space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-[11px] text-slate-300">
                Have this customer in your phone contacts?
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handlePickFromPhonebook}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 active:scale-95 cursor-pointer"
                title="Auto-fill name, phone, email, and address from phone contacts file (.vcf / .csv) or phone book"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>📱 Phone Contacts / File</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPasteBox(!showPasteBox)}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition flex items-center justify-center gap-1 cursor-pointer"
                title="Paste name and phone number from clipboard"
              >
                <Clipboard className="w-3.5 h-3.5 text-sky-400" />
                <span>📋 Paste Info</span>
              </button>
            </div>
          </div>

          {/* Quick Paste Inline Box */}
          {showPasteBox && (
            <div className="pt-2 border-t border-sky-900/40 space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Paste here: e.g. John Kamau 0712345678 john@gmail.com"
                  value={pasteInput}
                  onChange={(e) => setPasteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickPasteSubmit();
                    }
                  }}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleQuickPasteSubmit}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition"
                >
                  Auto-Fill
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasteBox(false)}
                  className="px-2 py-1.5 bg-slate-800 text-slate-400 hover:text-slate-200 text-xs rounded-xl"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                💡 Tip: Copy any contact from WhatsApp, SMS, or Phone Contacts and paste here to auto-fill.
              </p>
            </div>
          )}
        </div>

        {phonebookNotice && (
          <div className="mt-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-900 px-3 py-2 rounded-xl flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{phonebookNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Full Name & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1">
                Customer Name / Business <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Robert Chen or Acme Enterprises"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition"
                />
              </div>
              {errors.name && <p className="text-rose-400 text-[10px] mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Customer Category</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-slate-100 outline-none transition"
              >
                <option value="Individual">Individual</option>
                <option value="VIP">VIP Client (5% Off)</option>
                <option value="Wholesaler">Wholesaler</option>
                <option value="Corporate">Corporate / B2B</option>
              </select>
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Primary Phone Number (WhatsApp / M-Pesa)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 7XX XXX XXX"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl pl-9 pr-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl pl-9 pr-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Contacts & Numbers List (contactsList) Management Card */}
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-slate-200 text-xs">
                  Contacts & Alternative Numbers List
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {contactsList.length}
                </span>
              </div>
              {!showAddContactForm && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingContactIndex(null);
                    setNewContactName('');
                    setNewContactPhone('+254 ');
                    setNewContactEmail('');
                    setNewContactRole('Alternative');
                    setShowAddContactForm(true);
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700/80 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Phone / Contact</span>
                </button>
              )}
            </div>

            {/* List of contacts */}
            {contactsList.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto divide-y divide-slate-800/60">
                {contactsList.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className={`pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs py-1 px-1.5 rounded-lg transition ${
                      item.isPrimary ? 'bg-sky-950/20' : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryContactItem(idx)}
                        title={item.isPrimary ? 'Primary Default Phone' : 'Click to make Primary Phone'}
                        className={`p-1 rounded transition shrink-0 cursor-pointer ${
                          item.isPrimary ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${item.isPrimary ? 'fill-amber-400' : ''}`} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-semibold text-slate-200 text-[11px] truncate">
                            {item.name}
                          </span>
                          {item.isPrimary && (
                            <span className="text-[9px] font-black uppercase text-sky-400">
                              (Primary)
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-normal">
                            • {item.role || 'Alt'}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-2">
                          <span>{item.phone}</span>
                          {item.email && <span className="text-slate-500 font-sans text-[10px] truncate">{item.email}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditContactItem(idx)}
                        title="Edit this Contact"
                        className="p-1 bg-slate-900 hover:bg-slate-800 text-sky-400 rounded-lg transition cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteContactItem(idx)}
                        title="Delete this Contact"
                        className="p-1 bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Inline Add / Edit Form */}
            {showAddContactForm && (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800/80 space-y-2.5 pt-2 text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span>{editingContactIndex !== null ? 'Edit Contact' : 'New Contact Item'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddContactForm(false);
                      setEditingContactIndex(null);
                    }}
                    className="text-slate-500 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="Label/Name (e.g. Branch Phone)"
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs focus:border-sky-500 outline-none"
                  />
                  <input
                    type="text"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="Phone (+254 7...)"
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs font-mono focus:border-sky-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    placeholder="Email (optional)"
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs focus:border-sky-500 outline-none"
                  />
                  <select
                    value={newContactRole}
                    onChange={(e) => setNewContactRole(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:border-sky-500 outline-none cursor-pointer"
                  >
                    <option value="Alternative">Alternative Cell</option>
                    <option value="WhatsApp Direct">WhatsApp Direct</option>
                    <option value="Procurement">Procurement Agent</option>
                    <option value="Finance">Finance / Billing</option>
                    <option value="Branch Delivery">Branch Delivery</option>
                    <option value="Primary">Primary Phone</option>
                  </select>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveContactItem}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingContactIndex !== null ? 'Save Contact' : 'Add to List'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Physical Address / Delivery Location & KRA PIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Physical Address / Delivery Area
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Westlands, Rhapta Road, Nairobi"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl pl-9 pr-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                KRA Tax PIN (For B2B / Invoicing)
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={kraPin}
                  onChange={(e) => setKraPin(e.target.value)}
                  placeholder="e.g. A009182736K"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl pl-9 pr-3 py-2 text-slate-100 placeholder-slate-500 outline-none uppercase font-mono transition"
                />
              </div>
            </div>
          </div>

          {/* Credit Limit */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Credit Limit (Maximum Allowed Debt) in KSh
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="number"
                min="0"
                step="500"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="e.g. 20000 (Leave blank for standard)"
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl pl-9 pr-3 py-2 text-slate-100 placeholder-slate-500 outline-none font-mono transition"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              POS sales will alert the cashier if new credit purchases exceed this ceiling.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Internal Notes & Preferences</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Prefers M-Pesa statements sent on Fridays, likes Turkish suits..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition font-bold shadow-lg shadow-sky-600/20"
            >
              {customer ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
