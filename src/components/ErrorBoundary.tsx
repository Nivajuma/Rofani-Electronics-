import React, { Component } from 'react';
import { RotateCcw, RefreshCw, ShieldAlert } from 'lucide-react';
import { saveAllProductImagesToIndexedDB } from '../utils/imageStorage';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleFullReload = () => {
    window.location.reload();
  };

  private handleSafeStorageReset = () => {
    if (
      window.confirm(
        'Would you like to repair cached data and reload? Your inventory transactions and core data will be safely verified.'
      )
    ) {
      try {
        const rawProducts = localStorage.getItem('retail_pos_products');
        if (rawProducts) {
          try {
            const parsed = JSON.parse(rawProducts);
            if (Array.isArray(parsed)) {
              // Ensure images are safely stored in IndexedDB first
              saveAllProductImagesToIndexedDB(parsed);

              const cleaned = parsed.map((p: any) => ({
                ...p,
                imageUrl: p.imageUrl && p.imageUrl.length > 50000 ? '' : p.imageUrl,
              }));
              localStorage.setItem('retail_pos_products', JSON.stringify(cleaned));
            }
          } catch (e) {
            localStorage.removeItem('retail_pos_products');
          }
        }
      } catch (err) {
        console.error('Error repairing storage:', err);
      }
      window.location.reload();
    }
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-white">
                {this.props.fallbackTitle || 'Application Recovered Gracefully'}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                An unexpected interface rendering issue occurred. We have isolated the error to
                protect your sales and inventory data from corruption.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-left overflow-x-auto max-h-32 text-[11px] font-mono text-rose-300">
                {this.state.error.toString()}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Recovering View</span>
              </button>

              <button
                onClick={this.handleFullReload}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload App</span>
              </button>
            </div>

            <button
              onClick={this.handleSafeStorageReset}
              className="text-[11px] text-slate-500 hover:text-amber-400 underline underline-offset-4 transition cursor-pointer"
            >
              Repair cache & optimize storage
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
