import type { AiProvider, UserAiPreferences } from '@/src/types/inspection';

export interface AiModelOption {
  id: string;
  label: string;
  note: string;
}

export interface CustomInferencePreset {
  id: string;
  label: string;
  baseUrl: string;
  sampleModel: string;
}

export interface ProviderTokens {
  openai: string;
  claude: string;
  custom: string;
}

export const GEMINI_MODEL_OPTIONS: AiModelOption[] = [
  {
    id: 'gemini-4-hydrogen',
    label: 'Gemini 4 Hydrogen (Flash)',
    note: 'Cepat & seimbang untuk pencarian harga dan analisis foto.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    note: 'Paling ringan & hemat kuota — disarankan jika model utama penuh.',
  },
  {
    id: 'gemini-4-neon',
    label: 'Gemini 4 Neon (Pro)',
    note: 'Penalaran lebih mendalam untuk analisis detail.',
  },
  {
    id: 'gemini-4-carbon',
    label: 'Gemini 4 Carbon',
    note: 'Kapasitas penalaran kompleks.',
  },
];

export const OPENAI_MODEL_OPTIONS: AiModelOption[] = [
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    note: 'Cepat, hemat biaya token, mendukung teks & inspeksi foto.',
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    note: 'Akurasi tinggi untuk analisis visual inspeksi & estimasi.',
  },
  {
    id: 'gpt-4.1-mini',
    label: 'GPT-4.1 Mini',
    note: 'Ringan dan presisi untuk respons terstruktur.',
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    note: 'Model flagship untuk analisis kompleks.',
  },
];

export const CLAUDE_MODEL_OPTIONS: AiModelOption[] = [
  {
    id: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    note: 'Seimbang, cerdas, serta mendukung teks & analisis foto inspeksi.',
  },
  {
    id: 'claude-3-7-sonnet-latest',
    label: 'Claude 3.7 Sonnet',
    note: 'Akurasi tinggi untuk estimasi bengkel dan analisis gambar.',
  },
  {
    id: 'claude-3-5-haiku-latest',
    label: 'Claude 3.5 Haiku',
    note: 'Sangat cepat & hemat biaya token untuk cek harga/estimasi.',
  },
  {
    id: 'claude-opus-4-1',
    label: 'Claude Opus 4.1',
    note: 'Model flagship Anthropic untuk analisis detail.',
  },
];

export const CUSTOM_INFERENCE_PRESETS: CustomInferencePreset[] = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    sampleModel: 'anthropic/claude-sonnet-4',
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    sampleModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    sampleModel: 'deepseek-chat',
  },
  {
    id: 'together',
    label: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    sampleModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  },
];

export const DEFAULT_AI_PREFERENCES: UserAiPreferences = {
  provider: 'gemini',
  geminiModel: 'gemini-4-hydrogen',
  openaiModel: 'gpt-4o-mini',
  claudeModel: 'claude-sonnet-4-5',
  customBaseUrl: '',
  customModel: '',
  useWebSearch: true,
};

let activeUid: string | null = null;
let activePreferences: UserAiPreferences = { ...DEFAULT_AI_PREFERENCES };
let activeTokens: ProviderTokens = { openai: '', claude: '', custom: '' };

function getPrefsStorageKey(uid: string): string {
  return `otoskor_ai_prefs_${uid}`;
}

function getOpenAiTokenStorageKey(uid: string): string {
  return `otoskor_openai_token_${uid}`;
}

function getClaudeTokenStorageKey(uid: string): string {
  return `otoskor_claude_token_${uid}`;
}

function getCustomTokenStorageKey(uid: string): string {
  return `otoskor_custom_token_${uid}`;
}

export function formatAiProviderLabel(provider: AiProvider | undefined): string {
  switch (provider) {
    case 'openai':
      return 'OpenAI';
    case 'claude':
      return 'Claude';
    case 'custom':
      return 'Custom AI';
    default:
      return 'Gemini';
  }
}

export function sanitizePreferences(raw?: Partial<UserAiPreferences> | null): UserAiPreferences {
  const provider: AiProvider =
    raw?.provider === 'openai' || raw?.provider === 'claude' || raw?.provider === 'custom'
      ? raw.provider
      : 'gemini';

  const geminiModel =
    typeof raw?.geminiModel === 'string' && raw.geminiModel.trim()
      ? raw.geminiModel.trim().slice(0, 80)
      : DEFAULT_AI_PREFERENCES.geminiModel;

  const openaiModel =
    typeof raw?.openaiModel === 'string' && raw.openaiModel.trim()
      ? raw.openaiModel.trim().slice(0, 80)
      : DEFAULT_AI_PREFERENCES.openaiModel;

  const claudeModel =
    typeof raw?.claudeModel === 'string' && raw.claudeModel.trim()
      ? raw.claudeModel.trim().slice(0, 80)
      : DEFAULT_AI_PREFERENCES.claudeModel;

  const customBaseUrl =
    typeof raw?.customBaseUrl === 'string'
      ? raw.customBaseUrl.trim().replace(/\/+$/, '').slice(0, 250)
      : '';

  const customModel =
    typeof raw?.customModel === 'string'
      ? raw.customModel.trim().slice(0, 80)
      : '';

  const useWebSearch =
    typeof raw?.useWebSearch === 'boolean' ? raw.useWebSearch : DEFAULT_AI_PREFERENCES.useWebSearch;

  return {
    provider,
    geminiModel,
    openaiModel,
    claudeModel,
    customBaseUrl,
    customModel,
    useWebSearch,
  };
}

export function getStoredProviderTokens(uid: string): ProviderTokens {
  if (typeof window === 'undefined') {
    return { openai: '', claude: '', custom: '' };
  }
  try {
    return {
      openai: (localStorage.getItem(getOpenAiTokenStorageKey(uid)) || '').trim(),
      claude: (localStorage.getItem(getClaudeTokenStorageKey(uid)) || '').trim(),
      custom: (localStorage.getItem(getCustomTokenStorageKey(uid)) || '').trim(),
    };
  } catch {
    return { openai: '', claude: '', custom: '' };
  }
}

export function initializeAiSettingsForUser(
  uid: string | null,
  cloudPrefs?: Partial<UserAiPreferences> | null
): { preferences: UserAiPreferences; tokens: ProviderTokens } {
  activeUid = uid;
  if (!uid || typeof window === 'undefined') {
    activePreferences = sanitizePreferences(cloudPrefs);
    activeTokens = { openai: '', claude: '', custom: '' };
    return { preferences: activePreferences, tokens: { ...activeTokens } };
  }

  let localPrefs: Partial<UserAiPreferences> | null = null;
  try {
    const raw = localStorage.getItem(getPrefsStorageKey(uid));
    if (raw) {
      localPrefs = JSON.parse(raw) as Partial<UserAiPreferences>;
    }
  } catch {
    localPrefs = null;
  }

  const merged = sanitizePreferences(cloudPrefs || localPrefs);
  activePreferences = merged;
  try {
    localStorage.setItem(getPrefsStorageKey(uid), JSON.stringify(merged));
  } catch {
    // Ignore storage quota errors
  }

  activeTokens = getStoredProviderTokens(uid);

  return {
    preferences: activePreferences,
    tokens: { ...activeTokens },
  };
}

export function updateLocalAiSettings(
  uid: string,
  preferences: UserAiPreferences,
  tokens?: Partial<ProviderTokens>
): UserAiPreferences {
  const clean = sanitizePreferences(preferences);
  activeUid = uid;
  activePreferences = clean;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getPrefsStorageKey(uid), JSON.stringify(clean));

      const persistToken = (key: string, val: string | undefined, slot: keyof ProviderTokens) => {
        if (val === undefined) return;
        const trimmed = val.trim();
        activeTokens[slot] = trimmed;
        if (trimmed) {
          localStorage.setItem(key, trimmed);
        } else {
          localStorage.removeItem(key);
        }
      };

      if (tokens) {
        persistToken(getOpenAiTokenStorageKey(uid), tokens.openai, 'openai');
        persistToken(getClaudeTokenStorageKey(uid), tokens.claude, 'claude');
        persistToken(getCustomTokenStorageKey(uid), tokens.custom, 'custom');
      }
    } catch {
      // Ignore storage errors
    }
  }
  return clean;
}

export function getActiveAiRequestPayload(): {
  preferences: UserAiPreferences;
  tokens: ProviderTokens;
} {
  if (activeUid && typeof window !== 'undefined') {
    const stored = getStoredProviderTokens(activeUid);
    activeTokens = {
      openai: activeTokens.openai || stored.openai,
      claude: activeTokens.claude || stored.claude,
      custom: activeTokens.custom || stored.custom,
    };
  }
  return {
    preferences: activePreferences,
    tokens: { ...activeTokens },
  };
}
