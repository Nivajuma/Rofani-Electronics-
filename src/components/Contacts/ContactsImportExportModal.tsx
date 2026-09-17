import React, { useState } from 'react';
import { X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Users, Building2 } from 'lucide-react';
import { Customer, Supplier } from '../../types';

interface ContactsImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'customers' | 'suppliers';
  customers: Customer[];
  suppliers: Supplier[];
  onImportCustomers: (newCustomers: Customer[]) => void;
  onImportSuppliers: (newSuppliers: Supplier[]) => void;
}

export const ContactsImportExportModal: React.FC<ContactsImportExportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  customers,
  suppliers,
  onImportCustomers,
  onImportSuppliers,
}) => {
  const [csvText, setCsvText] = useState('');
  const [importSummary, setImportSummary] = useState<{ count: number; sample: string[] } | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isCust = targetType === 'customers';

  // Sample CSV template generator
  const getSampleTemplate = () => {
    if (isCust) {
      return `Name,Phone,Email,Address,KRA_PIN,Credit_Limit,Customer_Type,Notes\nJane Doe,+254 712 345678,jane@example.com,Nairobi Kilimani,A009182736K,20000,VIP,Preferred shopper\nAcme Ltd,+254 722 111222,orders@acme.co.ke,Industrial Area,P051234567X,50000,Corporate,Wholesale orders`;
    } else {
      return `Company_Name,Contact_Person,Phone,Email,Address,KRA_PIN,Payment_Terms,Bank_Details,Category,Notes\nNairobi Tech Hub,Kevin Omondi,+254 722 333444,sales@techhub.co.ke,CBD Kimathi St,P059998881A,Net 30 Days,Equity Bank #018029384,Electronics,Deliveries on Wed`;
    }
  };

  const handleDownloadSample = () => {
    const csvContent = getSampleTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${targetType}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFullCSV = () => {
    let csv = '';
    if (isCust) {
      csv = 'Name,Phone,Email,Address,KRA_PIN,Credit_Limit,Total_Purchases,Balance_Due,Customer_Type,Notes\n';
      customers.forEach((c) => {
        csv += `"${c.name}","${c.phone}","${c.email || ''}","${c.address || ''}","${c.kraPin || ''}",${c.creditLimit || 0},${c.totalPurchases},${c.currentBalanceDue},"${c.customerType || 'Individual'}","${(c.notes || '').replace(/"/g, '""')}"\n`;
      });
    } else {
      csv = 'Company_Name,Contact_Person,Phone,Email,Address,KRA_PIN,Payment_Terms,Total_Supplied,Balance_Due,Bank_Details,Category,Notes\n';
      suppliers.forEach((s) => {
        csv += `"${s.name}","${s.contactPerson}","${s.phone}","${s.email}","${s.address}","${s.kraPin || ''}","${s.paymentTerms || ''}",${s.totalSuppliedValue},${s.currentBalanceDue || 0},"${(s.bankDetails || '').replace(/"/g, '""')}","${s.categorySpecialty || ''}","${(s.notes || '').replace(/"/g, '""')}"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${targetType}_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvText(text);
      parsePreview(text);
    };
    reader.readAsText(file);
  };

  const parsePreview = (raw: string) => {
    try {
      const lines = raw.trim().split('\n').filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        setError('CSV file appears to be empty or has only header row.');
        setImportSummary(null);
        return;
      }

      const rowsCount = lines.length - 1;
      const sampleNames = lines.slice(1, 4).map((l) => l.split(',')[0].replace(/"/g, ''));
      setImportSummary({ count: rowsCount, sample: sampleNames });
      setError('');
    } catch (err) {
      setError('Could not parse CSV content. Please check format.');
    }
  };

  const handleExecuteImport = () => {
    if (!csvText.trim()) {
      setError('Please paste CSV text or select a file first.');
      return;
    }

    const lines = csvText.trim().split('\n').filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      setError('CSV requires at least one data row.');
      return;
    }

    // Parse simple CSV rows
    const dataRows = lines.slice(1);
    if (isCust) {
      const parsedCustomers: Customer[] = [];
      dataRows.forEach((line, idx) => {
        const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        if (parts[0]) {
          parsedCustomers.push({
            id: `cust-imp-${Date.now()}-${idx}`,
            name: parts[0],
            phone: parts[1] || 'N/A',
            email: parts[2] || undefined,
            address: parts[3] || undefined,
            kraPin: parts[4] || undefined,
            creditLimit: parts[5] ? parseFloat(parts[5]) : undefined,
            totalPurchases: 0,
            currentBalanceDue: 0,
            customerType: (parts[6] as any) || 'Individual',
            notes: parts[7] || undefined,
            createdAt: new Date().toISOString().slice(0, 10),
          });
        }
      });

      if (parsedCustomers.length === 0) {
        setError('No valid customer records could be extracted.');
        return;
      }

      onImportCustomers(parsedCustomers);
      alert(`Successfully imported ${parsedCustomers.length} customers!`);
      onClose();
    } else {
      const parsedSuppliers: Supplier[] = [];
      dataRows.forEach((line, idx) => {
        const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        if (parts[0]) {
          parsedSuppliers.push({
            id: `sup-imp-${Date.now()}-${idx}`,
            name: parts[0],
            contactPerson: parts[1] || 'Sales Rep',
            phone: parts[2] || 'N/A',
            email: parts[3] || 'info@supplier.co.ke',
            address: parts[4] || 'Nairobi, Kenya',
            kraPin: parts[5] || undefined,
            paymentTerms: parts[6] || 'Net 30 Days',
            bankDetails: parts[7] || undefined,
            totalSuppliedValue: 0,
            currentBalanceDue: 0,
            categorySpecialty: parts[8] || undefined,
            notes: parts[9] || undefined,
            createdAt: new Date().toISOString().slice(0, 10),
          });
        }
      });

      if (parsedSuppliers.length === 0) {
        setError('No valid supplier records could be extracted.');
        return;
      }

      onImportSuppliers(parsedSuppliers);
      alert(`Successfully imported ${parsedSuppliers.length} suppliers!`);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100">
                Bulk Import & Export ({isCust ? 'Customers' : 'Suppliers'})
              </h3>
              <p className="text-xs text-slate-400">
                Sync directories using standard Excel / CSV spreadsheets
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

        <div className="mt-5 space-y-4 text-xs">
          {/* Quick Export Cards */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportFullCSV}
              className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl text-left transition flex items-center gap-3"
            >
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-200 block">Export to CSV</span>
                <span className="text-[10px] text-slate-400">Download current data ({isCust ? customers.length : suppliers.length} records)</span>
              </div>
            </button>

            <button
              onClick={handleDownloadSample}
              className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl text-left transition flex items-center gap-3"
            >
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-200 block">Sample Template</span>
                <span className="text-[10px] text-slate-400">Download clean import template</span>
              </div>
            </button>
          </div>

          {/* Import Upload Section */}
          <div className="pt-2">
            <label className="block text-slate-300 font-semibold mb-1.5">
              Upload CSV File or Paste Raw CSV Text
            </label>
            <div className="border-2 border-dashed border-slate-800 hover:border-sky-500/50 rounded-2xl p-4 text-center transition bg-slate-950/60">
              <Upload className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
              />
            </div>
          </div>

          <div>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                parsePreview(e.target.value);
              }}
              placeholder="Or paste CSV rows directly here..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl p-3 text-slate-100 font-mono text-[11px] placeholder-slate-600 outline-none transition"
            />
          </div>

          {error && <p className="text-rose-400 text-[11px] font-semibold">{error}</p>}

          {importSummary && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 flex items-center justify-between">
              <div>
                <span className="font-bold block">
                  Found {importSummary.count} valid row{importSummary.count > 1 ? 's' : ''} to import
                </span>
                <span className="text-[10px] text-emerald-400/80">
                  Sample: {importSummary.sample.join(', ')}...
                </span>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition font-bold shadow-lg shadow-sky-600/20"
            >
              Import {isCust ? 'Customers' : 'Suppliers'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
