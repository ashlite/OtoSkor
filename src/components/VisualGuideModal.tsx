import React, { useEffect, useState } from 'react';
import { CheckCircle2, Eye, Info, OctagonAlert, X } from 'lucide-react';
import { VISUAL_GUIDES, type VisualGuideId } from '@/src/data/inspectionCatalog';
import { useBackHandler } from '@/src/hooks/useBackHandler';

interface VisualGuideModalProps {
  initialGuideId: VisualGuideId | null;
  onClose: () => void;
}

const GUIDE_ORDER: VisualGuideId[] = [
  'engine',
  'chassis',
  'undercarriage',
  'exterior',
  'interior',
  'electrical',
];

export const VisualGuideModal: React.FC<VisualGuideModalProps> = ({
  initialGuideId,
  onClose,
}) => {
  const [activeId, setActiveId] = useState<VisualGuideId>(initialGuideId || 'engine');

  useEffect(() => {
    if (initialGuideId) {
      setActiveId(initialGuideId);
    }
  }, [initialGuideId]);

  useBackHandler(initialGuideId !== null, onClose);

  if (!initialGuideId) return null;

  const guide = VISUAL_GUIDES[activeId];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="visual-guide-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-400">
              <Eye className="h-3.5 w-3.5 shrink-0" />
              <span>Panduan Visual Inspeksi (Siap Offline)</span>
            </div>
            <h2
              id="visual-guide-title"
              className="mt-0.5 truncate font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              {guide.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panduan visual"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-200 bg-slate-50 px-5 py-2.5 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {GUIDE_ORDER.map((id) => {
              const g = VISUAL_GUIDES[id];
              const isSelected = id === activeId;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveId(id)}
                  className={`min-h-[40px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-blue-700 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {g.title.split(',')[0]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-sm text-slate-600 dark:text-slate-300">{guide.subtitle}</p>

          <div className="relative mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
            <img
              src={guide.imageUrl}
              alt={guide.title}
              referrerPolicy="no-referrer"
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="grid grid-cols-2 border-t border-slate-200 bg-slate-900 text-xs font-semibold dark:border-slate-800">
              <div className="flex items-center gap-2 px-3 py-2 text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Kiri: Kondisi Baik</span>
              </div>
              <div className="flex items-center justify-end gap-2 border-l border-slate-700 px-3 py-2 text-red-300">
                <OctagonAlert className="h-4 w-4 shrink-0" />
                <span>Kanan: Tanda Kerusakan</span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <h3 className="flex items-center gap-2 font-display text-sm font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Ciri Kondisi Baik (Layak)</span>
              </h3>
              <ul className="mt-2.5 space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {guide.goodSigns.map((sign, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                    <span>{sign}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/60 dark:bg-red-950/20">
              <h3 className="flex items-center gap-2 font-display text-sm font-bold text-red-800 dark:text-red-300">
                <OctagonAlert className="h-4 w-4 shrink-0" />
                <span>Tanda Masalah / Red Flag</span>
              </h3>
              <ul className="mt-2.5 space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {guide.badSigns.map((sign, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />
                    <span>{sign}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-400" />
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              <strong className="font-semibold text-slate-900 dark:text-white">Tips Cek Lapangan: </strong>
              {guide.fieldTip}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
