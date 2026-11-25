import React, { useEffect, useState } from 'react';
import { ExternalLink, Globe, Loader2, Settings2, X } from 'lucide-react';
import {
  FIELD_LIMITS,
  type FuelType,
  type ProductionStatus,
  type SellerType,
  type TransmissionType,
  type Vehicle,
} from '@/src/types/inspection';
import type { VehicleFormInput } from '@/src/services/vehicleService';
import {
  fetchAiMarketPrice,
  fetchAiNewCarInfo,
  type MarketPriceEstimateResult,
  type NewCarInfoEstimateResult,
} from '@/src/services/aiEstimateService';
import { formatAiProviderLabel } from '@/src/services/aiSettingsService';
import { formatIDR } from '@/src/utils/scoring';

interface VehicleFormModalProps {
  isOpen: boolean;
  editingVehicle: Vehicle | null;
  onClose: () => void;
  onSubmit: (input: VehicleFormInput) => Promise<void>;
  onOpenAiSettings?: () => void;
}

const DEFAULT_FORM: VehicleFormInput = {
  name: '',
  brand: '',
  model: '',
  year: 2019,
  transmission: 'Matik (AT/CVT)',
  fuelType: 'Bensin',
  color: '',
  licensePlate: '',
  odometerKm: 65000,
  askingPrice: 185000000,
  marketPrice: 195000000,
  newCarPrice: 0,
  productionStatus: 'Belum Diketahui',
  location: '',
  sellerName: '',
  sellerPhone: '',
  sellerType: 'Perorangan',
  legalChecklist: {
    stnk: true,
    bpkb: true,
    faktur: true,
    taxActive: true,
    vinMatch: true,
    taxExpiry: '',
    notes: '',
  },
  notes: '',
};

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  isOpen,
  editingVehicle,
  onClose,
  onSubmit,
  onOpenAiSettings,
}) => {
  const [form, setForm] = useState<VehicleFormInput>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAiMarketLoading, setIsAiMarketLoading] = useState(false);
  const [isAiNewCarLoading, setIsAiNewCarLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMarketInfo, setAiMarketInfo] = useState<MarketPriceEstimateResult | null>(null);
  const [aiNewCarInfo, setAiNewCarInfo] = useState<NewCarInfoEstimateResult | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingVehicle) {
      setForm({
        name: editingVehicle.name,
        brand: editingVehicle.brand,
        model: editingVehicle.model,
        year: editingVehicle.year,
        transmission: editingVehicle.transmission,
        fuelType: editingVehicle.fuelType,
        color: editingVehicle.color,
        licensePlate: editingVehicle.licensePlate,
        odometerKm: editingVehicle.odometerKm,
        askingPrice: editingVehicle.askingPrice,
        marketPrice: editingVehicle.marketPrice,
        newCarPrice: editingVehicle.newCarPrice ?? 0,
        productionStatus: editingVehicle.productionStatus || 'Belum Diketahui',
        location: editingVehicle.location,
        sellerName: editingVehicle.sellerName,
        sellerPhone: editingVehicle.sellerPhone,
        sellerType: editingVehicle.sellerType,
        legalChecklist: { ...editingVehicle.legalChecklist },
        notes: editingVehicle.notes,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setErrorMsg(null);
    setAiError(null);
    setAiMarketInfo(null);
    setAiNewCarInfo(null);
  }, [isOpen, editingVehicle]);

  if (!isOpen) return null;

  const handleFetchAiMarketPrice = async () => {
    setAiError(null);
    if (!form.brand.trim() || !form.model.trim()) {
      setAiError('Isi Merek dan Model mobil terlebih dahulu agar AI dapat mencari harga pasar.');
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setAiError('Koneksi internet diperlukan untuk cek harga pasar AI. Anda tetap bisa mengisi manual.');
      return;
    }

    setIsAiMarketLoading(true);
    try {
      const result = await fetchAiMarketPrice({
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: form.year,
        transmission: form.transmission,
        fuelType: form.fuelType,
        odometerKm: form.odometerKm,
        location: form.location.trim(),
      });
      setForm((prev) => ({ ...prev, marketPrice: result.estimatedPrice }));
      setAiMarketInfo(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Gagal mengambil harga pasar dari AI.');
    } finally {
      setIsAiMarketLoading(false);
    }
  };

  const handleFetchAiNewCarInfo = async () => {
    setAiError(null);
    if (!form.brand.trim() || !form.model.trim()) {
      setAiError('Isi Merek dan Model mobil terlebih dahulu agar AI dapat mencari harga baru & status produksi.');
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setAiError('Koneksi internet diperlukan untuk cek harga baru AI. Anda tetap bisa mengisi manual.');
      return;
    }

    setIsAiNewCarLoading(true);
    try {
      const result = await fetchAiNewCarInfo({
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: form.year,
        transmission: form.transmission,
        fuelType: form.fuelType,
        location: form.location.trim(),
      });
      setForm((prev) => ({
        ...prev,
        newCarPrice: result.newCarPrice,
        productionStatus: result.productionStatus,
      }));
      setAiNewCarInfo(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Gagal mengambil info harga baru dari AI.');
    } finally {
      setIsAiNewCarLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!form.brand.trim() || !form.model.trim()) {
      setErrorMsg('Merek dan model kendaraan wajib diisi.');
      return;
    }
    if (!form.location.trim() || !form.sellerName.trim() || !form.sellerPhone.trim()) {
      setErrorMsg('Lokasi unit, nama pemilik/penjual, dan nomor kontak wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      const computedName =
        form.name.trim() || `${form.brand.trim()} ${form.model.trim()} ${form.year}`;
      await onSubmit({
        ...form,
        name: computedName.slice(0, FIELD_LIMITS.NAME_MAX),
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan data unit mobil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vehicle-form-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2
              id="vehicle-form-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              {editingVehicle ? 'Edit Data Unit & Legal' : 'Tambah Kandidat Mobil Bekas'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Catat spesifikasi unit, harga pasar, kontak penjual, dan status legal awal.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 overflow-y-auto p-5 space-y-6">
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          <section className="space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              01. Identitas & Spesifikasi Unit
            </h3>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nama / Label Kandidat (opsional)
                </label>
                <input
                  type="text"
                  maxLength={FIELD_LIMITS.NAME_MAX}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Misal: Honda HR-V E CVT 2019 — Unit Pak Budi"
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Merek *
                </label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.BRAND_MAX}
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="Toyota / Honda / Mitsubishi"
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Model & Tipe *
                </label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.MODEL_MAX}
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="Innova Reborn 2.4 V / Brio RS"
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Tahun Perakitan *
                </label>
                <input
                  type="number"
                  required
                  min={1960}
                  max={2035}
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 font-mono-tabular text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Odometer (km) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={2000000}
                  value={form.odometerKm}
                  onChange={(e) => setForm({ ...form, odometerKm: Number(e.target.value) })}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 font-mono-tabular text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Transmisi
                </label>
                <select
                  value={form.transmission}
                  onChange={(e) =>
                    setForm({ ...form, transmission: e.target.value as TransmissionType })
                  }
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="Matik (AT/CVT)">Matik (AT/CVT)</option>
                  <option value="Manual (MT)">Manual (MT)</option>
                  <option value="DCT / Dual-Clutch">DCT / Dual-Clutch</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Bahan Bakar
                </label>
                <select
                  value={form.fuelType}
                  onChange={(e) => setForm({ ...form, fuelType: e.target.value as FuelType })}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="Bensin">Bensin</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Listrik (EV)">Listrik (EV)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Warna Bodi
                </label>
                <input
                  type="text"
                  maxLength={FIELD_LIMITS.COLOR_MAX}
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  placeholder="Hitam Metalik / Putih Mutiara"
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nomor Polisi (Plat)
                </label>
                <input
                  type="text"
                  maxLength={FIELD_LIMITS.PLATE_MAX}
                  value={form.licensePlate}
                  onChange={(e) => setForm({ ...form, licensePlate: e.target.value.toUpperCase() })}
                  placeholder="B 1234 ABC"
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 font-mono-tabular text-sm uppercase text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Status Produksi Model Mobil
                </label>
                <select
                  value={form.productionStatus}
                  onChange={(e) =>
                    setForm({ ...form, productionStatus: e.target.value as ProductionStatus })
                  }
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="Belum Diketahui">Belum Diketahui (atau Cek via AI)</option>
                  <option value="Masih Diproduksi">Masih Diproduksi (Active)</option>
                  <option value="Diskontinue">Sudah Diskontinue (Stop Produksi)</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              02. Harga Penawaran, Harga Pasar &amp; Harga Baru Unit
            </h3>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Harga Jual Penjual (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={500000}
                  value={form.askingPrice}
                  onChange={(e) => setForm({ ...form, askingPrice: Number(e.target.value) })}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 font-mono-tabular text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Estimasi Harga Pasar Bekas (Rp) *
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleFetchAiMarketPrice()}
                    disabled={isAiMarketLoading || isAiNewCarLoading}
                    title="Ambil referensi harga pasar mobil bekas ini menggunakan AI"
                    className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 transition-colors hover:bg-blue-100 disabled:opacity-60 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50 whitespace-nowrap shrink-0"
                  >
                    {isAiMarketLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Globe className="h-3 w-3" />
                    )}
                    <span>{isAiMarketLoading ? 'Mencari...' : 'Cek AI'}</span>
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min={0}
                  step={500000}
                  value={form.marketPrice}
                  onChange={(e) => setForm({ ...form, marketPrice: Number(e.target.value) })}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 font-mono-tabular text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Harga Baru Unit / OTR Terakhir (Rp, opsional)
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleFetchAiNewCarInfo()}
                    disabled={isAiNewCarLoading || isAiMarketLoading}
                    title="Cek harga OTR baru unit ini dan status masih diproduksi / diskontinue lewat AI"
                    className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 transition-colors hover:bg-blue-100 disabled:opacity-60 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50 whitespace-nowrap shrink-0"
                  >
                    {isAiNewCarLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Globe className="h-3 w-3" />
                    )}
                    <span>{isAiNewCarLoading ? 'Mencari...' : 'Cek Harga Baru & Status AI'}</span>
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  step={1000000}
                  value={form.newCarPrice}
                  onChange={(e) => setForm({ ...form, newCarPrice: Number(e.target.value) })}
                  placeholder="0 (isi manual atau gunakan Cek Harga Baru & Status AI)"
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 font-mono-tabular text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            {aiError && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50/70 px-3.5 py-2.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                <span className="font-medium">{aiError}</span>
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

            {aiMarketInfo && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-xs dark:border-blue-900/60 dark:bg-blue-950/30">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-blue-900 dark:text-blue-200">
                    Referensi Pasar Bekas ({formatAiProviderLabel(aiMarketInfo.usedProvider)} · {aiMarketInfo.usedModel})
                  </span>
                  <span className="font-mono-tabular font-medium text-blue-800 dark:text-blue-300">
                    Rentang: {formatIDR(aiMarketInfo.priceLow)} – {formatIDR(aiMarketInfo.priceHigh)}
                  </span>
                </div>
                {aiMarketInfo.fallbackNotice && (
                  <p className="mt-1 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                    {aiMarketInfo.fallbackNotice}
                  </p>
                )}
                <p className="mt-1 leading-relaxed text-slate-700 dark:text-slate-300">
                  {aiMarketInfo.summary}
                </p>
                {aiMarketInfo.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {aiMarketInfo.sources.map((src, idx) => (
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

            {aiNewCarInfo && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                    Info Harga Baru &amp; Status Produksi ({formatAiProviderLabel(aiNewCarInfo.usedProvider)} · {aiNewCarInfo.usedModel})
                  </span>
                  <span className="font-mono-tabular font-bold text-emerald-800 dark:text-emerald-300">
                    {aiNewCarInfo.productionStatus}
                    {aiNewCarInfo.discontinuedYear ? ` (${aiNewCarInfo.discontinuedYear})` : ''}
                  </span>
                </div>
                {aiNewCarInfo.fallbackNotice && (
                  <p className="mt-1 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                    {aiNewCarInfo.fallbackNotice}
                  </p>
                )}
                <p className="mt-1 leading-relaxed text-slate-700 dark:text-slate-300">
                  {aiNewCarInfo.summary}
                </p>
                {aiNewCarInfo.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {aiNewCarInfo.sources.map((src, idx) => (
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
          </section>

          <section className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              03. Lokasi Unit & Kontak Pemilik / Penjual
            </h3>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Lokasi Unit *
                </label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.LOCATION_MAX}
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Contoh: Bintaro Sektor 9, Tangerang Selatan"
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nama Pemilik / Sales *
                </label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.SELLER_NAME_MAX}
                  value={form.sellerName}
                  onChange={(e) => setForm({ ...form, sellerName: e.target.value })}
                  placeholder="Budi Santoso"
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nomor Telepon / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={FIELD_LIMITS.SELLER_PHONE_MAX}
                  value={form.sellerPhone}
                  onChange={(e) => setForm({ ...form, sellerPhone: e.target.value })}
                  placeholder="081234567890"
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 font-mono-tabular text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Jenis Penjual
                </label>
                <select
                  value={form.sellerType}
                  onChange={(e) => setForm({ ...form, sellerType: e.target.value as SellerType })}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="Perorangan">Perorangan</option>
                  <option value="Showroom">Showroom</option>
                  <option value="Dealer Resmi Bekas">Dealer Resmi Bekas</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              04. Ringkasan Legalitas Awal
            </h3>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[
                { key: 'stnk', label: 'STNK Asli Ada' },
                { key: 'bpkb', label: 'BPKB Asli Ada (Tangan / Leasing Jelas)' },
                { key: 'faktur', label: 'Faktur & NIK Pembelian Ada' },
                { key: 'taxActive', label: 'Pajak Tahunan Hidup' },
                { key: 'vinMatch', label: 'Nomor Rangka & Mesin Cocok' },
              ].map((item) => {
                const k = item.key as 'stnk' | 'bpkb' | 'faktur' | 'taxActive' | 'vinMatch';
                return (
                  <label
                    key={k}
                    className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/60"
                  >
                    <input
                      type="checkbox"
                      checked={form.legalChecklist[k]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          legalChecklist: { ...form.legalChecklist, [k]: e.target.checked },
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                    <span>{item.label}</span>
                  </label>
                );
              })}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Masa Berlaku Pajak (opsional)
                </label>
                <input
                  type="text"
                  maxLength={30}
                  value={form.legalChecklist.taxExpiry || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      legalChecklist: { ...form.legalChecklist, taxExpiry: e.target.value },
                    })
                  }
                  placeholder="Misal: Agustus 2027"
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Catatan Legal / Umum
              </label>
              <textarea
                rows={2}
                maxLength={FIELD_LIMITS.VEHICLE_NOTES_MAX}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Misal: Tangan pertama dari baru, tangan kedua atas nama perusahaan, dll."
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[44px] rounded-xl bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {isSaving ? 'Menyimpan...' : editingVehicle ? 'Simpan Perubahan' : 'Simpan & Lanjut Inspeksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
