import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Terjadi gangguan saat memuat data.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let friendlyMessage =
        'Terjadi kendala saat memproses data aplikasi. Silakan muat ulang halaman.';
      try {
        const parsed = JSON.parse(this.state.errorMessage) as { error?: string; operationType?: string };
        if (parsed.error?.includes('permission') || parsed.error?.includes('insufficient')) {
          friendlyMessage =
            'Akses ke data cloud ditolak atau sesi login berakhir. Silakan muat ulang dan pastikan Anda masuk dengan akun Google yang benar.';
        }
      } catch {
        // Keep friendly fallback
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-white">
              Gangguan Sinkronisasi Data
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {friendlyMessage}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Muat Ulang Aplikasi</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
