import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '@/src/firebase';
import {
  FIELD_LIMITS,
  type ChecklistItemResponse,
  type DocType,
  type FuelType,
  type LegalChecklist,
  type LegalDocument,
  type ProductionStatus,
  type SellerType,
  type ServiceRecord,
  type TransmissionType,
  type UserAiPreferences,
  type UserProfile,
  type Vehicle,
  type WorkshopType,
} from '@/src/types/inspection';
import { calculateVehicleScores } from '@/src/utils/scoring';

function generateSafeId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${random}`;
}

function clampString(value: string, maxLen: number): string {
  return (value || '').trim().slice(0, maxLen);
}

function sanitizeLegalChecklist(input: LegalChecklist): LegalChecklist {
  return {
    stnk: Boolean(input.stnk),
    bpkb: Boolean(input.bpkb),
    faktur: Boolean(input.faktur),
    taxActive: Boolean(input.taxActive),
    vinMatch: Boolean(input.vinMatch),
    taxExpiry: clampString(input.taxExpiry || '', 30),
    notes: clampString(input.notes || '', FIELD_LIMITS.LEGAL_NOTES_MAX),
  };
}

export async function upsertUserProfile(user: User): Promise<void> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    const payload = {
      uid: user.uid,
      email: clampString(user.email || 'user@otoskor.app', 254),
      displayName: clampString(user.displayName || 'Pengguna OtoSkor', 120) || 'Pengguna OtoSkor',
      photoURL: clampString(user.photoURL || '', 1000),
      updatedAt: serverTimestamp(),
    };

    if (!snap.exists()) {
      await setDoc(userRef, {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        email: payload.email,
        displayName: payload.displayName,
        photoURL: payload.photoURL,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export function subscribeToUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const userPath = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => {
      onData(snapshot.exists() ? (snapshot.data() as UserProfile) : null);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, userPath);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function updateUserAiSettings(
  uid: string,
  aiSettings: UserAiPreferences
): Promise<void> {
  const userPath = `users/${uid}`;
  const provider =
    aiSettings.provider === 'openai' ||
    aiSettings.provider === 'claude' ||
    aiSettings.provider === 'custom'
      ? aiSettings.provider
      : 'gemini';

  try {
    await updateDoc(doc(db, 'users', uid), {
      aiSettings: {
        provider,
        geminiModel: clampString(aiSettings.geminiModel, 80) || 'gemini-4-hydrogen',
        openaiModel: clampString(aiSettings.openaiModel, 80) || 'gpt-4o-mini',
        claudeModel: clampString(aiSettings.claudeModel, 80) || 'claude-sonnet-4-5',
        customBaseUrl: clampString(aiSettings.customBaseUrl, 250).replace(/\/+$/, ''),
        customModel: clampString(aiSettings.customModel, 80),
        useWebSearch: Boolean(aiSettings.useWebSearch),
      },
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export function subscribeToVehicles(
  uid: string,
  onData: (vehicles: Vehicle[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const colPath = `users/${uid}/vehicles`;
  const q = query(collection(db, 'users', uid, 'vehicles'), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => d.data() as Vehicle)
        .sort((a, b) => {
          const aMs = a.updatedAt?.toMillis?.() ?? 0;
          const bMs = b.updatedAt?.toMillis?.() ?? 0;
          return bMs - aMs;
        });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, colPath);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export function subscribeToLegalDocs(
  uid: string,
  vehicleId: string,
  onData: (docs: LegalDocument[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const colPath = `users/${uid}/vehicles/${vehicleId}/legalDocs`;
  const q = query(
    collection(db, 'users', uid, 'vehicles', vehicleId, 'legalDocs'),
    where('ownerId', '==', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => d.data() as LegalDocument)
        .sort((a, b) => {
          const aMs = a.createdAt?.toMillis?.() ?? 0;
          const bMs = b.createdAt?.toMillis?.() ?? 0;
          return bMs - aMs;
        });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, colPath);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export function subscribeToServiceRecords(
  uid: string,
  vehicleId: string,
  onData: (records: ServiceRecord[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const colPath = `users/${uid}/vehicles/${vehicleId}/serviceRecords`;
  const q = query(
    collection(db, 'users', uid, 'vehicles', vehicleId, 'serviceRecords'),
    where('ownerId', '==', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => d.data() as ServiceRecord)
        .sort((a, b) => (b.serviceDate || '').localeCompare(a.serviceDate || ''));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, colPath);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export interface VehicleFormInput {
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
  newCarPrice: number;
  productionStatus: ProductionStatus;
  location: string;
  sellerName: string;
  sellerPhone: string;
  sellerType: SellerType;
  legalChecklist: LegalChecklist;
  notes: string;
}

export async function createVehicle(uid: string, input: VehicleFormInput): Promise<string> {
  const vehicleId = generateSafeId('veh');
  const docPath = `users/${uid}/vehicles/${vehicleId}`;
  const legalChecklist = sanitizeLegalChecklist(input.legalChecklist);
  const askingPrice = Math.max(0, Math.round(Number(input.askingPrice) || 0));
  const marketPrice = Math.max(0, Math.round(Number(input.marketPrice) || 0));
  const newCarPrice = Math.max(0, Math.round(Number(input.newCarPrice) || 0));
  const productionStatus: ProductionStatus =
    input.productionStatus === 'Masih Diproduksi' || input.productionStatus === 'Diskontinue'
      ? input.productionStatus
      : 'Belum Diketahui';

  const computed = calculateVehicleScores({
    askingPrice,
    marketPrice,
    legalChecklist,
    checklistResponses: {},
  });

  const payload = {
    id: vehicleId,
    ownerId: uid,
    name: clampString(input.name, FIELD_LIMITS.NAME_MAX) || `${input.brand} ${input.model}`,
    brand: clampString(input.brand, FIELD_LIMITS.BRAND_MAX) || 'Lainnya',
    model: clampString(input.model, FIELD_LIMITS.MODEL_MAX) || 'Unit',
    year: Math.min(2035, Math.max(1960, Math.round(Number(input.year) || 2020))),
    transmission: input.transmission,
    fuelType: input.fuelType,
    color: clampString(input.color, FIELD_LIMITS.COLOR_MAX),
    licensePlate: clampString(input.licensePlate.toUpperCase(), FIELD_LIMITS.PLATE_MAX),
    odometerKm: Math.max(0, Math.round(Number(input.odometerKm) || 0)),
    askingPrice,
    marketPrice,
    newCarPrice,
    productionStatus,
    estimatedRepairCost: computed.estimatedRepairCost,
    location: clampString(input.location, FIELD_LIMITS.LOCATION_MAX) || '-',
    sellerName: clampString(input.sellerName, FIELD_LIMITS.SELLER_NAME_MAX) || '-',
    sellerPhone: clampString(input.sellerPhone, FIELD_LIMITS.SELLER_PHONE_MAX) || '-',
    sellerType: input.sellerType,
    legalChecklist,
    checklistResponses: {},
    physicalScore: computed.physicalScore,
    marketValueScore: computed.marketValueScore,
    overallVerdict: computed.overallVerdict,
    redFlags: computed.redFlags,
    notes: clampString(input.notes, FIELD_LIMITS.VEHICLE_NOTES_MAX),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'users', uid, 'vehicles', vehicleId), payload);
    return vehicleId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function updateVehicleProfileAndLegal(
  uid: string,
  existingVehicle: Vehicle,
  input: VehicleFormInput
): Promise<void> {
  const docPath = `users/${uid}/vehicles/${existingVehicle.id}`;
  const legalChecklist = sanitizeLegalChecklist(input.legalChecklist);
  const askingPrice = Math.max(0, Math.round(Number(input.askingPrice) || 0));
  const marketPrice = Math.max(0, Math.round(Number(input.marketPrice) || 0));
  const newCarPrice = Math.max(0, Math.round(Number(input.newCarPrice) || 0));
  const productionStatus: ProductionStatus =
    input.productionStatus === 'Masih Diproduksi' || input.productionStatus === 'Diskontinue'
      ? input.productionStatus
      : 'Belum Diketahui';

  const computed = calculateVehicleScores({
    askingPrice,
    marketPrice,
    legalChecklist,
    checklistResponses: existingVehicle.checklistResponses || {},
  });

  const payload = {
    name: clampString(input.name, FIELD_LIMITS.NAME_MAX) || `${input.brand} ${input.model}`,
    brand: clampString(input.brand, FIELD_LIMITS.BRAND_MAX) || 'Lainnya',
    model: clampString(input.model, FIELD_LIMITS.MODEL_MAX) || 'Unit',
    year: Math.min(2035, Math.max(1960, Math.round(Number(input.year) || 2020))),
    transmission: input.transmission,
    fuelType: input.fuelType,
    color: clampString(input.color, FIELD_LIMITS.COLOR_MAX),
    licensePlate: clampString(input.licensePlate.toUpperCase(), FIELD_LIMITS.PLATE_MAX),
    odometerKm: Math.max(0, Math.round(Number(input.odometerKm) || 0)),
    askingPrice,
    marketPrice,
    newCarPrice,
    productionStatus,
    location: clampString(input.location, FIELD_LIMITS.LOCATION_MAX) || '-',
    sellerName: clampString(input.sellerName, FIELD_LIMITS.SELLER_NAME_MAX) || '-',
    sellerPhone: clampString(input.sellerPhone, FIELD_LIMITS.SELLER_PHONE_MAX) || '-',
    sellerType: input.sellerType,
    legalChecklist,
    notes: clampString(input.notes, FIELD_LIMITS.VEHICLE_NOTES_MAX),
    physicalScore: computed.physicalScore,
    marketValueScore: computed.marketValueScore,
    overallVerdict: computed.overallVerdict,
    redFlags: computed.redFlags,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(doc(db, 'users', uid, 'vehicles', existingVehicle.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function updateVehicleInspection(
  uid: string,
  vehicle: Vehicle,
  checklistResponses: Record<string, ChecklistItemResponse>,
  notes?: string
): Promise<void> {
  const docPath = `users/${uid}/vehicles/${vehicle.id}`;
  const sanitizedResponses: Record<string, ChecklistItemResponse> = {};
  for (const [key, val] of Object.entries(checklistResponses)) {
    sanitizedResponses[key] = {
      status: val.status,
      note: clampString(val.note || '', 300),
      repairCost: Math.max(0, Math.round(Number(val.repairCost) || 0)),
    };
  }

  const computed = calculateVehicleScores({
    askingPrice: vehicle.askingPrice,
    marketPrice: vehicle.marketPrice,
    legalChecklist: vehicle.legalChecklist,
    checklistResponses: sanitizedResponses,
  });

  try {
    await updateDoc(doc(db, 'users', uid, 'vehicles', vehicle.id), {
      checklistResponses: sanitizedResponses,
      estimatedRepairCost: computed.estimatedRepairCost,
      physicalScore: computed.physicalScore,
      marketValueScore: computed.marketValueScore,
      overallVerdict: computed.overallVerdict,
      redFlags: computed.redFlags,
      notes: clampString(notes !== undefined ? notes : vehicle.notes, FIELD_LIMITS.VEHICLE_NOTES_MAX),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function addLegalDocument(
  uid: string,
  vehicleId: string,
  input: {
    docType: DocType;
    title: string;
    imageDataUrl: string;
    notes: string;
  }
): Promise<void> {
  const docId = generateSafeId('leg');
  const docPath = `users/${uid}/vehicles/${vehicleId}/legalDocs/${docId}`;

  if (input.imageDataUrl.length > FIELD_LIMITS.DOC_IMAGE_MAX_BYTES) {
    throw new Error('Ukuran file foto melebihi batas penyimpanan.');
  }

  try {
    await setDoc(doc(db, 'users', uid, 'vehicles', vehicleId, 'legalDocs', docId), {
      id: docId,
      ownerId: uid,
      vehicleId,
      docType: input.docType,
      title: clampString(input.title, FIELD_LIMITS.DOC_TITLE_MAX) || input.docType,
      imageDataUrl: input.imageDataUrl,
      notes: clampString(input.notes, FIELD_LIMITS.DOC_NOTES_MAX),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function deleteLegalDocument(
  uid: string,
  vehicleId: string,
  docId: string
): Promise<void> {
  const docPath = `users/${uid}/vehicles/${vehicleId}/legalDocs/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'vehicles', vehicleId, 'legalDocs', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function addServiceRecord(
  uid: string,
  vehicleId: string,
  input: {
    serviceDate: string;
    odometerKm: number;
    workshopName: string;
    workshopType: WorkshopType;
    workDescription: string;
    cost: number;
    hasReceipt: boolean;
  }
): Promise<void> {
  const recordId = generateSafeId('srv');
  const docPath = `users/${uid}/vehicles/${vehicleId}/serviceRecords/${recordId}`;

  try {
    await setDoc(doc(db, 'users', uid, 'vehicles', vehicleId, 'serviceRecords', recordId), {
      id: recordId,
      ownerId: uid,
      vehicleId,
      serviceDate: clampString(input.serviceDate, 20),
      odometerKm: Math.max(0, Math.round(Number(input.odometerKm) || 0)),
      workshopName: clampString(input.workshopName, FIELD_LIMITS.WORKSHOP_NAME_MAX) || 'Bengkel',
      workshopType: input.workshopType,
      workDescription: clampString(input.workDescription, FIELD_LIMITS.WORK_DESC_MAX) || 'Servis berkala',
      cost: Math.max(0, Math.round(Number(input.cost) || 0)),
      hasReceipt: Boolean(input.hasReceipt),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function deleteServiceRecord(
  uid: string,
  vehicleId: string,
  recordId: string
): Promise<void> {
  const docPath = `users/${uid}/vehicles/${vehicleId}/serviceRecords/${recordId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'vehicles', vehicleId, 'serviceRecords', recordId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function deleteVehicleCascade(uid: string, vehicleId: string): Promise<void> {
  const vehiclePath = `users/${uid}/vehicles/${vehicleId}`;
  try {
    const [legalSnap, serviceSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, 'users', uid, 'vehicles', vehicleId, 'legalDocs'),
          where('ownerId', '==', uid)
        )
      ),
      getDocs(
        query(
          collection(db, 'users', uid, 'vehicles', vehicleId, 'serviceRecords'),
          where('ownerId', '==', uid)
        )
      ),
    ]);

    const batch = writeBatch(db);
    legalSnap.docs.forEach((d) => batch.delete(d.ref));
    serviceSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'users', uid, 'vehicles', vehicleId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, vehiclePath);
  }
}
