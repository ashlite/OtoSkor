import React, { useRef, useState } from 'react';
import { Camera, CheckCircle2, FileText, Trash2, X, ZoomIn } from 'lucide-react';
import {
  FIELD_LIMITS,
  type DocType,
  type LegalDocument,
  type Vehicle,
} from '@/src/types/inspection';
import { compressImageToDataUrl } from '@/src/utils/imageCompression';

interface LegalDocsTabProps {
  vehicle: Vehicle;
  legalDocs: LegalDocument[];
  onUploadDoc: (input: {
    docType: DocType;
    title: string;
    imageDataUrl: string;
    notes: string;
  }) => Promise<void>;
  onDeleteDoc: (docId: string) => Promise<void>;
  onEditLegalChecklist: () => void;
}

const DOC_TYPES: DocType[] = [
  'STNK',
  'BPKB',
  'Faktur',
  'Notice Pajak',
  'Kuitansi',
  'Foto Unit / Lainnya',
];

export const LegalDocsTab: React.FC<LegalDocsTabProps> = ({
  vehicle,
  legalDocs,
  onUploadDoc,
  onDeleteDoc,
  onEditLegalChecklist,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<DocType>('STNK');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<LegalDocument | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const compressedDataUrl = await compressImageToDataUrl(file);
      await onUploadDoc({
        docType,
        title: title.trim() || `${docType} — ${vehicle.licensePlate || vehicle.model}`,
        imageDataUrl: compressedDataUrl,
        notes: notes.trim(),
      });
      setTitle('');
      setNotes('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Gagal memproses dan mengunggah foto dokumen.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Legal Checklist Overview */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Status Kelengkapan Dokumen Legal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verifikasi keabsahan surat kendaraan sebelum transaksi.
            </p>
          </div>
          <button
            type="button"
            onClick={onEditLegalChecklist}
            className="min-h-[40px] rounded-xl border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Ubah Status Legal
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'STNK Asli', ok: vehicle.legalChecklist.stnk },
            { label: 'BPKB Asli', ok: vehicle.legalChecklist.bpkb },
            { label: 'Faktur & NIK', ok: vehicle.legalChecklist.faktur },
            {
              label: `Pajak Tahunan (${vehicle.legalChecklist.taxExpiry || 'Cek masa berlaku'})`,
              ok: vehicle.legalChecklist.taxActive,
            },
            { label: 'No. Rangka & Mesin Cocok', ok: vehicle.legalChecklist.vinMatch },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm dark:border-slate-800"
            >
              <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                  item.ok
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-700 dark:text-red-400'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {item.ok ? 'Ada / Valid' : 'Belum / Tidak'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Upload Legal Photo Form */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Unggah Foto Unit &amp; Data Legal Mobil
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Ambil foto langsung dari kamera atau galeri (otomatis dikompresi agar hemat kuota & cepat tersinkron).
        </p>

        {uploadError && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {uploadError}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Jenis Dokumen
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Judul Foto (opsional)
            </label>
            <input
              type="text"
              maxLength={FIELD_LIMITS.DOC_TITLE_MAX}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Contoh: Halaman depan ${docType}`}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Catatan Singkat
            </label>
            <input
              type="text"
              maxLength={FIELD_LIMITS.DOC_NOTES_MAX}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Misal: Atas nama PT / pajak Mei 2027"
              className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => void handleFileChange(e)}
            className="hidden"
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            <Camera className="h-4 w-4" />
            <span>{isUploading ? 'Mengompresi & Mengunggah...' : 'Pilih / Ambil Foto Dokumen'}</span>
          </button>
        </div>
      </section>

      {/* Gallery of Legal Photos */}
      <section className="space-y-3">
        <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
          Arsip Foto Unit &amp; Dokumen Legal ({legalDocs.length})
        </h3>

        {legalDocs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <FileText className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Belum ada foto STNK, BPKB, atau dokumen legal yang diunggah untuk unit ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {legalDocs.map((docItem) => (
              <article
                key={docItem.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                  <img
                    src={docItem.imageDataUrl}
                    alt={docItem.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(docItem)}
                    aria-label={`Perbesar foto ${docItem.title}`}
                    className="absolute bottom-2.5 right-2.5 inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl bg-slate-950/75 text-white backdrop-blur-sm hover:bg-slate-950"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                        {docItem.docType}
                      </p>
                      <h4 className="truncate font-display text-sm font-bold text-slate-900 dark:text-white">
                        {docItem.title}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onDeleteDoc(docItem.id)}
                      aria-label={`Hapus foto ${docItem.title}`}
                      className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {docItem.notes && (
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                      {docItem.notes}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-white">
              <span className="truncate text-sm font-semibold">
                {previewDoc.docType} — {previewDoc.title}
              </span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                aria-label="Tutup pratinjau"
                className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex max-h-[80vh] items-center justify-center overflow-auto p-4">
              <img
                src={previewDoc.imageDataUrl}
                alt={previewDoc.title}
                referrerPolicy="no-referrer"
                className="max-h-[75vh] w-auto rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
