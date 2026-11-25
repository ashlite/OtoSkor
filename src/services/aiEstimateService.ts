import { getActiveAiRequestPayload, type ProviderTokens } from '@/src/services/aiSettingsService';
import type { AiProvider, ProductionStatus, UserAiPreferences } from '@/src/types/inspection';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AiRuntimeMeta {
  usedProvider?: AiProvider;
  usedModel?: string;
  fallbackNotice?: string;
}

export interface MarketPriceEstimateResult extends AiRuntimeMeta {
  estimatedPrice: number;
  priceLow: number;
  priceHigh: number;
  summary: string;
  sources: GroundingSource[];
}

export interface NewCarInfoEstimateResult extends AiRuntimeMeta {
  newCarPrice: number;
  productionStatus: Exclude<ProductionStatus, 'Belum Diketahui'>;
  discontinuedYear?: number | null;
  summary: string;
  sources: GroundingSource[];
}

export interface RepairCostEstimateResult extends AiRuntimeMeta {
  estimatedCost: number;
  partsEstimate: number;
  laborEstimate: number;
  summary: string;
  sources: GroundingSource[];
}

export interface CategoryAiInspectionItemResult {
  itemId: string;
  label: string;
  canAssessFromPhoto: boolean;
  status: 'good' | 'attention' | 'defect' | 'na';
  note: string;
  estimatedRepairCost: number;
  uncheckableReason: string;
}

export interface CategoryAiInspectionResult extends AiRuntimeMeta {
  overallObservation: string;
  analyzedPhotoCount: number;
  items: CategoryAiInspectionItemResult[];
}

export interface AiConnectionTestResult extends AiRuntimeMeta {
  ok: boolean;
  message: string;
}

function getModelForProvider(prefs: UserAiPreferences): string {
  switch (prefs.provider) {
    case 'openai':
      return prefs.openaiModel;
    case 'claude':
      return prefs.claudeModel;
    case 'custom':
      return prefs.customModel;
    default:
      return prefs.geminiModel;
  }
}

async function postAiJson<T>(
  url: string,
  payload: Record<string, unknown>,
  override?: { preferences?: UserAiPreferences; tokens?: ProviderTokens }
): Promise<T> {
  const active = getActiveAiRequestPayload();
  const prefs = override?.preferences || active.preferences;
  const tokens = override?.tokens || active.tokens;

  const model = getModelForProvider(prefs);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (prefs.provider === 'openai' && tokens.openai.trim()) {
    headers['x-openai-api-key'] = tokens.openai.trim();
  } else if (prefs.provider === 'claude' && tokens.claude.trim()) {
    headers['x-claude-api-key'] = tokens.claude.trim();
  } else if (prefs.provider === 'custom' && tokens.custom.trim()) {
    headers['x-custom-api-key'] = tokens.custom.trim();
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...payload,
      aiConfig: {
        provider: prefs.provider,
        model,
        customBaseUrl: prefs.provider === 'custom' ? prefs.customBaseUrl : undefined,
        useWebSearch: prefs.useWebSearch,
      },
    }),
  });

  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'Gagal menghubungi layanan AI.');
  }
  return data;
}

export async function fetchAiMarketPrice(params: {
  brand: string;
  model: string;
  year: number;
  transmission: string;
  fuelType: string;
  odometerKm: number;
  location: string;
}): Promise<MarketPriceEstimateResult> {
  return postAiJson<MarketPriceEstimateResult>('/api/ai/market-price', params);
}

export async function fetchAiNewCarInfo(params: {
  brand: string;
  model: string;
  year: number;
  transmission: string;
  fuelType: string;
  location: string;
}): Promise<NewCarInfoEstimateResult> {
  return postAiJson<NewCarInfoEstimateResult>('/api/ai/new-car-info', params);
}

export async function fetchAiRepairCost(params: {
  brand: string;
  model: string;
  year: number;
  transmission: string;
  fuelType: string;
  itemLabel: string;
  itemHint: string;
  issueNote: string;
  status: string;
}): Promise<RepairCostEstimateResult> {
  return postAiJson<RepairCostEstimateResult>('/api/ai/repair-cost', params);
}

export async function fetchAiCategoryInspection(params: {
  brand: string;
  model: string;
  year: number;
  transmission: string;
  fuelType: string;
  odometerKm: number;
  categoryTitle: string;
  items: Array<{
    id: string;
    label: string;
    hint: string;
    defaultRepairEstimate?: number;
  }>;
  images: string[];
}): Promise<CategoryAiInspectionResult> {
  return postAiJson<CategoryAiInspectionResult>('/api/ai/inspect-category', params);
}

export async function testAiConnection(
  preferences: UserAiPreferences,
  tokens: ProviderTokens
): Promise<AiConnectionTestResult> {
  return postAiJson<AiConnectionTestResult>(
    '/api/ai/test',
    {},
    { preferences, tokens }
  );
}
