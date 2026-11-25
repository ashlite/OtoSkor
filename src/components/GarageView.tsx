import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Car,
  CheckSquare,
  MapPin,
  OctagonAlert,
  Phone,
  Plus,
  Scale,
  Search,
  Square,
} from 'lucide-react';
import type { OverallVerdict, Vehicle } from '@/src/types/inspection';
import { formatIDR, formatKm } from '@/src/utils/scoring';

interface GarageViewProps {
  vehicles: Vehicle[];
  isLoading: boolean;
  compareIds: string[];
  onToggleCompare: (vehicleId: string) => void;
  onSelectVehicle: (vehicleId: string) => void;
  onAddVehicle: () => void;
  onOpenCompare: () => void;
}

type SortMode = 'value' | 'physical' | 'price_asc' | 'recent';

export const GarageView: React.FC<GarageViewProps> = ({
  vehicles,
  isLoading,
  compareIds,
  onToggleCompare,
  onSelectVehicle,
  onAddVehicle,
  onOpenCompare,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<'all' | OverallVerdict>('all');
  const [sortBy, setSortBy] = useState<SortMode>('value');

  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = vehicles.filter((v) => {
      if (verdictFilter !== 'all' && v.overallVerdict !== verdictFilter) {
        return false;
      }
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q) ||
        v.sellerName.toLowerCase().includes(q) ||
        v.licensePlate.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'value') return b.marketValueScore - a.marketValueScore;
      if (sortBy === 'physical') return b.physicalScore - a.physicalScore;
      if (sortBy === 'price_asc') return a.askingPrice - b.askingPrice;
      return 0;
    });
  }, [vehicles, searchQuery, verdictFilter, sortBy]);

  const stats = useMemo(() => {
    if (vehicles.length === 0) {
      return { total: 0, bestPhysical: 0, bestValue: 0, redFlagCount: 0 };
    }
    return {
      total: vehicles.length,
      bestPhysical: Math.max(...vehicles.map((v) => v.physicalScore)),
      bestValue: Math.max(...vehicles.map((v) => v.marketValueScore)),
      redFlagCount: vehicles.filter((v) => v.redFlags && v.redFlags.length > 0).length,
    };
  }, [vehicles]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 dark:text-emerald-400';
    if (score >= 65) return 'text-blue-700 dark:text-blue-400';
    if (score >= 50) return 'text-amber-700 dark:text-amber-400';
    return 'text-red-700 dark:text-red-400';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Garasi Kandidat Mobil Bekas
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Kelola unit survei, nilai kondisi fisik serta rasio harga pasar, dan bandingkan kandidat terbaik.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {compareIds.length >= 2 && (
            <button
              type="button"
              onClick={onOpenCompare}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-blue-700 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50 whitespace-nowrap shrink-0"
            >
              <Scale className="h-4 w-4" />
              <span>Bandingkan ({compareIds.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={onAddVehicle}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Unit</span>
          </button>
        </div>
      </div>

      {/* 4-Column Summary Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Kandidat</p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-slate-900 dark:text-white">
            {stats.total} unit
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Skor Fisik Tertinggi
          </p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {stats.bestPhysical}/100
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Skor Rasio Pasar Terbaik
          </p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-blue-700 dark:text-blue-400">
            {stats.bestValue}/100
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Unit Dengan Red Flag
          </p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-amber-700 dark:text-amber-400">
            {stats.redFlagCount} unit
          </p>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Car className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-white">
            Belum ada kandidat mobil bekas
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Mulai dengan mendata unit mobil pertama—masukkan informasi legal, foto STNK/BPKB, harga jual serta kontak penjual, lalu lanjutkan checklist inspeksi.
          </p>
          <button
            type="button"
            onClick={onAddVehicle}
            className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Unit Pertama</span>
          </button>
        </div>
      ) : (
        <>
          {/* Filter & Search Toolbar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari merek, model, lokasi, plat, atau penjual..."
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 overflow-x-auto dark:bg-slate-800">
                {(
                  [
                    { key: 'all', label: 'Semua' },
                    { key: 'Sangat Layak', label: 'Sangat Layak' },
                    { key: 'Layak Pertimbangkan', label: 'Layak' },
                    { key: 'Perlu Negosiasi', label: 'Negosiasi' },
                    { key: 'Hindari / Red Flag', label: 'Red Flag' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setVerdictFilter(tab.key)}
                    className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      verdictFilter === tab.key
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortMode)}
                aria-label="Urutkan kandidat"
                className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="value">Urutkan: Skor Rasio Pasar</option>
                <option value="physical">Urutkan: Skor Fisik</option>
                <option value="price_asc">Urutkan: Harga Termurah</option>
                <option value="recent">Urutkan: Terbaru Diperbarui</option>
              </select>
            </div>
          </div>

          {filteredVehicles.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Tidak ada unit mobil yang cocok dengan filter atau kata kunci pencarian.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredVehicles.map((vehicle) => {
                const isSelectedForCompare = compareIds.includes(vehicle.id);
                const effectivePrice = vehicle.askingPrice + (vehicle.estimatedRepairCost || 0);
                const delta = vehicle.marketPrice > 0 ? vehicle.marketPrice - effectivePrice : 0;

                return (
                  <article
                    key={vehicle.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate font-display text-base font-bold text-slate-900 dark:text-white">
                            {vehicle.name}
                          </h2>
                          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                            {vehicle.year} · {vehicle.transmission} ·{' '}
                            <span className="font-mono-tabular">{formatKm(vehicle.odometerKm)}</span>
                            {vehicle.licensePlate ? ` · ${vehicle.licensePlate}` : ''}
                            {vehicle.productionStatus && vehicle.productionStatus !== 'Belum Diketahui'
                              ? ` · ${vehicle.productionStatus}`
                              : ''}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => onToggleCompare(vehicle.id)}
                          aria-label={
                            isSelectedForCompare
                              ? `Hapus ${vehicle.name} dari perbandingan`
                              : `Pilih ${vehicle.name} untuk dibandingkan`
                          }
                          className={`inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl transition-colors shrink-0 ${
                            isSelectedForCompare
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          {isSelectedForCompare ? (
                            <CheckSquare className="h-5 w-5" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                      </div>

                      {/* Dual Score Strip (Clean Hairline Divided, Zero Pill Clutter) */}
                      <div className="mt-4 grid grid-cols-2 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-slate-50/70 py-3 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/50">
                        <div className="px-3.5">
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Skor Fisik Total
                          </p>
                          <p
                            className={`mt-0.5 font-mono-tabular text-xl font-bold ${getScoreColor(
                              vehicle.physicalScore
                            )}`}
                          >
                            {vehicle.physicalScore}
                            <span className="text-xs font-normal text-slate-400">/100</span>
                          </p>
                        </div>
                        <div className="px-3.5">
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Skor Rasio Pasar
                          </p>
                          <p
                            className={`mt-0.5 font-mono-tabular text-xl font-bold ${getScoreColor(
                              vehicle.marketValueScore
                            )}`}
                          >
                            {vehicle.marketValueScore}
                            <span className="text-xs font-normal text-slate-400">/100</span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-1.5 text-sm">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Harga Penjual
                          </span>
                          <span className="font-mono-tabular font-bold text-slate-900 dark:text-white">
                            {formatIDR(vehicle.askingPrice)}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Est. Perbaikan + Harga
                          </span>
                          <span className="font-mono-tabular text-xs font-medium text-slate-700 dark:text-slate-300">
                            {formatIDR(effectivePrice)}
                          </span>
                        </div>
                        {vehicle.newCarPrice !== undefined && vehicle.newCarPrice > 0 && (
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Harga Baru Unit
                            </span>
                            <span className="font-mono-tabular text-xs text-slate-600 dark:text-slate-400">
                              {formatIDR(vehicle.newCarPrice)}
                            </span>
                          </div>
                        )}
                        {vehicle.marketPrice > 0 && (
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Selisih Pasar
                            </span>
                            <span
                              className={`font-mono-tabular text-xs font-semibold ${
                                delta >= 0
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-red-700 dark:text-red-400'
                              }`}
                            >
                              {delta >= 0 ? `Hemat ${formatIDR(delta)}` : `Lebih mahal ${formatIDR(Math.abs(delta))}`}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
                        <div className="flex items-center gap-2 truncate">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{vehicle.location}</span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">
                            {vehicle.sellerName} · {vehicle.sellerPhone}
                          </span>
                        </div>
                      </div>

                      {vehicle.redFlags && vehicle.redFlags.length > 0 && (
                        <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-800 dark:bg-red-950/40 dark:text-red-300">
                          <OctagonAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span className="line-clamp-2">{vehicle.redFlags[0]}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {vehicle.overallVerdict}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectVehicle(vehicle.id)}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white whitespace-nowrap shrink-0"
                      >
                        <span>Buka Inspeksi</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
