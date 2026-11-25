import type { Timestamp } from 'firebase/firestore';

export type TransmissionType = 'Matik (AT/CVT)' | 'Manual (MT)' | 'DCT / Dual-Clutch';
export type FuelType = 'Bensin' | 'Diesel' | 'Hybrid' | 'Listrik (EV)';
export type ProductionStatus = 'Masih Diproduksi' | 'Diskontinue' | 'Belum Diketahui';
export type SellerType = 'Perorangan' | 'Showroom' | 'Dealer Resmi Bekas';
export type DocType = 'STNK' | 'BPKB' | 'Faktur' | 'Notice Pajak' | 'Kuitansi' | 'Foto Unit / Lainnya';
export type WorkshopType = 'Bengkel Resmi' | 'Bengkel Spesialis' | 'Bengkel Umum' | 'Mandiri';
export type InspectionStatus = 'good' | 'attention' | 'defect' | 'na';
export type OverallVerdict =
  | 'Sangat Layak'
  | 'Layak Pertimbangkan'
  | 'Perlu Negosiasi'
  | 'Hindari / Red Flag'
  | 'Belum Dinilai';

export type AiProvider = 'gemini' | 'openai' | 'claude' | 'custom';

export interface UserAiPreferences {
  provider: AiProvider;
  geminiModel: string;
  openaiModel: string;
  claudeModel: string;
  customBaseUrl: string;
  customModel: string;
  useWebSearch: boolean;
}

export interface LegalChecklist {
  stnk: boolean;
  bpkb: boolean;
  faktur: boolean;
  taxActive: boolean;
  vinMatch: boolean;
  taxExpiry?: string;
  notes: string;
}

export interface ChecklistItemResponse {
  status: InspectionStatus;
  note: string;
  repairCost: number;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  transmission: TransmissionType;
  fuelType: FuelType;
  color: string;
  licensePlate: string;
  odometerKm: number;
  askingPrice: number;
  marketPrice: number;
  newCarPrice?: number;
  productionStatus?: ProductionStatus;
  estimatedRepairCost: number;
  location: string;
  sellerName: string;
  sellerPhone: string;
  sellerType: SellerType;
  legalChecklist: LegalChecklist;
  checklistResponses: Record<string, ChecklistItemResponse>;
  physicalScore: number;
  marketValueScore: number;
  overallVerdict: OverallVerdict;
  redFlags: string[];
  notes: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface LegalDocument {
  id: string;
  ownerId: string;
  vehicleId: string;
  docType: DocType;
  title: string;
  imageDataUrl: string;
  notes: string;
  createdAt?: Timestamp;
}

export interface ServiceRecord {
  id: string;
  ownerId: string;
  vehicleId: string;
  serviceDate: string;
  odometerKm: number;
  workshopName: string;
  workshopType: WorkshopType;
  workDescription: string;
  cost: number;
  hasReceipt: boolean;
  createdAt?: Timestamp;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  aiSettings?: UserAiPreferences;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export const FIELD_LIMITS = {
  NAME_MAX: 120,
  BRAND_MAX: 60,
  MODEL_MAX: 80,
  COLOR_MAX: 40,
  PLATE_MAX: 20,
  LOCATION_MAX: 160,
  SELLER_NAME_MAX: 100,
  SELLER_PHONE_MAX: 32,
  LEGAL_NOTES_MAX: 500,
  VEHICLE_NOTES_MAX: 2000,
  DOC_TITLE_MAX: 120,
  DOC_NOTES_MAX: 400,
  DOC_IMAGE_MAX_BYTES: 440000,
  WORKSHOP_NAME_MAX: 120,
  WORK_DESC_MAX: 600,
  RED_FLAGS_MAX: 20,
} as const;
