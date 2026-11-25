import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { ArrowRight, CheckCircle2, ClipboardCheck, FileText, Scale } from 'lucide-react';
import { auth, googleProvider } from '@/src/firebase';
import { VISUAL_GUIDES } from '@/src/data/inspectionCatalog';
import { PWAInstallButton } from '@/src/components/PWAInstallButton';

export const AuthGate: React.FC = () => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Gagal masuk dengan Google.';
      if (msg.includes('popup-closed-by-user')) {
        setAuthError('Jendela login ditutup sebelum selesai. Silakan coba lagi.');
      } else {
        setAuthError('Tidak dapat menyelesaikan proses masuk Google. Pastikan pop-up browser diizinkan.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-5">
        <span className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
          OtoSkor
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <PWAInstallButton />
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-10 px-6 pb-16 pt-4 lg:grid-cols-12 lg:pt-10">
        <div className="flex flex-col justify-center lg:col-span-6">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
            Inspeksi Mobil Bekas Profesional
          </p>
          <h1 className="mt-2 max-w-xl font-display text-3xl font-bold tracking-tight text-slate-900 text-balance sm:text-4xl lg:text-5xl dark:text-white">
            Catat kondisi, cek legalitas, dan tentukan mobil terbaik dengan skor objektif.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Simpan foto dokumen legal beberapa unit kandidat, isi checklist inspeksi 7 kategori lengkap dengan panduan visual kondisi baik vs. rusak siap pakai offline, catat riwayat servis, dan bandingkan skor fisik serta rasio harga pasar.
          </p>

          <div className="mt-8 space-y-3.5 border-t border-slate-200 pt-6 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <strong className="font-semibold text-slate-900 dark:text-white">Arsip Legal & Penjual:</strong> Foto STNK, BPKB, Faktur, harga jual, lokasi, dan kontak pemilik tersinkron aman.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <strong className="font-semibold text-slate-900 dark:text-white">Panduan Visual Offline:</strong> Contoh foto kondisi baik vs. tanda kerusakan pada setiap bagian yang diperiksa.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Scale className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <strong className="font-semibold text-slate-900 dark:text-white">Skor Ganda:</strong> Skor Fisik Total (0–100) plus Skor Rasio Harga Pasar setelah dikurangi estimasi perbaikan.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={isSigningIn}
              className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <span>{isSigningIn ? 'Menghubungkan akun...' : 'Masuk dengan Google'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Data tersinkron otomatis lintas ponsel dan desktop
            </span>
          </div>

          {authError && (
            <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-400" role="alert">
              {authError}
            </p>
          )}
        </div>

        <div className="lg:col-span-6">
          <div className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Contoh Panduan Visual Bawaan
                  </p>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    {VISUAL_GUIDES.chassis.title}
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Siap Offline
                </span>
              </div>
            </div>

            <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800">
              <img
                src={VISUAL_GUIDES.chassis.imageUrl}
                alt="Perbandingan visual kondisi apron rangka baik vs bekas tabrak"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 grid grid-cols-2 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-transparent px-4 pb-3 pt-10 text-xs font-semibold text-white">
                <span className="text-emerald-300">Kiri: Kondisi Baik (Asli Pabrik)</span>
                <span className="text-right text-red-300">Kanan: Tanda Bekas Tabrak</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Yang Harus Dicari
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {VISUAL_GUIDES.chassis.goodSigns[0]}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                  Tanda Peringatan
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {VISUAL_GUIDES.chassis.badSigns[0]}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
