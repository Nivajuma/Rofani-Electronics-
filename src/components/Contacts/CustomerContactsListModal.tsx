import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Copy,
  MessageCircle,
  Smartphone,
  Star,
  Users,
  Check,
  Save,
  Tag
} from 'lucide-react';
import { Customer, CustomerContactItem } from '../../types';
import {
  isContactPickerSupported,
  pickFromDevicePhonebook,
  parseContactFile,
} from '../../utils/phoneContacts';

interface CustomerContactsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSaveCustomer: (updatedCustomer: Customer) => void;
}

export const CustomerContactsListModal: React.FC<CustomerContactsListModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSaveCustomer,
}) => {
  const [contacts, setContacts] = useState<CustomerContactItem[]>([]);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  // Form state for editing or adding
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('+254 ');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('Alternative');
  const [formIsPrimary, setFormIsPrimary] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load customer contacts on open
  useEffect(() => {
    if (customer && isOpen) {
      let list = customer.contactsList ? [...customer.contactsList] : [];
      // If customer has no contactsList yet, seed it with their primary contact if they have a phone
      if (list.length === 0 && customer.phone && customer.phone !== 'N/A') {
        list = [
          {
            id: `c-primary-${Date.now()}`,
            name: `${customer.name} (Primary)`,
            phone: customer.phone,
            email: customer.email,
            role: 'Primary',
            isPrimary: true,
          },
        ];
      }
      setContacts(list);
      resetForm();
      setNotice(null);
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const resetForm = () => {
    setEditingContactId(null);
    setFormName('');
    setFormPhone('+254 ');
    setFormEmail('');
    setFormRole('Alternative');
    setFormIsPrimary(false);
    setFormError('');
  };

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotice({ message, type });
    setTimeout(() => {
      setNotice(null);
    }, 4000);
  };

  const handleStartEdit = (item: CustomerContactItem) => {
    setEditingContactId(item.id);
    setFormName(item.name || '');
    setFormPhone(item.phone || '');
    setFormEmail(item.email || '');
    setFormRole(item.role || 'Alternative');
    setFormIsPrimary(Boolean(item.isPrimary));
    setFormError('');
  };

  const handleDeleteContact = (contactId: string) => {
    const target = contacts.find((c) => c.id === contactId);
    if (!target) return;

    if (contacts.length <= 1) {
      const confirmSingle = window.confirm(
        `"${target.name || target.phone}" is the only contact for this customer. Remove it anyway?`
      );
      if (!confirmSingle) return;
    }

    const updated = contacts.filter((c) => c.id !== contactId);
    
    // If we deleted the primary contact and have others remaining, make the first one primary
    if (target.isPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
    }

    setContacts(updated);
    if (editingContactId === contactId) {
      resetForm();
    }

    // Persist to customer
    saveUpdatedContacts(updated);
    showNotification(`Contact removed from ${customer.name}'s contacts list.`, 'info');
  };

  const handleSetPrimary = (contactId: string) => {
    const updated = contacts.map((c) => ({
      ...c,
      isPrimary: c.id === contactId,
    }));
    setContacts(updated);
    saveUpdatedContacts(updated);
    const prim = updated.find((c) => c.id === contactId);
    showNotification(`"${prim?.name || prim?.phone}" set as primary contact phone.`);
  };

  const handleSaveContactForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanPhone = formPhone.trim();
    if (!cleanPhone || cleanPhone === '+254') {
      setFormError('Phone number is required');
      return;
    }

    const cleanName = formName.trim() || `${customer.name} (Contact ${contacts.length + 1})`;

    let updatedList: CustomerContactItem[];

    if (editingContactId) {
      // Update existing contact
      updatedList = contacts.map((item) => {
        if (item.id === editingContactId) {
          return {
            ...item,
            name: cleanName,
            phone: cleanPhone,
            email: formEmail.trim() || undefined,
            role: formRole.trim() || 'Alternative',
            isPrimary: formIsPrimary,
          };
        }
        // If current edit made this primary, demote other primaries
        if (formIsPrimary) {
          return { ...item, isPrimary: false };
        }
        return item;
      });
      showNotification(`Updated contact "${cleanName}"!`);
    } else {
      // Add new contact
      const newContact: CustomerContactItem = {
        id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanName,
        phone: cleanPhone,
        email: formEmail.trim() || undefined,
        role: formRole.trim() || 'Alternative',
        isPrimary: formIsPrimary || contacts.length === 0,
      };

      if (formIsPrimary) {
        updatedList = [
          newContact,
          ...contacts.map((c) => ({ ...c, isPrimary: false })),
        ];
      } else {
        updatedList = [...contacts, newContact];
      }
      showNotification(`Added new contact "${cleanName}" to customer profile!`);
    }

    setContacts(updatedList);
    saveUpdatedContacts(updatedList);
    resetForm();
  };

  const saveUpdatedContacts = (newContactsList: CustomerContactItem[]) => {
    // Find primary contact
    const primary = newContactsList.find((c) => c.isPrimary) || newContactsList[0];
    const updatedCustomer: Customer = {
      ...customer,
      phone: primary ? primary.phone : (customer.phone || 'N/A'),
      email: primary?.email ? primary.email : customer.email,
      contactsList: newContactsList,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    onSaveCustomer(updatedCustomer);
  };

  const handleCopyPhone = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsApp = (phone: string, contactName: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`Hello ${contactName}, contacting you from ROFANI Electronics & Boutique regarding your customer account.`);
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
  };

  // Import from Device Phonebook or VCF file directly into contactsList
  const handleImportDirectly = async () => {
    if (isContactPickerSupported()) {
      try {
        const picked = await pickFromDevicePhonebook(true);
        if (picked.length > 0) {
          addImportedContacts(picked);
          return;
        }
      } catch {
        // Fallback to file picker
        fileInputRef.current?.click();
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseContactFile(text);
      if (parsed.length > 0) {
        addImportedContacts(parsed);
      } else {
        showNotification('No valid contacts found in the file.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addImportedContacts = (items: { name: string; phone: string; email?: string }[]) => {
    const newItems: CustomerContactItem[] = items.map((item, idx) => ({
      id: `imported-${Date.now()}-${idx}`,
      name: item.name || `${customer.name} (Alt)`,
      phone: item.phone,
      email: item.email,
      role: 'Alternative',
      isPrimary: false,
    }));

    const combined = [...contacts, ...newItems];
    setContacts(combined);
    saveUpdatedContacts(combined);
    showNotification(`Imported ${newItems.length} contact(s) into ${customer.name}'s list!`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative my-6 text-slate-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-sky-600/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-100">
                  Manage Customer Contacts List
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {contacts.length} {contacts.length === 1 ? 'Contact' : 'Contacts'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Client: <strong className="text-slate-200">{customer.name}</strong> • Edit phone numbers, roles, and alternative numbers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {notice && (
          <div
            className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 shrink-0 ${
              notice.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : notice.type === 'error'
                ? 'bg-rose-950/60 border border-rose-800 text-rose-300'
                : 'bg-sky-950/60 border border-sky-800 text-sky-300'
            }`}
          >
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
        )}

        {/* Hidden File Input for .vcf / .csv import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".vcf,.vcard,.csv,.txt,text/vcard,text/csv,text/plain"
          onChange={handleFilePicked}
          className="hidden"
        />

        {/* Body content */}
        <div className="overflow-y-auto space-y-5 py-4 flex-1">
          {/* Top Quick Actions Bar */}
          <div className="flex items-center justify-between gap-2 p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-xs">
            <span className="text-slate-400 text-[11px]">
              Add secondary phones, branch managers, or alternative WhatsApp numbers:
            </span>
            <button
              type="button"
              onClick={handleImportDirectly}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title="Import numbers from phone book or file into this customer's list"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>📱 Import from Phone</span>
            </button>
          </div>

          {/* Contact List Entries */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Saved Contacts ({contacts.length})</span>
              <span className="text-slate-500 font-normal lowercase">click star to set default caller</span>
            </h4>

            {contacts.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/60 text-slate-500 text-xs">
                <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="font-semibold text-slate-300">No contacts saved for this customer yet</p>
                <p className="text-[11px] text-slate-500 mt-1">Use the form below to add their primary or secondary phone numbers.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((item) => {
                  const isEditingThis = editingContactId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.isPrimary
                          ? 'bg-sky-950/20 border-sky-800/60 ring-1 ring-sky-500/30'
                          : isEditingThis
                          ? 'bg-indigo-950/30 border-indigo-700/80'
                          : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Contact Info */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(item.id)}
                          title={item.isPrimary ? 'Primary Default Phone' : 'Click to make Primary Phone'}
                          className={`mt-0.5 p-1 rounded-lg transition shrink-0 cursor-pointer ${
                            item.isPrimary
                              ? 'text-amber-400 bg-amber-400/10'
                              : 'text-slate-600 hover:text-amber-400 hover:bg-slate-800'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${item.isPrimary ? 'fill-amber-400' : ''}`} />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-100 text-xs sm:text-sm truncate">
                              {item.name}
                            </span>
                            {item.isPrimary && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                Primary Phone
                              </span>
                            )}
                            {item.role && (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-slate-900 border border-slate-800 text-slate-400">
                                {item.role}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 flex-wrap font-mono">
                            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                              <Phone className="w-3.5 h-3.5 text-emerald-500" />
                              {item.phone}
                            </span>
                            {item.email && (
                              <span className="flex items-center gap-1.5 text-slate-400 font-sans text-[11px] truncate">
                                <Mail className="w-3.5 h-3.5 text-slate-500" />
                                {item.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(item.phone, item.id)}
                          title="Copy Phone Number"
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl transition cursor-pointer"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleWhatsApp(item.phone, item.name)}
                          title="Open in WhatsApp"
                          className="p-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 rounded-xl transition cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          title="Edit this Contact"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteContact(item.id)}
                          title="Delete this Contact"
                          className="p-1.5 bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 rounded-xl transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add / Edit Contact Form */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                {editingContactId ? (
                  <>
                    <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Edit Contact Details</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-sky-400" />
                    <span>Add New Contact / Phone Number</span>
                  </>
                )}
              </h4>
              {editingContactId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {formError && (
              <div className="text-[11px] text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2 rounded-lg flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveContactForm} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Contact Name or Label */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Contact Name / Label *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Main WhatsApp, Procurement, Jane"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+254 712 345678"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Email Address */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. contact@example.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Role / Tag */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Role / Label Category
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="Primary">Primary (Main Phone)</option>
                    <option value="Alternative">Alternative Cell / Secondary</option>
                    <option value="WhatsApp Direct">WhatsApp Direct</option>
                    <option value="Procurement">Procurement / Orders</option>
                    <option value="Finance">Finance / Billing Desk</option>
                    <option value="Branch Delivery">Branch / Delivery Contact</option>
                    <option value="Director">Director / Owner</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsPrimary}
                    onChange={(e) => setFormIsPrimary(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-[11px] text-slate-300">
                    Set as customer's default / primary phone number
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-sky-600/20 cursor-pointer"
                  >
                    {editingContactId ? (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Update Contact</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Save to Contacts List</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500">
            Changes auto-sync to customer profile and cloud database.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
