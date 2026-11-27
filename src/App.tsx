import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  Car,
  Cpu,
  Eye,
  LogOut,
  Moon,
  Plus,
  Scale,
  Sun,
} from 'lucide-react';
import { auth } from '@/src/firebase';
import type { VisualGuideId } from '@/src/data/inspectionCatalog';
import {
  addLegalDocument,
  addServiceRecord,
  createVehicle,
  deleteLegalDocument,
  deleteServiceRecord,
  deleteVehicleCascade,
  subscribeToLegalDocs,
  subscribeToServiceRecords,
  subscribeToUserProfile,
  subscribeToVehicles,
  updateUserAiSettings,
  updateVehicleInspection,
  updateVehicleProfileAndLegal,
  upsertUserProfile,
  type VehicleFormInput,
} from '@/src/services/vehicleService';
import {
  DEFAULT_AI_PREFERENCES,
  formatAiProviderLabel,
  initializeAiSettingsForUser,
  updateLocalAiSettings,
  type ProviderTokens,
} from '@/src/services/aiSettingsService';
import type {
  ChecklistItemResponse,
  DocType,
  LegalDocument,
  ServiceRecord,
  UserAiPreferences,
  Vehicle,
  WorkshopType,
} from '@/src/types/inspection';
import { useBackHandler } from '@/src/hooks/useBackHandler';
import { AccountAiSettingsModal } from '@/src/components/AccountAiSettingsModal';
import { AuthGate } from '@/src/components/AuthGate';
import { CompareView } from '@/src/components/CompareView';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { GarageView } from '@/src/components/GarageView';
import { OfflineIndicator } from '@/src/components/OfflineIndicator';
import { PWAInstallButton } from '@/src/components/PWAInstallButton';
import { VehicleDetailWorkspace } from '@/src/components/VehicleDetailWorkspace';
import { VehicleFormModal } from '@/src/components/VehicleFormModal';
import { VisualGuideModal } from '@/src/components/VisualGuideModal';

type AppView = 'garage' | 'detail' | 'compare';

function MainApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const [legalDocs, setLegalDocs] = useState<LegalDocument[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);

  const [activeView, setActiveView] = useState<AppView>('garage');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [visualGuideId, setVisualGuideId] = useState<VisualGuideId | null>(null);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [aiPreferences, setAiPreferences] = useState<UserAiPreferences>(DEFAULT_AI_PREFERENCES);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('otoskor_theme') === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('otoskor_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('otoskor_theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        const init = initializeAiSettingsForUser(nextUser.uid);
        setAiPreferences(init.preferences);
        void upsertUserProfile(nextUser).catch((err: unknown) => {
          setFatalError(err instanceof Error ? err : new Error(String(err)));
        });
      } else {
        const init = initializeAiSettingsForUser(null);
        setAiPreferences(init.preferences);
        setVehicles([]);
        setSelectedVehicleId(null);
        setActiveView('garage');
        setVehiclesLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    const unsubProfile = subscribeToUserProfile(
      user.uid,
      (profile) => {
        if (profile?.aiSettings) {
          const synced = initializeAiSettingsForUser(user.uid, profile.aiSettings);
          setAiPreferences(synced.preferences);
        }
      },
      (err) => {
        setFatalError(err);
      }
    );
    setVehiclesLoading(true);
    const unsubVehicles = subscribeToVehicles(
      user.uid,
      (list) => {
        setVehicles(list);
        setVehiclesLoading(false);
      },
      (err) => {
        setFatalError(err);
        setVehiclesLoading(false);
      }
    );
    return () => {
      unsubProfile();
      unsubVehicles();
    };
  }, [authReady, user]);

  useEffect(() => {
    if (!user || !selectedVehicleId) {
      setLegalDocs([]);
      setServiceRecords([]);
      return;
    }

    const unsubLegal = subscribeToLegalDocs(
      user.uid,
      selectedVehicleId,
      setLegalDocs,
      (err) => setFatalError(err)
    );
    const unsubService = subscribeToServiceRecords(
      user.uid,
      selectedVehicleId,
      setServiceRecords,
      (err) => setFatalError(err)
    );

    return () => {
      unsubLegal();
      unsubService();
    };
  }, [user, selectedVehicleId]);

  if (fatalError) {
    throw fatalError;
  }

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId]
  );

  const compareVehicles = useMemo(
    () => vehicles.filter((v) => compareIds.includes(v.id)),
    [vehicles, compareIds]
  );

  const handleToggleCompare = (vehicleId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(vehicleId)) {
        return prev.filter((id) => id !== vehicleId);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), vehicleId];
      }
      return [...prev, vehicleId];
    });
  };

  useBackHandler(Boolean(user) && activeView !== 'garage', () => {
    setActiveView('garage');
  });

  const handleOpenVehicleDetail = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setActiveView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveVehicleForm = async (input: VehicleFormInput) => {
    if (!user) return;
    if (editingVehicle) {
      await updateVehicleProfileAndLegal(user.uid, editingVehicle, input);
    } else {
      const newId = await createVehicle(user.uid, input);
      setSelectedVehicleId(newId);
      setActiveView('detail');
    }
  };

  const handleDeleteSelectedVehicle = async () => {
    if (!user || !selectedVehicle) return;
    await deleteVehicleCascade(user.uid, selectedVehicle.id);
    setCompareIds((prev) => prev.filter((id) => id !== selectedVehicle.id));
    setSelectedVehicleId(null);
    setActiveView('garage');
  };

  const handleSaveInspection = async (
    responses: Record<string, ChecklistItemResponse>,
    notes: string
  ) => {
    if (!user || !selectedVehicle) return;
    await updateVehicleInspection(user.uid, selectedVehicle, responses, notes);
  };

  const handleUploadLegalDoc = async (input: {
    docType: DocType;
    title: string;
    imageDataUrl: string;
    notes: string;
  }) => {
    if (!user || !selectedVehicle) return;
    await addLegalDocument(user.uid, selectedVehicle.id, input);
  };

  const handleDeleteLegalDoc = async (docId: string) => {
    if (!user || !selectedVehicle) return;
    await deleteLegalDocument(user.uid, selectedVehicle.id, docId);
  };

  const handleAddServiceRecord = async (input: {
    serviceDate: string;
    odometerKm: number;
    workshopName: string;
    workshopType: WorkshopType;
    workDescription: string;
    cost: number;
    hasReceipt: boolean;
  }) => {
    if (!user || !selectedVehicle) return;
    await addServiceRecord(user.uid, selectedVehicle.id, input);
  };

  const handleDeleteServiceRecord = async (recordId: string) => {
    if (!user || !selectedVehicle) return;
    await deleteServiceRecord(user.uid, selectedVehicle.id, recordId);
  };

  const handleSaveAiSettings = async (
    nextPrefs: UserAiPreferences,
    tokens: ProviderTokens
  ) => {
    if (!user) return;
    const clean = updateLocalAiSettings(user.uid, nextPrefs, tokens);
    setAiPreferences(clean);
    await updateUserAiSettings(user.uid, clean);
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthGate />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900 md:pb-12 dark:bg-slate-950 dark:text-slate-100">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3 sm:px-6">
          {/* Zone 1: Wordmark */}
          <button
            type="button"
            onClick={() => setActiveView('garage')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            OtoSkor
          </button>

          {/* Zone 2: Concise Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => setActiveView('garage')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'garage'
                  ? 'text-blue-700 font-semibold underline underline-offset-4 dark:text-blue-400'
                  : ''
              }`}
            >
              Garasi Unit
            </button>
            <button
              type="button"
              onClick={() => setActiveView('compare')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'compare'
                  ? 'text-blue-700 font-semibold underline underline-offset-4 dark:text-blue-400'
                  : ''
              }`}
            >
              Bandingkan
            </button>
            <button
              type="button"
              onClick={() => setVisualGuideId('engine')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Panduan Visual
            </button>
            <button
              type="button"
              onClick={() => void signOut(auth)}
              className="hover:text-red-700 dark:hover:text-red-400 transition-colors whitespace-nowrap shrink-0"
            >
              Keluar
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingVehicle(null);
                setIsFormOpen(true);
              }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Unit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Utility Strip (below header: account info, theme switch, PWA install) */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {user.displayName || user.email}
          </span>
          <span aria-hidden="true">·</span>
          <span>Sinkronisasi Cloud Aktif</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAiSettingsOpen(true)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Cpu className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
            <span>
              AI: {formatAiProviderLabel(aiPreferences.provider)} ·{' '}
              {aiPreferences.provider === 'openai'
                ? aiPreferences.openaiModel
                : aiPreferences.provider === 'claude'
                  ? aiPreferences.claudeModel
                  : aiPreferences.provider === 'custom'
                    ? aiPreferences.customModel || 'Custom'
                    : aiPreferences.geminiModel}
            </span>
          </button>
          <PWAInstallButton />
          <button
            type="button"
            onClick={() => setIsDarkMode((prev) => !prev)}
            aria-label={isDarkMode ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => void signOut(auth)}
            aria-label="Keluar akun"
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 md:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeView === 'garage' && (
          <GarageView
            vehicles={vehicles}
            isLoading={vehiclesLoading}
            compareIds={compareIds}
            onToggleCompare={handleToggleCompare}
            onSelectVehicle={handleOpenVehicleDetail}
            onAddVehicle={() => {
              setEditingVehicle(null);
              setIsFormOpen(true);
            }}
            onOpenCompare={() => setActiveView('compare')}
          />
        )}

        {activeView === 'detail' && selectedVehicle && (
          <VehicleDetailWorkspace
            vehicle={selectedVehicle}
            legalDocs={legalDocs}
            serviceRecords={serviceRecords}
            onBack={() => setActiveView('garage')}
            onEditVehicle={() => {
              setEditingVehicle(selectedVehicle);
              setIsFormOpen(true);
            }}
            onDeleteVehicle={handleDeleteSelectedVehicle}
            onOpenVisualGuide={(guideId) => setVisualGuideId(guideId)}
            onSaveInspection={handleSaveInspection}
            onUploadLegalDoc={handleUploadLegalDoc}
            onDeleteLegalDoc={handleDeleteLegalDoc}
            onAddServiceRecord={handleAddServiceRecord}
            onDeleteServiceRecord={handleDeleteServiceRecord}
            onOpenAiSettings={() => setIsAiSettingsOpen(true)}
          />
        )}

        {activeView === 'compare' && (
          <CompareView
            vehicles={compareVehicles}
            onBack={() => setActiveView('garage')}
            onSelectVehicle={handleOpenVehicleDetail}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Thumb Zone, 64px <= 15% mobile height) */}
      <nav
        aria-label="Navigasi utama ponsel"
        className="fixed bottom-0 left-0 right-0 z-30 grid h-16 grid-cols-4 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-slate-900/95"
      >
        <button
          type="button"
          onClick={() => setActiveView('garage')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            activeView === 'garage' || activeView === 'detail'
              ? 'text-blue-700 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Car className="h-5 w-5" />
          <span>Garasi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('compare')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            activeView === 'compare'
              ? 'text-blue-700 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Scale className="h-5 w-5" />
          <span>Bandingkan</span>
        </button>

        <button
          type="button"
          onClick={() => setVisualGuideId('engine')}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400"
        >
          <Eye className="h-5 w-5" />
          <span>Panduan</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setEditingVehicle(null);
            setIsFormOpen(true);
          }}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-400"
        >
          <Plus className="h-5 w-5" />
          <span>Tambah</span>
        </button>
      </nav>

      {/* Modals */}
      <VehicleFormModal
        isOpen={isFormOpen}
        editingVehicle={editingVehicle}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSaveVehicleForm}
        onOpenAiSettings={() => setIsAiSettingsOpen(true)}
      />

      <VisualGuideModal
        initialGuideId={visualGuideId}
        onClose={() => setVisualGuideId(null)}
      />

      <AccountAiSettingsModal
        isOpen={isAiSettingsOpen}
        user={user}
        preferences={aiPreferences}
        onClose={() => setIsAiSettingsOpen(false)}
        onSaveSettings={handleSaveAiSettings}
      />

      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
