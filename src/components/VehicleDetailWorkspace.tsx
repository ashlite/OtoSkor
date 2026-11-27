import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  FileText,
  MapPin,
  MessageCircle,
  OctagonAlert,
  Phone,
  Trash2,
  Wrench,
} from 'lucide-react';
import type { VisualGuideId } from '@/src/data/inspectionCatalog';
import type {
  ChecklistItemResponse,
  DocType,
  LegalDocument,
  ServiceRecord,
  Vehicle,
  WorkshopType,
} from '@/src/types/inspection';
import {
  calculateVehicleScores,
  formatIDR,
  formatKm,
  sanitizeWhatsAppPhone,
} from '@/src/utils/scoring';
import { useBackHandler } from '@/src/hooks/useBackHandler';
import { InspectionChecklistTab } from '@/src/components/InspectionChecklistTab';
import { LegalDocsTab } from '@/src/components/LegalDocsTab';
import { ServiceRecordTab } from '@/src/components/ServiceRecordTab';

interface VehicleDetailWorkspaceProps {
  vehicle: Vehicle;
  legalDocs: LegalDocument[];
  serviceRecords: ServiceRecord[];
  onBack: () => void;
  onEditVehicle: () => void;
  onDeleteVehicle: () => Promise<void>;
  onOpenVisualGuide: (guideId: VisualGuideId) => void;
  onSaveInspection: (
    responses: Record<string, ChecklistItemResponse>,
    notes: string
  ) => Promise<void>;
  onUploadLegalDoc: (input: {
    docType: DocType;
    title: string;
    imageDataUrl: string;
    notes: string;
  }) => Promise<void>;
  onDeleteLegalDoc: (docId: string) => Promise<void>;
  onAddServiceRecord: (input: {
    serviceDate: string;
    odometerKm: number;
    workshopName: string;
    workshopType: WorkshopType;
    workDescription: string;
    cost: number;
    hasReceipt: boolean;
  }) => Promise<void>;
  onDeleteServiceRecord: (recordId: string) => Promise<void>;
  onOpenAiSettings?: () => void;
}

type DetailTab = 'summary' | 'inspection' | 'legal' | 'service';

export const VehicleDetailWorkspace: React.FC<VehicleDetailWorkspaceProps> = ({
  vehicle,
  legalDocs,
  serviceRecords,
  onBack,
  onEditVehicle,
  onDeleteVehicle,
  onOpenVisualGuide,
  onSaveInspection,
  onUploadLegalDoc,
  onDeleteLegalDoc,
  onAddServiceRecord,
  onDeleteServiceRecord,
  onOpenAiSettings,
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('summary');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setActiveTab('summary');
    setConfirmDelete(false);
  }, [vehicle.id]);

  useBackHandler(activeTab !== 'summary', () => {
    setActiveTab('summary');
  });

  const computed = calculateVehicleScores({
    askingPrice: vehicle.askingPrice,
    marketPrice: vehicle.marketPrice,
    legalChecklist: vehicle.legalChecklist,
    checklistResponses: vehicle.checklistResponses || {},
  });

  const waDigits = sanitizeWhatsAppPhone(vehicle.sellerPhone);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteVehicle();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Vehicle Context Bar */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center dark:border-slate-800">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Kembali ke Garasi"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
              {vehicle.name}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {vehicle.brand} {vehicle.model} · {vehicle.year} · {vehicle.transmission} ·{' '}
              {vehicle.fuelType} ·{' '}
              <span className="font-mono-tabular">{formatKm(vehicle.odometerKm)}</span>
              {vehicle.licensePlate ? ` · ${vehicle.licensePlate}` : ''}
              {vehicle.productionStatus && vehicle.productionStatus !== 'Belum Diketahui'
                ? ` · Status: ${vehicle.productionStatus}`
                : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onEditVehicle}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Edit3 className="h-4 w-4" />
            <span>Edit Data</span>
          </button>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Hapus unit mobil"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleConfirmDelete()}
                className="min-h-[44px] rounded-xl bg-red-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {isDeleting ? 'Menghapus...' : 'Konfirmasi Hapus'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-[44px] rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
        {(
          [
            { id: 'summary', label: 'Ringkasan & Skor', icon: CheckCircle2 },
            {
              id: 'inspection',
              label: `Inspeksi (${computed.evaluatedItems}/${computed.totalItems})`,
              icon: ClipboardCheck,
            },
            { id: 'legal', label: `Foto Unit & Legal (${legalDocs.length})`, icon: FileText },
            { id: 'service', label: `Service Record (${serviceRecords.length})`, icon: Wrench },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Dual Score Cards */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Skor Kondisi Fisik Total
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono-tabular text-4xl font-bold text-slate-900 dark:text-white">
                  {computed.physicalScore}
                </span>
                <span className="font-mono-tabular text-sm text-slate-400">/ 100</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Dihitung dari bobot 7 kategori inspeksi profesional plus verifikasi dokumen legal (dinilai {computed.evaluatedItems} dari {computed.totalItems} poin).
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('inspection')}
                className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
              >
                Lanjutkan / Edit Checklist Inspeksi →
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Skor Rasio Harga Pasar
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono-tabular text-4xl font-bold text-blue-700 dark:text-blue-400">
                  {computed.marketValueScore}
                </span>
                <span className="font-mono-tabular text-sm text-slate-400">/ 100</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Rekomendasi: <strong className="text-slate-900 dark:text-white">{computed.overallVerdict}</strong>. Membandingkan skor fisik dengan harga efektif terhadap harga pasar wajar.
              </p>
              {vehicle.marketPrice > 0 && (
                <p
                  className={`mt-3 font-mono-tabular text-xs font-semibold ${
                    computed.marketDelta >= 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {computed.marketDelta >= 0
                    ? `Lebih hemat ${formatIDR(computed.marketDelta)} (${computed.marketDeltaPercent}%) dari pasar`
                    : `Lebih mahal ${formatIDR(Math.abs(computed.marketDelta))} (${Math.abs(
                        computed.marketDeltaPercent
                      )}%) dari pasar`}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Kalkulasi Harga Efektif
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Harga Penjual</span>
                  <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                    {formatIDR(vehicle.askingPrice)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Est. Perbaikan</span>
                  <span className="font-mono-tabular font-semibold text-amber-700 dark:text-amber-400">
                    + {formatIDR(computed.estimatedRepairCost)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Total Biaya Efektif
                  </span>
                  <span className="font-mono-tabular font-bold text-slate-900 dark:text-white">
                    {formatIDR(computed.effectivePrice)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Harga Pasar Wajar</span>
                  <span className="font-mono-tabular text-slate-700 dark:text-slate-300">
                    {formatIDR(vehicle.marketPrice)}
                  </span>
                </div>
                {vehicle.newCarPrice !== undefined && vehicle.newCarPrice > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Harga Baru (Depresiasi{' '}
                      {Math.max(
                        0,
                        Math.round(
                          ((vehicle.newCarPrice - vehicle.askingPrice) / vehicle.newCarPrice) * 100
                        )
                      )}
                      %)
                    </span>
                    <span className="font-mono-tabular text-slate-700 dark:text-slate-300">
                      {formatIDR(vehicle.newCarPrice)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {computed.redFlags.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50/70 p-5 dark:border-red-900/60 dark:bg-red-950/30">
              <div className="flex items-center gap-2 font-display text-sm font-bold text-red-800 dark:text-red-300">
                <OctagonAlert className="h-5 w-5 shrink-0" />
                <span>Peringatan Temuan Kritis / Red Flag ({computed.redFlags.length})</span>
              </div>
              <ul className="mt-2.5 space-y-1.5 text-sm text-red-900 dark:text-red-200">
                {computed.redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span>•</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Category Breakdown & Seller Contact */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Rincian Skor per Kategori Inspeksi
              </h2>
              <div className="mt-4 space-y-4">
                {computed.categoryBreakdown.map((cat) => {
                  const barWidth = cat.score !== null ? cat.score : 0;
                  return (
                    <div key={cat.categoryId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {cat.title} ({cat.weight}%)
                        </span>
                        <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                          {cat.score !== null ? `${cat.score}/100` : 'Belum dicek'}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            barWidth >= 80
                              ? 'bg-emerald-600'
                              : barWidth >= 60
                              ? 'bg-blue-600'
                              : barWidth > 0
                              ? 'bg-amber-600'
                              : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Informasi Penjual & Lokasi Unit
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Nama Pemilik / Sales</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {vehicle.sellerName} · {vehicle.sellerType}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Lokasi Survei</p>
                  <p className="flex items-start gap-1.5 text-slate-800 dark:text-slate-200">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span>{vehicle.location}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Kontak</p>
                  <p className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                    {vehicle.sellerPhone}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-2">
                  <a
                    href={`tel:${vehicle.sellerPhone}`}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Phone className="h-4 w-4" />
                    <span>Telepon</span>
                  </a>
                  {waDigits && (
                    <a
                      href={`https://wa.me/${waDigits}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Hubungi WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>

              {vehicle.notes && (
                <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Catatan Umum
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">
                    {vehicle.notes}
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {activeTab === 'inspection' && (
        <InspectionChecklistTab
          vehicle={vehicle}
          legalDocs={legalDocs}
          onOpenVisualGuide={onOpenVisualGuide}
          onSaveInspection={onSaveInspection}
          onUploadLegalDoc={onUploadLegalDoc}
          onDeleteLegalDoc={onDeleteLegalDoc}
          onOpenAiSettings={onOpenAiSettings}
        />
      )}

      {activeTab === 'legal' && (
        <LegalDocsTab
          vehicle={vehicle}
          legalDocs={legalDocs}
          onUploadDoc={onUploadLegalDoc}
          onDeleteDoc={onDeleteLegalDoc}
          onEditLegalChecklist={onEditVehicle}
        />
      )}

      {activeTab === 'service' && (
        <ServiceRecordTab
          vehicle={vehicle}
          serviceRecords={serviceRecords}
          onAddRecord={onAddServiceRecord}
          onDeleteRecord={onDeleteServiceRecord}
        />
      )}
    </div>
  );
};
