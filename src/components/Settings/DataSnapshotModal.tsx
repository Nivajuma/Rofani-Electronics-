import React, { useState } from 'react';
import {
  X,
  Download,
  Lock,
  ShieldCheck,
  FileJson,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Database,
  KeyRound,
  FileCheck,
  Sparkles,
  Upload,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { Product, Transaction, Customer, Supplier, Expense, AttendanceRecord, User, StoreLocation } from '../../types';
import {
  FullDataSnapshotPayload,
  encryptSnapshotData,
  decryptSnapshotData,
  generateConsolidatedCsvSnapshot,
  downloadSnapshotFile,
  EncryptedSnapshotEnvelope
} from '../../utils/snapshotEncryption';

interface DataSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  transactions: Transaction[];
  customers: Customer[];
  suppliers?: Supplier[];
  expenses?: Expense[];
  attendanceRecords?: AttendanceRecord[];
  allUsers?: User[];
  stores?: StoreLocation[];
  storeName?: string;
  masterPin?: string;
  onRestoreSnapshot?: (data: any) => void;
}

type ExportFormat = 'encrypted_json' | 'consolidated_csv' | 'plain_json';

export const DataSnapshotModal: React.FC<DataSnapshotModalProps> = ({
  isOpen,
  onClose,
  products,
  transactions,
  customers,
  suppliers = [],
  expenses = [],
  attendanceRecords = [],
  allUsers = [],
  stores = [],
  storeName = 'ROFANI ELECTRONICS & BOUTIQUE',
  masterPin = '1234',
  onRestoreSnapshot,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'verify'>('export');
  const [format, setFormat] = useState<ExportFormat>('encrypted_json');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Decrypt / Verification tab state
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyPassphrase, setVerifyPassphrase] = useState('');
  const [verifyResult, setVerifyResult] = useState<FullDataSnapshotPayload | null>(null);
  const [verifyError, setVerifyError] = useState('');

  if (!isOpen) return null;

  const totalRecords = products.length + transactions.length + customers.length;

  const assembleSnapshotPayload = (): FullDataSnapshotPayload => {
    return {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      metadata: {
        system: 'ROFANI Enterprise Retail POS',
        storeName,
        totalProducts: products.length,
        totalTransactions: transactions.length,
        totalCustomers: customers.length,
        totalSuppliers: suppliers.length,
        totalExpenses: expenses.length,
      },
      collections: {
        products,
        transactions,
        customers,
        suppliers,
        expenses,
        attendanceRecords,
        users: allUsers.map((u) => ({ id: u.id, name: u.name, role: u.role, email: u.email })),
        stores,
      },
    };
  };

  const handleDownloadSnapshot = async () => {
    setErrorMsg('');
    setSuccessNotice(null);

    const dateSlug = new Date().toISOString().slice(0, 10);
    const storeSlug = storeName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 15);
    const snapshot = assembleSnapshotPayload();

    setIsProcessing(true);
    try {
      if (format === 'encrypted_json') {
        if (!passphrase.trim()) {
          throw new Error('Please enter a secret passphrase or PIN to encrypt your data snapshot.');
        }
        if (passphrase !== confirmPassphrase) {
          throw new Error('The encryption passphrases do not match. Please verify your passphrase.');
        }

        const encryptedEnvelope = await encryptSnapshotData(snapshot, passphrase.trim());
        const jsonContent = JSON.stringify(encryptedEnvelope, null, 2);
        const filename = `${storeSlug}_Full_Snapshot_${dateSlug}.enc.json`;

        downloadSnapshotFile(jsonContent, filename, 'application/json');
        setSuccessNotice(`AES-256 encrypted snapshot successfully downloaded (${filename})!`);
      } else if (format === 'consolidated_csv') {
        const csvContent = generateConsolidatedCsvSnapshot(snapshot);
        const filename = `${storeSlug}_Full_Snapshot_${dateSlug}.csv`;

        downloadSnapshotFile(csvContent, filename, 'text/csv');
        setSuccessNotice(`Consolidated all-collection CSV snapshot downloaded (${filename})!`);
      } else {
        // Plain JSON
        const jsonContent = JSON.stringify(snapshot, null, 2);
        const filename = `${storeSlug}_Full_Snapshot_${dateSlug}.json`;

        downloadSnapshotFile(jsonContent, filename, 'application/json');
        setSuccessNotice(`Plain JSON snapshot downloaded (${filename})!`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate data snapshot.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVerifyFile(file);
      setVerifyResult(null);
      setVerifyError('');
    }
  };

  const handleExecuteVerification = async () => {
    setVerifyError('');
    if (!verifyFile) {
      setVerifyError('Please choose an encrypted snapshot file (.enc.json).');
      return;
    }
    if (!verifyPassphrase.trim()) {
      setVerifyError('Please enter the decryption passphrase for this snapshot.');
      return;
    }

    try {
      const text = await verifyFile.text();
      const envelope = JSON.parse(text) as EncryptedSnapshotEnvelope;

      if (envelope.format !== 'ENCRYPTED_SNAPSHOT_V1') {
        throw new Error('Unrecognized format. File is not an encrypted snapshot envelope.');
      }

      const decrypted = await decryptSnapshotData(envelope, verifyPassphrase.trim());
      setVerifyResult(decrypted);
    } catch (err: any) {
      setVerifyError(err.message || 'Decryption failed. Please check your passphrase.');
    }
  };

  const handleApplyRestore = () => {
    if (!verifyResult || !onRestoreSnapshot) return;
    if (window.confirm('Are you sure you want to restore the collections from this snapshot? Current database records will be synced with the snapshot data.')) {
      onRestoreSnapshot({
        products: verifyResult.collections.products,
        transactions: verifyResult.collections.transactions,
        customers: verifyResult.collections.customers,
        suppliers: verifyResult.collections.suppliers || [],
        expenses: verifyResult.collections.expenses || [],
      });
      alert('Data snapshot successfully restored into the system!');
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative text-slate-100 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-inner">
              <Database className="w-6 h-6 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg tracking-tight">Download Full Data Snapshot</h3>
                <span className="bg-sky-400/20 text-sky-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-sky-400/30">
                  All Collections
                </span>
              </div>
              <p className="text-xs text-sky-100 font-medium">
                Export products, transactions, and customers into a single encrypted JSON or CSV file
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-white/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 text-xs font-bold">
          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'export'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export Snapshot</span>
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'verify'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Decrypt & Verify Snapshot</span>
          </button>
        </div>

        {/* Body Container */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'export' ? (
            <>
              {/* Collection Summary Pills */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Products</span>
                  <span className="text-xl font-black text-sky-400 font-mono">{products.length}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Transactions</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">{transactions.length}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Customers</span>
                  <span className="text-xl font-black text-indigo-400 font-mono">{customers.length}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center hidden sm:block">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Records</span>
                  <span className="text-xl font-black text-amber-400 font-mono">{totalRecords}</span>
                </div>
              </div>

              {/* Format Selection Cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Select Snapshot Format:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option 1: Encrypted JSON */}
                  <div
                    onClick={() => setFormat('encrypted_json')}
                    className={`cursor-pointer p-4 rounded-2xl border-2 transition relative space-y-1.5 ${
                      format === 'encrypted_json'
                        ? 'border-sky-500 bg-sky-950/30 shadow-md shadow-sky-950'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                        <Lock className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        AES-256
                      </span>
                    </div>
                    <div className="font-bold text-xs text-slate-100">Encrypted JSON</div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Zero-knowledge AES-GCM 256-bit envelope with password protection & checksum.
                    </p>
                  </div>

                  {/* Option 2: Consolidated CSV */}
                  <div
                    onClick={() => setFormat('consolidated_csv')}
                    className={`cursor-pointer p-4 rounded-2xl border-2 transition relative space-y-1.5 ${
                      format === 'consolidated_csv'
                        ? 'border-emerald-500 bg-emerald-950/30 shadow-md shadow-emerald-950'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        .CSV
                      </span>
                    </div>
                    <div className="font-bold text-xs text-slate-100">Consolidated CSV</div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Single spreadsheet containing all collections partitioned with headers.
                    </p>
                  </div>

                  {/* Option 3: Plain JSON */}
                  <div
                    onClick={() => setFormat('plain_json')}
                    className={`cursor-pointer p-4 rounded-2xl border-2 transition relative space-y-1.5 ${
                      format === 'plain_json'
                        ? 'border-indigo-500 bg-indigo-950/30 shadow-md shadow-indigo-950'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <FileJson className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        .JSON
                      </span>
                    </div>
                    <div className="font-bold text-xs text-slate-100">Standard JSON</div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Standard unencrypted JSON database export for developers and backup scripts.
                    </p>
                  </div>
                </div>
              </div>

              {/* Encryption Passphrase Inputs (shown when encrypted_json is chosen) */}
              {format === 'encrypted_json' && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-sky-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Snapshot Encryption Key / Passphrase</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPassphrase(masterPin);
                        setConfirmPassphrase(masterPin);
                      }}
                      className="text-[10px] text-sky-400 hover:underline flex items-center gap-1 font-mono"
                    >
                      <KeyRound className="w-3 h-3" /> Autofill Store Master PIN (••••)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Enter Passphrase / Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassphrase ? 'text' : 'password'}
                          placeholder="Secret passphrase..."
                          value={passphrase}
                          onChange={(e) => {
                            setPassphrase(e.target.value);
                            setErrorMsg('');
                          }}
                          className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white pr-9 outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassphrase(!showPassphrase)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Confirm Passphrase *
                      </label>
                      <input
                        type={showPassphrase ? 'text' : 'password'}
                        placeholder="Re-enter passphrase..."
                        value={confirmPassphrase}
                        onChange={(e) => {
                          setConfirmPassphrase(e.target.value);
                          setErrorMsg('');
                        }}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    🛡️ Uses industry-standard <strong>AES-GCM 256-bit encryption</strong> with <strong>100,000 PBKDF2 iterations</strong>.
                    Store your passphrase safely; nobody can read this snapshot without your key.
                  </p>
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successNotice && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successNotice}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-execute-download-snapshot"
                  disabled={isProcessing}
                  onClick={handleDownloadSnapshot}
                  className="px-6 py-2.5 bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-500 hover:from-sky-500 hover:to-indigo-500 text-white font-extrabold rounded-xl text-xs transition shadow-lg shadow-sky-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isProcessing
                      ? 'Encrypting & Generating Snapshot...'
                      : format === 'encrypted_json'
                      ? 'Download Encrypted Snapshot (.enc.json)'
                      : format === 'consolidated_csv'
                      ? 'Download Consolidated CSV (.csv)'
                      : 'Download JSON Snapshot (.json)'}
                  </span>
                </button>
              </div>
            </>
          ) : (
            /* VERIFY / DECRYPT TAB */
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="font-bold text-xs text-sky-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify and Decrypt Snapshot File</span>
                </div>
                <p className="text-xs text-slate-400">
                  Select an encrypted snapshot file (<code>.enc.json</code>) and provide your passphrase to inspect the data and verify that the SHA-256 checksum is untampered.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Choose .enc.json Snapshot File:
                    </label>
                    <input
                      type="file"
                      accept=".json,.enc.json"
                      onChange={handleVerifyFileUpload}
                      className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Decryption Passphrase / Security PIN:
                    </label>
                    <input
                      type="password"
                      placeholder="Passphrase used when creating snapshot..."
                      value={verifyPassphrase}
                      onChange={(e) => setVerifyPassphrase(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteVerification}
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Decrypt & Verify Integrity</span>
                  </button>
                </div>
              </div>

              {verifyError && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{verifyError}</span>
                </div>
              )}

              {/* Decrypted Inspection Card */}
              {verifyResult && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-emerald-400 text-sm flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Decryption Successful & Checksum Verified!</span>
                    </span>
                    <span className="text-[10px] text-emerald-300 font-mono bg-emerald-900/60 px-2 py-0.5 rounded-full">
                      SHA-256 Matched
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-emerald-900">
                      <span className="text-[10px] text-slate-400 block font-bold">Products</span>
                      <span className="font-mono font-bold text-white text-base">
                        {verifyResult.collections.products.length}
                      </span>
                    </div>
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-emerald-900">
                      <span className="text-[10px] text-slate-400 block font-bold">Transactions</span>
                      <span className="font-mono font-bold text-white text-base">
                        {verifyResult.collections.transactions.length}
                      </span>
                    </div>
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-emerald-900">
                      <span className="text-[10px] text-slate-400 block font-bold">Customers</span>
                      <span className="font-mono font-bold text-white text-base">
                        {verifyResult.collections.customers.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-900/60">
                    <span className="text-slate-400 text-[11px]">
                      Snapshot Date: {new Date(verifyResult.exportedAt).toLocaleString()}
                    </span>
                    {onRestoreSnapshot && (
                      <button
                        type="button"
                        onClick={handleApplyRestore}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow transition flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Restore Collections From Snapshot</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
