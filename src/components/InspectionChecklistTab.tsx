import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  Globe,
  Loader2,
  Minus,
  Save,
  ScanSearch,
  Settings2,
  X,
} from 'lucide-react';
import {
  INSPECTION_CATEGORIES,
  type VisualGuideId,
} from '@/src/data/inspectionCatalog';
import type {
  ChecklistItemResponse,
  DocType,
  InspectionStatus,
  LegalDocument,
  Vehicle,
} from '@/src/types/inspection';
import {
  fetchAiRepairCost,
  type CategoryAiInspectionItemResult,
  type CategoryAiInspectionResult,
  type RepairCostEstimateResult,
} from '@/src/services/aiEstimateService';
import { calculateVehicleScores, formatIDR } from '@/src/utils/scoring';
import {
  CategoryAiInspectionModal,
  getCategoryTag,
} from '@/src/components/CategoryAiInspectionModal';

interface InspectionChecklistTabProps {
  vehicle: Vehicle;
  legalDocs: LegalDocument[];
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
  onOpenAiSettings?: () => void;
}

export const InspectionChecklistTab: React.FC<InspectionChecklistTabProps> = ({
  vehicle,
  legalDocs,
  onOpenVisualGuide,
  onSaveInspection,
  onUploadLegalDoc,
  onDeleteLegalDoc,
  onOpenAiSettings,
}) => {
  const [responses, setResponses] = useState<Record<string, ChecklistItemResponse>>(
    vehicle.checklistResponses || {}
  );
  const [notes, setNotes] = useState(vehicle.notes || '');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    engine: true,
    chassis: true,
    undercarriage: false,
    exterior: false,
    electrical: false,
    interior: false,
    roadtest: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [aiLoadingItemId, setAiLoadingItemId] = useState<string | null>(null);
  const [aiItemErrors, setAiItemErrors] = useState<Record<string, string>>({});
  const [aiItemResults, setAiItemResults] = useState<Record<string, RepairCostEstimateResult>>({});
  const [aiModalCategoryId, setAiModalCategoryId] = useState<string | null>(null);
  const [uncheckableByCategory, setUncheckableByCategory] = useState<
    Record<string, CategoryAiInspectionItemResult[]>
  >({});

  useEffect(() => {
    setResponses(vehicle.checklistResponses || {});
    setNotes(vehicle.notes || '');
    setHasUnsavedChanges(false);
    setAiItemErrors({});
    setAiItemResults({});
    setAiModalCategoryId(null);
    setUncheckableByCategory({});
  }, [vehicle.id]);

  const liveScores = calculateVehicleScores({
    askingPrice: vehicle.askingPrice,
    marketPrice: vehicle.marketPrice,
    legalChecklist: vehicle.legalChecklist,
    checklistResponses: responses,
  });

  const handleStatusChange = (
    itemId: string,
    status: InspectionStatus,
    defaultEstimate = 0
  ) => {
    setResponses((prev) => {
      const current = prev[itemId] || { status: 'na', note: '', repairCost: 0 };
      let nextRepair = current.repairCost;
      if (status === 'good' || status === 'na') {
        nextRepair = 0;
      } else if ((status === 'defect' || status === 'attention') && current.repairCost === 0) {
        nextRepair = status === 'defect' ? defaultEstimate : Math.round(defaultEstimate * 0.5);
      }
      return {
        ...prev,
        [itemId]: {
          ...current,
          status,
          repairCost: nextRepair,
        },
      };
    });
    setHasUnsavedChanges(true);
    setSaveFeedback(null);
  };

  const handleRepairCostChange = (itemId: string, repairCost: number) => {
    setResponses((prev) => {
      const current = prev[itemId] || { status: 'attention', note: '', repairCost: 0 };
      return {
        ...prev,
        [itemId]: {
          ...current,
          repairCost: Math.max(0, repairCost),
        },
      };
    });
    setHasUnsavedChanges(true);
    setSaveFeedback(null);
  };

  const handleNoteChange = (itemId: string, note: string) => {
    setResponses((prev) => {
      const current = prev[itemId] || { status: 'good', note: '', repairCost: 0 };
      return {
        ...prev,
        [itemId]: {
          ...current,
          note: note.slice(0, 300),
        },
      };
    });
    setHasUnsavedChanges(true);
    setSaveFeedback(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveFeedback(null);
    try {
      await onSaveInspection(responses, notes);
      setHasUnsavedChanges(false);
      setSaveFeedback('Hasil inspeksi & skor berhasil disimpan.');
    } catch {
      setSaveFeedback('Gagal menyimpan inspeksi. Periksa koneksi Anda.');
    } finally {
      setIsSaving(false);
    }
  };

  const markCategoryAllGood = (categoryId: string) => {
    const category = INSPECTION_CATEGORIES.find((c) => c.id === categoryId);
    if (!category) return;
    setResponses((prev) => {
      const next = { ...prev };
      for (const item of category.items) {
        if (!next[item.id] || next[item.id].status === 'na') {
          next[item.id] = { status: 'good', note: '', repairCost: 0 };
        }
      }
      return next;
    });
    setHasUnsavedChanges(true);
    setSaveFeedback(null);
  };

  const handleEstimateRepairWithAi = async (item: {
    id: string;
    label: string;
    hint: string;
  }) => {
    const current = responses[item.id] || { status: 'attention', note: '', repairCost: 0 };
    setAiItemErrors((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setAiItemErrors((prev) => ({
        ...prev,
        [item.id]: 'Mode offline: koneksi internet diperlukan untuk cek harga suku cadang AI.',
      }));
      return;
    }

    setAiLoadingItemId(item.id);
    try {
      const result = await fetchAiRepairCost({
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        transmission: vehicle.transmission,
        fuelType: vehicle.fuelType,
        itemLabel: item.label,
        itemHint: item.hint,
        issueNote: current.note,
        status: current.status,
      });

      handleRepairCostChange(item.id, result.estimatedCost);
      setAiItemResults((prev) => ({ ...prev, [item.id]: result }));
    } catch (err) {
      setAiItemErrors((prev) => ({
        ...prev,
        [item.id]:
          err instanceof Error
            ? err.message
            : 'Gagal memuat estimasi suku cadang & perbaikan dari AI.',
      }));
    } finally {
      setAiLoadingItemId(null);
    }
  };

  const handleApplyCategoryAiResults = async (
    categoryId: string,
    result: CategoryAiInspectionResult
  ) => {
    const nextResponses = { ...responses };
    let updatedCount = 0;

    for (const itemRes of result.items) {
      if (itemRes.canAssessFromPhoto && itemRes.status !== 'na') {
        nextResponses[itemRes.itemId] = {
          status: itemRes.status,
          note: itemRes.note.slice(0, 300),
          repairCost: itemRes.status === 'good' ? 0 : Math.max(0, itemRes.estimatedRepairCost),
        };
        updatedCount += 1;
      }
    }

    const uncheckable = result.items.filter((it) => !it.canAssessFromPhoto);
    setUncheckableByCategory((prev) => ({
      ...prev,
      [categoryId]: uncheckable,
    }));
    setOpenCategories((prev) => ({
      ...prev,
      [categoryId]: true,
    }));

    setResponses(nextResponses);
    if (updatedCount > 0) {
      try {
        await onSaveInspection(nextResponses, notes);
        setHasUnsavedChanges(false);
        setSaveFeedback(`${updatedCount} poin diisi AI & tersimpan.`);
      } catch {
        setHasUnsavedChanges(true);
        setSaveFeedback(`${updatedCount} poin diisi AI (belum tersimpan ke cloud).`);
      }
    }
  };

  const activeAiCategory =
    INSPECTION_CATEGORIES.find((cat) => cat.id === aiModalCategoryId) || null;

  return (
    <div className="space-y-5">
      {/* Live Score & Save Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Progres Pemeriksaan</p>
            <p className="font-mono-tabular text-base font-bold text-slate-900 dark:text-white">
              {liveScores.evaluatedItems}/{liveScores.totalItems} poin
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Skor Fisik Langsung</p>
            <p className="font-mono-tabular text-base font-bold text-emerald-700 dark:text-emerald-400">
              {liveScores.physicalScore}/100
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Est. Biaya Perbaikan</p>
            <p className="font-mono-tabular text-base font-bold text-amber-700 dark:text-amber-400">
              {formatIDR(liveScores.estimatedRepairCost)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {saveFeedback && (
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {saveFeedback}
            </span>
          )}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 ${
              hasUnsavedChanges
                ? 'bg-blue-700 hover:bg-blue-800'
                : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'
            } disabled:opacity-60`}
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Menyimpan...' : hasUnsavedChanges ? 'Simpan Inspeksi' : 'Tersimpan'}</span>
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {INSPECTION_CATEGORIES.map((category) => {
          const isOpen = Boolean(openCategories[category.id]);
          const summary = liveScores.categoryBreakdown.find(
            (c) => c.categoryId === category.id
          );

          return (
            <section
              key={category.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setOpenCategories((prev) => ({
                      ...prev,
                      [category.id]: !prev[category.id],
                    }))
                  }
                  className="flex flex-1 items-start gap-3 text-left"
                >
                  <div className="mt-0.5 text-slate-500 dark:text-slate-400">
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                        {category.title}
                      </h3>
                      <span className="font-mono-tabular text-xs font-medium text-slate-500 dark:text-slate-400">
                        Bobot {category.weight}% · {summary?.evaluatedCount || 0}/
                        {category.items.length} dicek
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {category.description}
                    </p>
                  </div>
                </button>

                <div className="flex flex-wrap items-center gap-2 pl-8 sm:pl-0 shrink-0">
                  <span className="font-mono-tabular text-sm font-bold text-slate-900 dark:text-white">
                    {summary?.score !== null && summary?.score !== undefined
                      ? `${summary.score}/100`
                      : '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAiModalCategoryId(category.id)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
                  >
                    <ScanSearch className="h-3.5 w-3.5" />
                    <span>
                      Inspeksi AI
                      {(() => {
                        const count = legalDocs.filter(
                          (d) =>
                            d.docType === 'Foto Unit / Lainnya' &&
                            d.notes.includes(getCategoryTag(category.id))
                        ).length;
                        return count > 0 ? ` (${count})` : '';
                      })()}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenVisualGuide(category.guideId)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 transition-colors hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50 whitespace-nowrap shrink-0"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Panduan Visual</span>
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="flex items-center justify-between bg-slate-50/70 px-4 py-2.5 dark:bg-slate-950/40">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Pilih kondisi tiap komponen di bawah
                    </span>
                    <button
                      type="button"
                      onClick={() => markCategoryAllGood(category.id)}
                      className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
                    >
                      Tandai sisa poin sebagai Baik
                    </button>
                  </div>

                  {uncheckableByCategory[category.id] &&
                    uncheckableByCategory[category.id].length > 0 && (
                      <div className="bg-amber-50/70 p-4 dark:bg-amber-950/25">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                            <div className="space-y-1.5">
                              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                Poin berikut tidak bisa dicek AI melalui foto (perlu cek manual):
                              </p>
                              <ul className="space-y-1 text-xs text-amber-950/90 dark:text-amber-200/90">
                                {uncheckableByCategory[category.id].map((uncheckItem) => (
                                  <li key={uncheckItem.itemId}>
                                    <strong>{uncheckItem.label}:</strong>{' '}
                                    {uncheckItem.uncheckableReason}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setUncheckableByCategory((prev) => {
                                const next = { ...prev };
                                delete next[category.id];
                                return next;
                              })
                            }
                            aria-label="Tutup pemberitahuan poin manual"
                            className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                  {category.items.map((item) => {
                    const current = responses[item.id] || {
                      status: 'na' as InspectionStatus,
                      note: '',
                      repairCost: 0,
                    };
                    const needsCostInput =
                      current.status === 'attention' || current.status === 'defect';

                    return (
                      <div key={item.id} className="p-4 space-y-3">
                        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {item.label}
                              </p>
                              <button
                                type="button"
                                onClick={() => onOpenVisualGuide(item.guideId)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Lihat Contoh Visual</span>
                              </button>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                              {item.hint}
                            </p>
                          </div>

                          {/* 44px+ Touch Target Status Buttons */}
                          <div className="grid grid-cols-4 gap-1.5 shrink-0 sm:w-auto">
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(item.id, 'good', item.defaultRepairEstimate)
                              }
                              className={`inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                                current.status === 'good'
                                  ? 'border-emerald-700 bg-emerald-700 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                              }`}
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Baik</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(
                                  item.id,
                                  'attention',
                                  item.defaultRepairEstimate
                                )
                              }
                              className={`inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                                current.status === 'attention'
                                  ? 'border-amber-600 bg-amber-600 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                              }`}
                            >
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span>Perhatian</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(item.id, 'defect', item.defaultRepairEstimate)
                              }
                              className={`inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                                current.status === 'defect'
                                  ? 'border-red-700 bg-red-700 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                              }`}
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Rusak</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(item.id, 'na', item.defaultRepairEstimate)
                              }
                              className={`inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                                current.status === 'na'
                                  ? 'border-slate-700 bg-slate-700 text-white'
                                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800'
                              }`}
                            >
                              <Minus className="h-3.5 w-3.5" />
                              <span>N/A</span>
                            </button>
                          </div>
                        </div>

                        {(needsCostInput || current.note) && (
                          <div className="space-y-2.5 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                              {needsCostInput && (
                                <div className="sm:col-span-5">
                                  <div className="flex items-center justify-between gap-2">
                                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                      Estimasi Perbaikan (Rp)
                                    </label>
                                    <button
                                      type="button"
                                      disabled={aiLoadingItemId === item.id}
                                      onClick={() => void handleEstimateRepairWithAi(item)}
                                      title="Cek estimasi biaya suku cadang & jasa bengkel di internet untuk tipe mobil ini"
                                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800 transition-colors hover:bg-blue-100 disabled:opacity-60 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50 whitespace-nowrap shrink-0"
                                    >
                                      {aiLoadingItemId === item.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Globe className="h-3 w-3" />
                                      )}
                                      <span>
                                        {aiLoadingItemId === item.id
                                          ? 'Mencari...'
                                          : 'Estimasi AI'}
                                      </span>
                                    </button>
                                  </div>
                                  <input
                                    type="number"
                                    min={0}
                                    step={100000}
                                    value={current.repairCost}
                                    onChange={(e) =>
                                      handleRepairCostChange(item.id, Number(e.target.value))
                                    }
                                    className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 font-mono-tabular text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                  />
                                </div>
                              )}
                              <div className={needsCostInput ? 'sm:col-span-7' : 'sm:col-span-12'}>
                                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                  Catatan Temuan Inspektor
                                </label>
                                <input
                                  type="text"
                                  maxLength={300}
                                  value={current.note}
                                  onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                  placeholder="Contoh: Ban depan sisa 30%, atau rembes tipis di paking..."
                                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                              </div>
                            </div>

                            {aiItemErrors[item.id] && (
                              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50/70 px-3 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                                <span className="font-medium">{aiItemErrors[item.id]}</span>
                                {onOpenAiSettings && (
                                  <button
                                    type="button"
                                    onClick={onOpenAiSettings}
                                    className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-red-800 hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-200 whitespace-nowrap shrink-0"
                                  >
                                    <Settings2 className="h-3 w-3" />
                                    <span>Pengaturan AI</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {aiItemResults[item.id] && (
                              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-2.5 text-xs dark:border-blue-900/60 dark:bg-blue-950/30">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-blue-900 dark:text-blue-200">
                                  <span>
                                    Rincian AI ({vehicle.brand} {vehicle.model})
                                  </span>
                                  <span className="font-mono-tabular">
                                    Suku cadang: {formatIDR(aiItemResults[item.id].partsEstimate)} · Jasa:{' '}
                                    {formatIDR(aiItemResults[item.id].laborEstimate)}
                                  </span>
                                </div>
                                <p className="mt-1 text-slate-700 dark:text-slate-300">
                                  {aiItemResults[item.id].summary}
                                </p>
                                {aiItemResults[item.id].sources.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-2">
                                    {aiItemResults[item.id].sources.map((src, idx) => (
                                      <a
                                        key={idx}
                                        href={src.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:underline dark:text-blue-400"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        <span className="max-w-[180px] truncate">{src.title}</span>
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* General Inspector Summary Notes */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <label className="block font-display text-sm font-bold text-slate-900 dark:text-white">
          Catatan Tambahan Inspektor
        </label>
        <textarea
          rows={3}
          maxLength={2000}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setHasUnsavedChanges(true);
            setSaveFeedback(null);
          }}
          placeholder="Ringkasan temuan penting, bahan negosiasi ke penjual, atau kondisi suara mesin..."
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Hasil Inspeksi'}</span>
          </button>
        </div>
      </div>

      <CategoryAiInspectionModal
        category={activeAiCategory}
        vehicle={vehicle}
        legalDocs={legalDocs}
        onClose={() => setAiModalCategoryId(null)}
        onUploadPhoto={onUploadLegalDoc}
        onDeletePhoto={onDeleteLegalDoc}
        onApplyInspectionResults={handleApplyCategoryAiResults}
        onOpenAiSettings={onOpenAiSettings}
      />
    </div>
  );
};
