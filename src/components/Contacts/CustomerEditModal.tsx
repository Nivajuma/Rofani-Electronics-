import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, FileText, CreditCard, ShieldCheck } from 'lucide-react';
import { Customer } from '../../types';

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
    } else {
      setName('');
      setPhone('+254 ');
      setEmail('');
      setAddress('');
      setKraPin('');
      setCreditLimit('');
      setCustomerType('Individual');
      setNotes('');
    }
    setErrors({});
  }, [customer, isOpen]);

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

    const updatedCustomer: Customer = {
      id: customer ? customer.id : `cust-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim() || 'N/A',
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      kraPin: kraPin.trim() ? kraPin.trim().toUpperCase() : undefined,
      creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
      customerType,
      notes: notes.trim() || undefined,
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
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
                Phone Number (WhatsApp / M-Pesa)
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
