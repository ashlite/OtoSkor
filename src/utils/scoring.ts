import { ALL_INSPECTION_ITEMS, INSPECTION_CATEGORIES } from '@/src/data/inspectionCatalog';
import type {
  ChecklistItemResponse,
  LegalChecklist,
  OverallVerdict,
} from '@/src/types/inspection';

export interface CategoryScoreSummary {
  categoryId: string;
  title: string;
  weight: number;
  score: number | null;
  evaluatedCount: number;
  totalCount: number;
  defectCount: number;
  attentionCount: number;
}

export interface ScoreComputationResult {
  physicalScore: number;
  marketValueScore: number;
  estimatedRepairCost: number;
  effectivePrice: number;
  marketDelta: number;
  marketDeltaPercent: number;
  legalScore: number;
  redFlags: string[];
  overallVerdict: OverallVerdict;
  evaluatedItems: number;
  totalItems: number;
  categoryBreakdown: CategoryScoreSummary[];
}

export function computeLegalCompleteness(legal: LegalChecklist): {
  score: number;
  missingCritical: string[];
} {
  let points = 0;
  const missingCritical: string[] = [];

  if (legal.bpkb) points += 30;
  else missingCritical.push('BPKB asli belum ada / belum terverifikasi');

  if (legal.stnk) points += 25;
  else missingCritical.push('STNK tidak lengkap');

  if (legal.vinMatch) points += 25;
  else missingCritical.push('Nomor rangka & mesin belum cocok / belum dicek');

  if (legal.taxActive) points += 12;
  if (legal.faktur) points += 8;

  return { score: points, missingCritical };
}

export function calculateVehicleScores(params: {
  askingPrice: number;
  marketPrice: number;
  legalChecklist: LegalChecklist;
  checklistResponses: Record<string, ChecklistItemResponse>;
}): ScoreComputationResult {
  const { askingPrice, marketPrice, legalChecklist, checklistResponses } = params;

  let totalRepair = 0;
  let evaluatedItems = 0;
  const redFlags: string[] = [];

  const categoryBreakdown: CategoryScoreSummary[] = INSPECTION_CATEGORIES.map((category) => {
    let sumPoints = 0;
    let countEvaluated = 0;
    let defectCount = 0;
    let attentionCount = 0;

    for (const item of category.items) {
      const resp = checklistResponses[item.id];
      if (!resp || resp.status === 'na') {
        continue;
      }

      countEvaluated += 1;
      evaluatedItems += 1;
      totalRepair += Math.max(0, Number(resp.repairCost) || 0);

      if (resp.status === 'good') {
        sumPoints += 100;
      } else if (resp.status === 'attention') {
        sumPoints += 58;
        attentionCount += 1;
      } else if (resp.status === 'defect') {
        sumPoints += 10;
        defectCount += 1;
        if (item.isRedFlagCandidate && item.redFlagLabel) {
          redFlags.push(item.redFlagLabel);
        }
      }
    }

    const score = countEvaluated > 0 ? Math.round(sumPoints / countEvaluated) : null;

    return {
      categoryId: category.id,
      title: category.title,
      weight: category.weight,
      score,
      evaluatedCount: countEvaluated,
      totalCount: category.items.length,
      defectCount,
      attentionCount,
    };
  });

  const { score: legalScore, missingCritical } = computeLegalCompleteness(legalChecklist);
  if (evaluatedItems > 0 && !legalChecklist.bpkb) {
    redFlags.push('Dokumen BPKB belum terverifikasi');
  }
  if (evaluatedItems > 0 && !legalChecklist.vinMatch) {
    redFlags.push('Kecocokan nomor rangka & mesin belum terverifikasi');
  }

  // Weighted physical score across evaluated categories (90% inspection + 10% legal verification)
  let weightedSum = 0;
  let activeWeight = 0;
  for (const cat of categoryBreakdown) {
    if (cat.score !== null) {
      weightedSum += cat.score * cat.weight;
      activeWeight += cat.weight;
    }
  }

  let physicalScore = 0;
  if (activeWeight > 0) {
    const rawInspectionScore = weightedSum / activeWeight;
    physicalScore = Math.round(rawInspectionScore * 0.9 + legalScore * 0.1);
  } else {
    physicalScore = Math.round(legalScore * 0.2);
  }

  // Red flag safety cap so flooded/crashed cars cannot pretend to score 90+
  if (redFlags.length >= 2) {
    physicalScore = Math.min(physicalScore, 48);
  } else if (redFlags.length === 1) {
    physicalScore = Math.min(physicalScore, 64);
  }

  physicalScore = Math.max(0, Math.min(100, physicalScore));

  // Market Value Ratio Score
  const safeAsking = Math.max(0, askingPrice || 0);
  const safeMarket = Math.max(0, marketPrice || 0);
  const effectivePrice = safeAsking + totalRepair;
  const marketDelta = safeMarket > 0 ? safeMarket - effectivePrice : 0;
  const marketDeltaPercent =
    safeMarket > 0 ? Math.round(((safeMarket - effectivePrice) / safeMarket) * 1000) / 10 : 0;

  let priceAdvantageScore = 50;
  if (safeMarket > 0 && effectivePrice > 0) {
    const ratio = safeMarket / effectivePrice; // > 1 means cheaper than market (good value)
    // ratio 0.80 -> 15, ratio 1.00 -> 65, ratio 1.15 -> 95
    priceAdvantageScore = Math.round(Math.max(5, Math.min(100, 65 + (ratio - 1) * 200)));
  }

  let marketValueScore = 0;
  if (evaluatedItems === 0 && safeMarket <= 0) {
    marketValueScore = 0;
  } else if (evaluatedItems === 0) {
    marketValueScore = Math.round(priceAdvantageScore * 0.6);
  } else if (safeMarket <= 0) {
    marketValueScore = physicalScore;
  } else {
    marketValueScore = Math.round(physicalScore * 0.58 + priceAdvantageScore * 0.42);
  }

  if (redFlags.length > 0) {
    marketValueScore = Math.min(marketValueScore, 55);
  }
  marketValueScore = Math.max(0, Math.min(100, marketValueScore));

  // Determine Overall Verdict
  let overallVerdict: OverallVerdict = 'Belum Dinilai';
  if (evaluatedItems >= 5) {
    if (redFlags.length > 0 || physicalScore < 50) {
      overallVerdict = 'Hindari / Red Flag';
    } else if (physicalScore >= 80 && marketValueScore >= 75) {
      overallVerdict = 'Sangat Layak';
    } else if (physicalScore >= 68 && marketValueScore >= 58) {
      overallVerdict = 'Layak Pertimbangkan';
    } else {
      overallVerdict = 'Perlu Negosiasi';
    }
  } else if (missingCritical.length > 0 && evaluatedItems > 0) {
    overallVerdict = 'Perlu Negosiasi';
  }

  return {
    physicalScore,
    marketValueScore,
    estimatedRepairCost: totalRepair,
    effectivePrice,
    marketDelta,
    marketDeltaPercent,
    legalScore,
    redFlags: redFlags.slice(0, 20),
    overallVerdict,
    evaluatedItems,
    totalItems: ALL_INSPECTION_ITEMS.length,
    categoryBreakdown,
  };
}

export function formatIDR(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Math.round(value || 0));
}

export function formatKm(value: number): string {
  return `${new Intl.NumberFormat('id-ID').format(Math.round(value || 0))} km`;
}

export function sanitizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }
  return digits;
}
