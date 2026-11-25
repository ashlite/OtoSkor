import React, { useState } from 'react';
import { Plus, Receipt, Trash2, Wrench } from 'lucide-react';
import {
  FIELD_LIMITS,
  type ServiceRecord,
  type Vehicle,
  type WorkshopType,
} from '@/src/types/inspection';
import { formatIDR, formatKm } from '@/src/utils/scoring';

interface ServiceRecordTabProps {
  vehicle: Vehicle;
  serviceRecords: ServiceRecord[];
  onAddRecord: (input: {
    serviceDate: string;
    odometerKm: number;
    workshopName: string;
    workshopType: WorkshopType;
    workDescription: string;
    cost: number;
    hasReceipt: boolean;
  }) => Promise<void>;
  onDeleteRecord: (recordId: string) => Promise<void>;
}

export const ServiceRecordTab: React.FC<ServiceRecordTabProps> = ({
  vehicle,
  serviceRecords,
  onAddRecord,
  onDeleteRecord,
}) => {
  const [serviceDate, setServiceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [odometerKm, setOdometerKm] = useState(vehicle.odometerKm);
  const [workshopName, setWorkshopName] = useState('');
  const [workshopType, setWorkshopType] = useState<WorkshopType>('Bengkel Resmi');
  const [workDescription, setWorkDescription] = useState('');
  const [cost, setCost] = useState(0);
  const [hasReceipt, setHasReceipt] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalCost = serviceRecords.reduce((acc, r) => acc + (r.cost || 0), 0);
  const officialCount = serviceRecords.filter(
    (r) => r.workshopType === 'Bengkel Resmi'
  ).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!workshopName.trim() || !workDescription.trim()) {
      setErrorMsg('Nama bengkel dan rincian pekerjaan wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      await onAddRecord({
        serviceDate,
        odometerKm,
        workshopName: workshopName.trim(),
        workshopType,
        workDescription: workDescription.trim(),
        cost,
        hasReceipt,
      });
      setWorkshopName('');
      setWorkDescription('');
      setCost(0);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menambahkan riwayat servis.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Catatan Servis</p>
          <p className="mt-1 font-mono-tabular text-xl font-bold text-slate-900 dark:text-white">
            {serviceRecords.length} entri
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">Servis Bengkel Resmi</p>
          <p className="mt-1 font-mono-tabular text-xl font-bold text-blue-700 dark:text-blue-400">
            {officialCount} kali
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">Akumulasi Biaya Tercatat</p>
          <p className="mt-1 font-mono-tabular text-xl font-bold text-slate-900 dark:text-white">
            {formatIDR(totalCost)}
          </p>
        </div>
      </div>

      {/* Add Service Record Form */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Tambah Catatan Service Record
        </h2>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Tanggal Servis *
            </label>
            <input
              type="date"
              required
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 font-mono-tabular text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Odometer Saat Servis (km) *
            </label>
            <input
              type="number"
              required
              min={0}
              max={2000000}
              value={odometerKm}
              onChange={(e) => setOdometerKm(Number(e.target.value))}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 font-mono-tabular text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Jenis Bengkel
            </label>
            <select
              value={workshopType}
              onChange={(e) => setWorkshopType(e.target.value as WorkshopType)}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="Bengkel Resmi">Bengkel Resmi</option>
              <option value="Bengkel Spesialis">Bengkel Spesialis</option>
              <option value="Bengkel Umum">Bengkel Umum</option>
              <option value="Mandiri">Mandiri</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Biaya (Rp)
            </label>
            <input
              type="number"
              min={0}
              step={50000}
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 font-mono-tabular text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Nama Bengkel *
            </label>
            <input
              type="text"
              required
              maxLength={FIELD_LIMITS.WORKSHOP_NAME_MAX}
              value={workshopName}
              onChange={(e) => setWorkshopName(e.target.value)}
              placeholder="Contoh: Auto2000 Bintaro / Honda Pondok Indah"
              className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="sm:col-span-2 flex items-end">
            <label className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60">
              <input
                type="checkbox"
                checked={hasReceipt}
                onChange={(e) => setHasReceipt(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span>Ada bukti nota / stempel buku servis</span>
            </label>
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Pekerjaan / Penggantian Suku Cadang *
            </label>
            <input
              type="text"
              required
              maxLength={FIELD_LIMITS.WORK_DESC_MAX}
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="Contoh: Servis 60.000 km — ganti oli mesin, filter oli, oli transmisi CVT, kuras minyak rem"
              className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Service Record'}</span>
          </button>
        </div>
      </form>

      {/* Service History List */}
      <section className="space-y-3">
        <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
          Riwayat Perawatan Tercatat
        </h3>

        {serviceRecords.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <Wrench className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Belum ada catatan servis. Catat riwayat dari buku servis atau faktur bengkel untuk memvalidasi kewajaran odometer.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {serviceRecords.map((rec) => (
              <div
                key={rec.id}
                className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-start"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                      {rec.serviceDate}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{formatKm(rec.odometerKm)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{rec.workshopType}</span>
                    {rec.hasReceipt && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                          <Receipt className="h-3 w-3" /> Nota Ada
                        </span>
                      </>
                    )}
                  </div>
                  <p className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    {rec.workshopName}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {rec.workDescription}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end shrink-0">
                  <span className="font-mono-tabular text-sm font-bold text-slate-900 dark:text-white">
                    {formatIDR(rec.cost)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void onDeleteRecord(rec.id)}
                    aria-label="Hapus catatan servis"
                    className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
