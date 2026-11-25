import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Eye,
  ImagePlus,
  Info,
  Loader2,
  ScanSearch,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import {
  VISUAL_GUIDES,
  type InspectionCategoryDefinition,
} from '@/src/data/inspectionCatalog';
import {
  fetchAiCategoryInspection,
  type CategoryAiInspectionResult,
} from '@/src/services/aiEstimateService';
import {
  FIELD_LIMITS,
  type DocType,
  type LegalDocument,
  type Vehicle,
} from '@/src/types/inspection';
import { compressImageToDataUrl } from '@/src/utils/imageCompression';
import { formatIDR } from '@/src/utils/scoring';

interface CategoryAiInspectionModalProps {
  category: InspectionCategoryDefinition | null;
  vehicle: Vehicle;
  legalDocs: LegalDocument[];
  onClose: () => void;
  onUploadPhoto: (input: {
    docType: DocType;
    title: string;
    imageDataUrl: string;
    notes: string;
  }) => Promise<void>;
  onDeletePhoto: (docId: string) => Promise<void>;
  onApplyInspectionResults: (
    categoryId: string,
    result: CategoryAiInspectionResult
  ) => Promise<void>;
  onOpenAiSettings?: () => void;
}

const MAX_AI_PHOTOS = 6;

export function getCategoryTag(categoryId: string): string {
  return `[Inspeksi AI:${categoryId}]`;
}

export const CategoryAiInspectionModal: React.FC<CategoryAiInspectionModalProps> = ({
  category,
  vehicle,
  legalDocs,
  onClose,
  onUploadPhoto,
  onDeletePhoto,
  onApplyInspectionResults,
  onOpenAiSettings,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<CategoryAiInspectionResult | null>(null);
  const [showAllUnitPhotos, setShowAllUnitPhotos] = useState(false);
  const knownDocIdsRef = useRef<Set<string>>(new Set());

  const categoryTag = category ? getCategoryTag(category.id) : '';

  const unitPhotos = useMemo(() => {
    return legalDocs.filter((doc) => doc.docType === 'Foto Unit / Lainnya');
  }, [legalDocs]);

  const categoryPhotos = useMemo(() => {
    if (!categoryTag) return [];
    return unitPhotos.filter((doc) => doc.notes.includes(categoryTag));
  }, [unitPhotos, categoryTag]);

  const otherUnitPhotos = useMemo(() => {
    if (!categoryTag) return [];
    return unitPhotos.filter((doc) => !doc.notes.includes(categoryTag));
  }, [unitPhotos, categoryTag]);

  // Reset modal state when opened for a category
  useEffect(() => {
    if (!category) return;
    setErrorMessage(null);
    setAiResult(null);
    setShowAllUnitPhotos(false);
    const matching = legalDocs
      .filter((d) => d.docType === 'Foto Unit / Lainnya' && d.notes.includes(getCategoryTag(category.id)))
      .slice(0, MAX_AI_PHOTOS)
      .map((d) => d.id);
    setSelectedDocIds(matching);
    knownDocIdsRef.current = new Set(legalDocs.map((d) => d.id));
  }, [category?.id]);

  // Auto-select newly uploaded photos for this category
  useEffect(() => {
    if (!category) return;
    const tag = getCategoryTag(category.id);
    const newlyAddedIds: string[] = [];
    for (const doc of legalDocs) {
      if (!knownDocIdsRef.current.has(doc.id)) {
        knownDocIdsRef.current.add(doc.id);
        if (doc.docType === 'Foto Unit / Lainnya' && doc.notes.includes(tag)) {
          newlyAddedIds.push(doc.id);
        }
      }
    }
    if (newlyAddedIds.length > 0) {
      setSelectedDocIds((prev) => {
        const combined = [...newlyAddedIds, ...prev];
        return Array.from(new Set(combined)).slice(0, MAX_AI_PHOTOS);
      });
    }
  }, [legalDocs, category]);

  if (!category) return null;

  const guide = VISUAL_GUIDES[category.guideId];
  const visiblePhotos = showAllUnitPhotos ? unitPhotos : categoryPhotos;

  const toggleSelectPhoto = (docId: string) => {
    setErrorMessage(null);
    setSelectedDocIds((prev) => {
      if (prev.includes(docId)) {
        return prev.filter((id) => id !== docId);
      }
      if (prev.length >= MAX_AI_PHOTOS) {
        setErrorMessage(`Maksimal ${MAX_AI_PHOTOS} foto per kali proses inspeksi AI agar hemat kuota.`);
        return prev;
      }
      return [...prev, docId];
    });
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    setIsUploading(true);
    setErrorMessage(null);

    let uploadedCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        setUploadProgressText(`Mengompresi & menyimpan foto ${i + 1}/${files.length}...`);
        const compressedDataUrl = await compressImageToDataUrl(files[i]);
        const seqNumber = categoryPhotos.length + uploadedCount + 1;
        const title = `Foto ${category.title} #${seqNumber}`.slice(0, FIELD_LIMITS.DOC_TITLE_MAX);
        const notes = `${categoryTag} Foto inspeksi grup ${category.title}`.slice(
          0,
          FIELD_LIMITS.DOC_NOTES_MAX
        );

        await onUploadPhoto({
          docType: 'Foto Unit / Lainnya',
          title,
          imageDataUrl: compressedDataUrl,
          notes,
        });
        uploadedCount += 1;
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal mengunggah salah satu foto ke penyimpanan unit.'
      );
    } finally {
      setIsUploading(false);
      setUploadProgressText(null);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    setErrorMessage(null);
    try {
      await onDeletePhoto(docId);
      setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menghapus foto.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRunAiInspection = async () => {
    setErrorMessage(null);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setErrorMessage(
        'Saat ini Anda offline. Foto sudah aman tersimpan—Anda dapat memproses Inspeksi AI nanti saat online.'
      );
      return;
    }

    const chosenDocs = unitPhotos.filter((doc) => selectedDocIds.includes(doc.id));
    if (chosenDocs.length === 0) {
      setErrorMessage('Pilih atau unggah minimal 1 foto untuk diproses AI.');
      return;
    }

    setIsProcessingAi(true);
    try {
      const result = await fetchAiCategoryInspection({
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        transmission: vehicle.transmission,
        fuelType: vehicle.fuelType,
        odometerKm: vehicle.odometerKm,
        categoryTitle: category.title,
        items: category.items.map((item) => ({
          id: item.id,
          label: item.label,
          hint: item.hint,
          defaultRepairEstimate: item.defaultRepairEstimate,
        })),
        images: chosenDocs.map((doc) => doc.imageDataUrl),
      });

      await onApplyInspectionResults(category.id, result);
      setAiResult(result);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal memproses foto dengan AI. Coba lagi nanti.'
      );
    } finally {
      setIsProcessingAi(false);
    }
  };

  const assessedItems = aiResult ? aiResult.items.filter((it) => it.canAssessFromPhoto) : [];
  const uncheckableItems = aiResult ? aiResult.items.filter((it) => !it.canAssessFromPhoto) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-inspect-modal-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <ScanSearch className="h-3.5 w-3.5 shrink-0" />
              <span>Inspeksi AI Berbasis Foto</span>
            </div>
            <h2
              id="ai-inspect-modal-title"
              className="mt-0.5 truncate font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              {category.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal inspeksi AI"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {!aiResult ? (
            <>
              {/* Visual Reference + Required Photo Checklist */}
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-12 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="md:col-span-5">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <img
                      src={guide.imageUrl}
                      alt={`Contoh visual ${category.title}`}
                      referrerPolicy="no-referrer"
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-200">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3 w-3 text-blue-400" />
                        Contoh Area Foto
                      </span>
                      <span className="text-slate-400">Baik vs Rusak</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-7">
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    Foto yang Disarankan untuk Grup Ini
                  </h3>
                  <ul className="space-y-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {category.photoExamples.map((example, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                        <span>{example}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 text-[11px] text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-700 dark:text-blue-400" />
                    <span>
                      Semua foto yang diunggah <strong>otomatis tersimpan</strong> di tab{' '}
                      <strong>Foto Unit &amp; Legal</strong>. Anda bisa tekan{' '}
                      <strong>Tutup / Nanti Saja</strong> jika ingin memproses AI belakangan.
                    </span>
                  </div>
                </div>
              </div>

              {/* Upload / Capture Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => void handleFilesSelected(e)}
                  className="hidden"
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => void handleFilesSelected(e)}
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={isUploading || isProcessingAi}
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  <span>Ambil Foto Kamera</span>
                </button>

                <button
                  type="button"
                  disabled={isUploading || isProcessingAi}
                  onClick={() => galleryInputRef.current?.click()}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <ImagePlus className="h-4 w-4" />
                  <span>Unggah dari Galeri (Multi-Foto)</span>
                </button>

                {uploadProgressText && (
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                    {uploadProgressText}
                  </span>
                )}
              </div>

              {errorMessage && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                  <span>{errorMessage}</span>
                  {onOpenAiSettings && (
                    <button
                      type="button"
                      onClick={onOpenAiSettings}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-800 hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-200 whitespace-nowrap shrink-0"
                    >
                      <Settings2 className="h-3 w-3" />
                      <span>Ganti Model / Token AI</span>
                    </button>
                  )}
                </div>
              )}

              {/* Saved Photos Selection Grid */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    Foto Tersimpan ({visiblePhotos.length}) · Dipilih untuk AI:{' '}
                    <span className="font-mono-tabular text-blue-700 dark:text-blue-400">
                      {selectedDocIds.length}/{MAX_AI_PHOTOS}
                    </span>
                  </h3>

                  {otherUnitPhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllUnitPhotos((prev) => !prev)}
                      className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
                    >
                      {showAllUnitPhotos
                        ? `Tampilkan foto grup ini saja (${categoryPhotos.length})`
                        : `Lihat semua foto unit (${unitPhotos.length})`}
                    </button>
                  )}
                </div>

                {visiblePhotos.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center dark:border-slate-700 dark:bg-slate-950/40">
                    <Camera className="mx-auto h-7 w-7 text-slate-400" />
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                      Belum ada foto untuk grup <strong>{category.title}</strong>. Ambil foto dengan
                      kamera atau unggah dari galeri di atas.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {visiblePhotos.map((doc) => {
                      const isSelected = selectedDocIds.includes(doc.id);
                      return (
                        <div
                          key={doc.id}
                          className={`group relative overflow-hidden rounded-xl border transition-colors ${
                            isSelected
                              ? 'border-blue-600 ring-2 ring-blue-600/20'
                              : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSelectPhoto(doc.id)}
                            className="block w-full text-left"
                          >
                            <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                              <img
                                src={doc.imageDataUrl}
                                alt={doc.title}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover"
                              />
                              <span
                                className={`absolute left-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-lg border text-xs font-bold ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-white/80 bg-slate-950/60 text-transparent'
                                }`}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </span>
                            </div>
                            <div className="p-2 pr-9">
                              <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                                {doc.title}
                              </p>
                              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                {isSelected ? 'Akan dianalisis AI' : 'Ketuk untuk pilih'}
                              </p>
                            </div>
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === doc.id || isProcessingAi}
                            onClick={() => void handleDelete(doc.id)}
                            aria-label={`Hapus ${doc.title}`}
                            className="absolute bottom-2 right-2 inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          >
                            {deletingId === doc.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* AI Result Summary View */
            <div className="space-y-5">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <div>
                    <h3 className="font-display text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      Inspeksi AI Selesai ({aiResult.analyzedPhotoCount} foto dianalisis)
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-emerald-950/90 dark:text-emerald-200/90">
                      {aiResult.overallObservation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Auto-filled Items */}
              <div className="space-y-2.5">
                <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  Poin Terisi Otomatis di Form ({assessedItems.length})
                </h4>
                {assessedItems.length === 0 ? (
                  <p className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
                    Tidak ada poin pada grup ini yang dapat dipastikan dari foto yang diunggah.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {assessedItems.map((item) => {
                      const statusLabel =
                        item.status === 'good'
                          ? 'Baik'
                          : item.status === 'attention'
                          ? 'Perhatian'
                          : 'Rusak';
                      const statusBadgeClass =
                        item.status === 'good'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : item.status === 'attention'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';

                      return (
                        <div
                          key={item.itemId}
                          className="rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-950/50"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {item.label}
                            </span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${statusBadgeClass}`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          {item.note && (
                            <p className="mt-1 text-slate-600 dark:text-slate-300">{item.note}</p>
                          )}
                          {item.estimatedRepairCost > 0 && (
                            <p className="mt-1 font-mono-tabular font-semibold text-amber-700 dark:text-amber-400">
                              Est. perbaikan: {formatIDR(item.estimatedRepairCost)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Uncheckable Items Explicitly Reported */}
              {uncheckableItems.length > 0 && (
                <div className="space-y-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
                    <div>
                      <h4 className="font-display text-sm font-bold text-amber-900 dark:text-amber-200">
                        Poin yang Tidak Bisa Dicek via Foto ({uncheckableItems.length})
                      </h4>
                      <p className="mt-0.5 text-xs text-amber-900/90 dark:text-amber-200/80">
                        Poin berikut belum terisi otomatis dan perlu diperiksa manual langsung atau
                        dengan foto tambahan:
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2 pt-1 text-xs">
                    {uncheckableItems.map((item) => (
                      <li
                        key={item.itemId}
                        className="rounded-xl border border-amber-200/80 bg-white/80 p-2.5 dark:border-amber-900/50 dark:bg-slate-900/80"
                      >
                        <p className="font-semibold text-slate-900 dark:text-white">{item.label}</p>
                        <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                          {item.uncheckableReason}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/60">
          {!aiResult ? (
            <>
              <button
                type="button"
                disabled={isProcessingAi}
                onClick={onClose}
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Tutup / Nanti Saja
              </button>
              <button
                type="button"
                disabled={isUploading || isProcessingAi || selectedDocIds.length === 0}
                onClick={() => void handleRunAiInspection()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
              >
                {isProcessingAi ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menganalisis Foto...</span>
                  </>
                ) : (
                  <>
                    <ScanSearch className="h-4 w-4" />
                    <span>Proses Inspeksi AI ({selectedDocIds.length} Foto)</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
            >
              <Check className="h-4 w-4" />
              <span>Selesai &amp; Lihat Hasil di Form</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
