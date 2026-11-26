import React, { useEffect, useMemo, useState } from 'react';
import { X, MessageSquareWarning, CheckCircle2 } from 'lucide-react';
import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  Customer,
  CustomerComplaint,
  Product,
  Transaction,
  User,
} from '../../types';

interface CustomerComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  complaintToEdit?: CustomerComplaint | null;
  transactions: Transaction[];
  products: Product[];
  currentUser: User;
  onSaveComplaint: (complaint: CustomerComplaint) => void;
}

const CATEGORIES: ComplaintCategory[] = [
  'Product Quality / Defect',
  'Wrong / Missing Item',
  'Pricing / Billing',
  'Delivery / Service',
  'Warranty / Return',
  'Other',
];

export const CustomerComplaintModal: React.FC<CustomerComplaintModalProps> = ({
  isOpen,
  onClose,
  customer,
  complaintToEdit,
  transactions,
  products,
  currentUser,
  onSaveComplaint,
}) => {
  const [category, setCategory] = useState<ComplaintCategory>('Product Quality / Defect');
  const [priority, setPriority] = useState<ComplaintPriority>('Medium');
  const [status, setStatus] = useState<ComplaintStatus>('Open');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [linkedTransactionId, setLinkedTransactionId] = useState('');
  const [productId, setProductId] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const customerTxs = useMemo(() => {
    if (!customer) return [];
    return transactions.filter(
      (t) =>
        (t.customerId && t.customerId === customer.id) ||
        (t.customerName && t.customerName.toLowerCase() === customer.name.toLowerCase())
    );
  }, [customer, transactions]);

  useEffect(() => {
    if (!isOpen) return;
    if (complaintToEdit) {
      setCategory(complaintToEdit.category);
      setPriority(complaintToEdit.priority);
      setStatus(complaintToEdit.status);
      setSubject(complaintToEdit.subject);
      setDescription(complaintToEdit.description);
      setLinkedTransactionId(complaintToEdit.linkedTransactionId || '');
      setProductId(complaintToEdit.productId || '');
      setResolutionNotes(complaintToEdit.resolutionNotes || '');
    } else {
      setCategory('Product Quality / Defect');
      setPriority('Medium');
      setStatus('Open');
      setSubject('');
      setDescription('');
      setLinkedTransactionId('');
      setProductId('');
      setResolutionNotes('');
    }
  }, [isOpen, complaintToEdit]);

  if (!isOpen || !customer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    const nowIso = new Date().toISOString();
    const linkedTx = customerTxs.find((t) => t.id === linkedTransactionId);
    const linkedProd = products.find((p) => p.id === productId);

    const record: CustomerComplaint = {
      id: complaintToEdit?.id || `cmp-${Date.now()}`,
      complaintNumber:
        complaintToEdit?.complaintNumber || `CMP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone !== 'N/A' ? customer.phone : undefined,
      linkedTransactionId: linkedTx?.id || complaintToEdit?.linkedTransactionId,
      linkedReceiptNumber: linkedTx?.receiptNumber || complaintToEdit?.linkedReceiptNumber,
      productId: linkedProd?.id || complaintToEdit?.productId,
      productName: linkedProd?.name || complaintToEdit?.productName,
      category,
      priority,
      status,
      subject: subject.trim(),
      description: description.trim(),
      resolutionNotes: resolutionNotes.trim() || undefined,
      resolvedAt: status === 'Resolved' ? complaintToEdit?.resolvedAt || nowIso : undefined,
      resolvedBy: status === 'Resolved' ? complaintToEdit?.resolvedBy || currentUser.name : undefined,
      assignedTo: complaintToEdit?.assignedTo || currentUser.name,
      createdBy: complaintToEdit?.createdBy || currentUser.name,
      createdAt: complaintToEdit?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    onSaveComplaint(record);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <MessageSquareWarning className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                {complaintToEdit ? `Update Complaint ${complaintToEdit.complaintNumber}` : 'Log Customer Complaint'}
              </h3>
              <p className="text-xs text-slate-400">
                Customer: <strong className="text-slate-200">{customer.name}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-100 outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-100 outline-none"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ComplaintStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-100 outline-none"
              >
                <option value="Open">Open</option>
                <option value="In Review">In Review</option>
                <option value="Escalated">Escalated</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Linked Receipt (Optional)</label>
              <select
                value={linkedTransactionId}
                onChange={(e) => setLinkedTransactionId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-100 outline-none"
              >
                <option value="">None / General Complaint</option>
                {customerTxs.map((tx) => (
                  <option key={tx.id} value={tx.id}>
                    {tx.receiptNumber} ({new Date(tx.date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Related Product (Optional)</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-100 outline-none"
              >
                <option value="">None</option>
                {products.slice(0, 80).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Complaint Subject *</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Charger cable stopped working after 2 days"
              className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3 py-2 text-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Complaint Details *</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe issue reported by customer..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3 py-2 text-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Action Taken / Resolution Notes {status === 'Resolved' ? '*' : '(Optional)'}
            </label>
            <textarea
              rows={2}
              required={status === 'Resolved'}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g. Exchanged unit & added defective item to quarantine"
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl flex items-center gap-1.5 shadow-lg shadow-rose-600/25 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{complaintToEdit ? 'Save Complaint Update' : 'Log Complaint'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
