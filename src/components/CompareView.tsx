import React from 'react';
import { ArrowLeft, CheckCircle2, OctagonAlert, Trophy } from 'lucide-react';
import { INSPECTION_CATEGORIES } from '@/src/data/inspectionCatalog';
import type { Vehicle } from '@/src/types/inspection';
import { calculateVehicleScores, formatIDR, formatKm } from '@/src/utils/scoring';

interface CompareViewProps {
  vehicles: Vehicle[];
  onBack: () => void;
  onSelectVehicle: (vehicleId: string) => void;
}

export const CompareView: React.FC<CompareViewProps> = ({
  vehicles,
  onBack,
  onSelectVehicle,
}) => {
  if (vehicles.length < 2) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          Pilih Minimal 2 Unit untuk Dibandingkan
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Centang kotak perbandingan di sudut kanan atas kartu mobil pada halaman Garasi.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Garasi</span>
        </button>
      </div>
    );
  }

  const enriched = vehicles.map((v) => ({
    vehicle: v,
    computed: calculateVehicleScores({
      askingPrice: v.askingPrice,
      marketPrice: v.marketPrice,
      legalChecklist: v.legalChecklist,
      checklistResponses: v.checklistResponses || {},
    }),
  }));

  const maxPhysical = Math.max(...enriched.map((e) => e.computed.physicalScore));
  const maxValue = Math.max(...enriched.map((e) => e.computed.marketValueScore));
  const minEffective = Math.min(...enriched.map((e) => e.computed.effectivePrice));
  const topCandidate = [...enriched].sort(
    (a, b) => b.computed.marketValueScore - a.computed.marketValueScore
  )[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Perbandingan Kandidat ({vehicles.length} Unit)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluasi berdampingan skor fisik, biaya perbaikan, legalitas, dan rasio terhadap harga pasar.
            </p>
          </div>
        </div>
      </div>

      {topCandidate && (
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 sm:flex-row sm:items-center dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex items-start gap-3">
            <Trophy className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <div>
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Rekomendasi Pilihan Utama (Berdasarkan Skor Rasio & Kondisi)
              </p>
              <h2 className="mt-0.5 font-display text-lg font-bold text-slate-900 dark:text-white">
                {topCandidate.vehicle.name}
              </h2>
              <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">
                Skor Fisik{' '}
                <strong className="font-mono-tabular">{topCandidate.computed.physicalScore}/100</strong> · Skor Rasio Pasar{' '}
                <strong className="font-mono-tabular">{topCandidate.computed.marketValueScore}/100</strong> · Harga Efektif{' '}
                <strong className="font-mono-tabular">{formatIDR(topCandidate.computed.effectivePrice)}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectVehicle(topCandidate.vehicle.id)}
            className="min-h-[44px] rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
          >
            Lihat Detail Unit
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
              <th className="w-56 px-4 py-3.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                Parameter Penilaian
              </th>
              {enriched.map(({ vehicle }) => (
                <th key={vehicle.id} className="px-4 py-3.5 align-top">
                  <button
                    type="button"
                    onClick={() => onSelectVehicle(vehicle.id)}
                    className="text-left font-display text-sm font-bold text-blue-700 hover:underline dark:text-blue-400"
                  >
                    {vehicle.name}
                  </button>
                  <p className="mt-0.5 text-xs font-normal text-slate-500 dark:text-slate-400">
                    {vehicle.year} · {formatKm(vehicle.odometerKm)}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            <tr>
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                Skor Fisik Total
              </td>
              {enriched.map(({ vehicle, computed }) => (
                <td key={vehicle.id} className="px-4 py-3 font-mono-tabular font-bold">
                  <span
                    className={
                      computed.physicalScore === maxPhysical
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-white'
                    }
                  >
                    {computed.physicalScore}/100
                  </span>
                </td>
              ))}
            </tr>

            <tr>
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                Skor Rasio Harga Pasar
              </td>
              {enriched.map(({ vehicle, computed }) => (
                <td key={vehicle.id} className="px-4 py-3 font-mono-tabular font-bold">
                  <span
                    className={
                      computed.marketValueScore === maxValue
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-slate-900 dark:text-white'
                    }
                  >
                    {computed.marketValueScore}/100
                  </span>
                </td>
              ))}
            </tr>

            <tr>
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                Rekomendasi Akhir
              </td>
              {enriched.map(({ vehicle, computed }) => (
                <td key={vehicle.id} className="px-4 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {computed.overallVerdict}
                </td>
              ))}
            </tr>

            <tr>
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                Harga Penawaran
              </td>
              {enriched.map(({ vehicle }) => (
                <td key={vehicle.id} className="px-4 py-3 font-mono-tabular text-slate-900 dark:text-white">
                  {formatIDR(vehicle.askingPrice)}
                </td>
              ))}
            </tr>

            <tr>
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                Estimasi Biaya Perbaikan
              </td>
              {enriched.map(({ vehicle, computed }) => (
                <td key={vehicle.id} className="px-4 py-3 font-mono-tabular text-amber-700 dark:text-amber-400">
                  {formatIDR(computed.estimatedRepairCost)}
                </td>
              ))}
            </tr>

            <tr>
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                Harga Efektif (Harga + Perbaikan)
              </td>
              {enriched.map(({ vehicle, computed }) => (
                <td key={vehicle.id} className="px-4 py-3 font-mono-tabular font-bold">
                  <span
                    className={
                      computed.effectivePrice === minEffective
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-white'
                    }
                  >
                    {formatIDR(computed.effectivePrice)}
                  </span>
                </td>
              ))}
            </tr>

            <tr>
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                Selisih vs Harga Pasar Wajar
              </td>
              {enriched.map(({ vehicle, computed }) => (
                <td key={vehicle.id} className="px-4 py-3 font-mono-tabular text-xs font-semibold">
                  {vehicle.marketPrice > 0 ? (
                    <span
                      className={
                        computed.marketDelta >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-700 dark:text-red-400'
                      }
                    >
                      {computed.marketDelta >= 0
                        ? `+${formatIDR(computed.marketDelta)} (${computed.marketDeltaPercent}%)`
                        : `${formatIDR(computed.marketDelta)} (${computed.marketDeltaPercent}%)`}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
              ))}
            </tr>

            <tr>
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                Harga Baru Unit
              </td>
              {enriched.map(({ vehicle }) => (
                <td key={vehicle.id} className="px-4 py-3 font-mono-tabular text-xs text-slate-700 dark:text-slate-300">
                  {vehicle.newCarPrice && vehicle.newCarPrice > 0 ? formatIDR(vehicle.newCarPrice) : '-'}
                </td>
              ))}
            </tr>

            <tr>
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                Status Produksi Model
              </td>
              {enriched.map(({ vehicle }) => (
                <td key={vehicle.id} className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                  {vehicle.productionStatus || 'Belum Diketahui'}
                </td>
              ))}
            </tr>

            <tr>
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                Kelengkapan Dokumen Legal
              </td>
              {enriched.map(({ vehicle, computed }) => (
                <td key={vehicle.id} className="px-4 py-3 font-mono-tabular text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {computed.legalScore}%
                  </span>{' '}
                  <span className="text-slate-500">
                    ({vehicle.legalChecklist.bpkb ? 'BPKB ✓' : 'BPKB ✗'} ·{' '}
                    {vehicle.legalChecklist.stnk ? 'STNK ✓' : 'STNK ✗'})
                  </span>
                </td>
              ))}
            </tr>

            <tr>
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                Temuan Kritis / Red Flag
              </td>
              {enriched.map(({ vehicle, computed }) => (
                <td key={vehicle.id} className="px-4 py-3 text-xs">
                  {computed.redFlags.length === 0 ? (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Tidak ada
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-red-700 dark:text-red-400">
                      <OctagonAlert className="h-3.5 w-3.5" /> {computed.redFlags.length} temuan
                    </span>
                  )}
                </td>
              ))}
            </tr>

            {INSPECTION_CATEGORIES.map((cat) => (
              <tr key={cat.id}>
                <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400">
                  {cat.title} ({cat.weight}%)
                </td>
                {enriched.map(({ vehicle, computed }) => {
                  const found = computed.categoryBreakdown.find((c) => c.categoryId === cat.id);
                  return (
                    <td key={vehicle.id} className="px-4 py-2.5 font-mono-tabular text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {found?.score !== null && found?.score !== undefined
                        ? `${found.score}/100`
                        : 'Belum dicek'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
