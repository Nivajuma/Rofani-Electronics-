import React, { useState, useEffect } from 'react';
import { X, Building2, Phone, Mail, MapPin, FileText, CreditCard, Layers } from 'lucide-react';
import { Supplier } from '../../types';

interface SupplierEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onSave: (supplier: Supplier) => void;
}

export const SupplierEditModal: React.FC<SupplierEditModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [kraPin, setKraPin] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [bankDetails, setBankDetails] = useState('');
  const [categorySpecialty, setCategorySpecialty] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  useEffect(() => {
    if (supplier) {
      setName(supplier.name || '');
      setContactPerson(supplier.contactPerson || '');
      setPhone(supplier.phone || '');
      setEmail(supplier.email || '');
      setAddress(supplier.address || '');
      setKraPin(supplier.kraPin || '');
      setPaymentTerms(supplier.paymentTerms || 'Net 30 Days');
      setBankDetails(supplier.bankDetails || '');
      setCategorySpecialty(supplier.categorySpecialty || '');
      setNotes(supplier.notes || '');
    } else {
      setName('');
      setContactPerson('');
      setPhone('+254 ');
      setEmail('');
      setAddress('');
      setKraPin('');
      setPaymentTerms('Net 30 Days');
      setBankDetails('');
      setCategorySpecialty('');
      setNotes('');
    }
    setErrors({});
  }, [supplier, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; phone?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Supplier company name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const updatedSupplier: Supplier = {
      id: supplier ? supplier.id : `sup-${Date.now()}`,
      name: name.trim(),
      contactPerson: contactPerson.trim() || 'General Sales',
      phone: phone.trim() || 'N/A',
      email: email.trim() || 'info@supplier.co.ke',
      address: address.trim() || 'Nairobi, Kenya',
      totalSuppliedValue: supplier ? supplier.totalSuppliedValue : 0,
      currentBalanceDue: supplier ? supplier.currentBalanceDue : 0,
      kraPin: kraPin.trim() ? kraPin.trim().toUpperCase() : undefined,
      paymentTerms: paymentTerms.trim(),
      bankDetails: bankDetails.trim() || undefined,
      categorySpecialty: categorySpecialty.trim() || undefined,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString().slice(0, 10),
      createdAt: supplier?.createdAt || new Date().toISOString().slice(0, 10),
    };

    onSave(updatedSupplier);
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
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100">
                {supplier ? 'Edit Supplier Profile' : 'Add New Supplier / Vendor'}
              </h3>
              <p className="text-xs text-slate-400">
                Configure vendor accounts, procurement terms, and banking details
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
          {/* Company Name & Contact Person */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Company / Supplier Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apex Electronics Nairobi"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition"
              />
              {errors.name && <p className="text-rose-400 text-[10px] mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Contact Person / Agent</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Michael Green (Account Manager)"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition"
              />
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Phone Number (Order Desk)</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 7XX XXX XXX"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-slate-100 placeholder-slate-500 outline-none font-mono transition"
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
                  placeholder="orders@supplier.co.ke"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Physical Address & KRA Tax PIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Warehouse / Office Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Luthuli Avenue, Nairobi CBD"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                KRA Tax PIN (VAT / E-TIMS)
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={kraPin}
                  onChange={(e) => setKraPin(e.target.value)}
                  placeholder="e.g. P051234567X"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-slate-100 placeholder-slate-500 outline-none uppercase font-mono transition"
                />
              </div>
            </div>
          </div>

          {/* Payment Terms & Category Specialty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Payment Credit Terms</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-100 outline-none transition"
              >
                <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                <option value="Net 7 Days">Net 7 Days</option>
                <option value="Net 14 Days">Net 14 Days</option>
                <option value="Net 15 Days">Net 15 Days</option>
                <option value="Net 30 Days">Net 30 Days</option>
                <option value="Net 60 Days">Net 60 Days</option>
                <option value="100% Advance Payment">100% Advance Payment</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Category / Specialty Line</label>
              <div className="relative">
                <Layers className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={categorySpecialty}
                  onChange={(e) => setCategorySpecialty(e.target.value)}
                  placeholder="e.g. Audio, Cables & Power Banks"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Banking / M-Pesa Remittance Info */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Bank Account / M-Pesa Paybill / Till Details
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                placeholder="e.g. Equity Bank - Acc #0180293847291 (Paybill 247247 Acc 0180293)"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Notes & Procurement Details</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Minimum order size is 20 units, delivers on Tuesdays..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition resize-none"
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
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition font-bold shadow-lg shadow-indigo-600/20"
            >
              {supplier ? 'Save Supplier' : 'Register Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
