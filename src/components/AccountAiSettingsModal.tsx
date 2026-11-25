import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  CLAUDE_MODEL_OPTIONS,
  CUSTOM_INFERENCE_PRESETS,
  GEMINI_MODEL_OPTIONS,
  OPENAI_MODEL_OPTIONS,
  formatAiProviderLabel,
  getStoredProviderTokens,
  sanitizePreferences,
  type ProviderTokens,
} from '@/src/services/aiSettingsService';
import { testAiConnection } from '@/src/services/aiEstimateService';
import type { AiProvider, UserAiPreferences } from '@/src/types/inspection';

interface AccountAiSettingsModalProps {
  isOpen: boolean;
  user: User;
  preferences: UserAiPreferences;
  onClose: () => void;
  onSaveSettings: (preferences: UserAiPreferences, tokens: ProviderTokens) => Promise<void>;
}

const PROVIDER_CARDS: Array<{
  id: AiProvider;
  title: string;
  subtitle: string;
  icon: 'cpu' | 'key' | 'globe';
}> = [
  {
    id: 'gemini',
    title: 'Google Gemini',
    subtitle: 'Layanan bawaan akun & pencarian web.',
    icon: 'cpu',
  },
  {
    id: 'openai',
    title: 'OpenAI',
    subtitle: 'Token pribadi OpenAI (GPT-4o / 4.1).',
    icon: 'key',
  },
  {
    id: 'claude',
    title: 'Anthropic Claude',
    subtitle: 'Token pribadi Anthropic (Sonnet / Haiku).',
    icon: 'key',
  },
  {
    id: 'custom',
    title: 'Custom OpenAI-Compatible',
    subtitle: 'OpenRouter, Groq, DeepSeek, Together, atau proxy HTTPS.',
    icon: 'globe',
  },
];

export const AccountAiSettingsModal: React.FC<AccountAiSettingsModalProps> = ({
  isOpen,
  user,
  preferences,
  onClose,
  onSaveSettings,
}) => {
  const [draft, setDraft] = useState<UserAiPreferences>(preferences);
  const [tokens, setTokens] = useState<ProviderTokens>({ openai: '', claude: '', custom: '' });
  const [showToken, setShowToken] = useState(false);
  const [useCustomGeminiModel, setUseCustomGeminiModel] = useState(false);
  const [useCustomOpenAiModel, setUseCustomOpenAiModel] = useState(false);
  const [useCustomClaudeModel, setUseCustomClaudeModel] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const clean = sanitizePreferences(preferences);
    setDraft(clean);
    setTokens(getStoredProviderTokens(user.uid));
    setUseCustomGeminiModel(
      !GEMINI_MODEL_OPTIONS.some((opt) => opt.id === clean.geminiModel)
    );
    setUseCustomOpenAiModel(
      !OPENAI_MODEL_OPTIONS.some((opt) => opt.id === clean.openaiModel)
    );
    setUseCustomClaudeModel(
      !CLAUDE_MODEL_OPTIONS.some((opt) => opt.id === clean.claudeModel)
    );
    setShowToken(false);
    setTestResult(null);
    setErrorMsg(null);
  }, [isOpen, preferences, user.uid]);

  if (!isOpen) return null;

  const validateBeforeAction = (clean: UserAiPreferences): string | null => {
    if (clean.provider === 'openai' && !tokens.openai.trim()) {
      return 'Token API OpenAI wajib diisi jika Anda memilih provider OpenAI.';
    }
    if (clean.provider === 'claude' && !tokens.claude.trim()) {
      return 'Token API Anthropic Claude wajib diisi jika Anda memilih provider Claude.';
    }
    if (clean.provider === 'custom') {
      if (!clean.customBaseUrl.trim()) {
        return 'Endpoint Base URL wajib diisi untuk Custom AI (contoh: https://openrouter.ai/api/v1).';
      }
      if (!clean.customBaseUrl.trim().toLowerCase().startsWith('https://')) {
        return 'Endpoint Base URL Custom AI wajib menggunakan protokol https:// demi keamanan.';
      }
      if (!clean.customModel.trim()) {
        return 'Model ID wajib diisi untuk Custom AI (contoh: anthropic/claude-sonnet-4).';
      }
    }
    return null;
  };

  const handleTest = async () => {
    setErrorMsg(null);
    setTestResult(null);
    const clean = sanitizePreferences(draft);
    const validationErr = validateBeforeAction(clean);
    if (validationErr) {
      setErrorMsg(validationErr);
      return;
    }

    setIsTesting(true);
    try {
      const res = await testAiConnection(clean, {
        openai: tokens.openai.trim(),
        claude: tokens.claude.trim(),
        custom: tokens.custom.trim(),
      });
      setTestResult({
        ok: true,
        text:
          res.fallbackNotice ||
          res.message ||
          `Terhubung ke ${formatAiProviderLabel(res.usedProvider)} (${res.usedModel}).`,
      });
    } catch (err) {
      setTestResult({
        ok: false,
        text: err instanceof Error ? err.message : 'Uji koneksi AI gagal.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const clean = sanitizePreferences(draft);
    const validationErr = validateBeforeAction(clean);
    if (validationErr) {
      setErrorMsg(validationErr);
      return;
    }

    setIsSaving(true);
    try {
      await onSaveSettings(clean, {
        openai: tokens.openai.trim(),
        claude: tokens.claude.trim(),
        custom: tokens.custom.trim(),
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menyimpan pengaturan akun & AI.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const activeTokenKey: keyof ProviderTokens | null =
    draft.provider === 'openai' || draft.provider === 'claude' || draft.provider === 'custom'
      ? draft.provider
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-ai-settings-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2
              id="account-ai-settings-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              Pengaturan Akun &amp; Model AI
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {user.displayName || 'Pengguna'} · {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan AI"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSave(e)} className="flex-1 space-y-5 overflow-y-auto p-5">
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          {/* Provider Selection */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
              Pilih Provider AI Utama
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {PROVIDER_CARDS.map((card) => {
                const isSelected = draft.provider === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => {
                      setDraft((prev) => ({ ...prev, provider: card.id }));
                      setShowToken(false);
                      setTestResult(null);
                      setErrorMsg(null);
                    }}
                    className={`flex min-h-[68px] flex-col justify-center rounded-xl border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-blue-700 bg-blue-50/70 ring-2 ring-blue-700/15 dark:border-blue-500 dark:bg-blue-950/40'
                        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-slate-900 dark:text-white">
                        {card.icon === 'cpu' && (
                          <Cpu className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                        )}
                        {card.icon === 'key' && (
                          <KeyRound className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                        )}
                        {card.icon === 'globe' && (
                          <Globe className="h-4 w-4 text-indigo-700 dark:text-indigo-400" />
                        )}
                        <span>{card.title}</span>
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-700 dark:text-blue-400" />
                      )}
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                      {card.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {draft.provider === 'gemini' && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Model Gemini
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseCustomGeminiModel((prev) => !prev)}
                    className="text-[11px] font-semibold text-blue-700 hover:underline dark:text-blue-400"
                  >
                    {useCustomGeminiModel ? 'Pilih dari daftar' : 'Isi ID model manual'}
                  </button>
                </div>

                {!useCustomGeminiModel ? (
                  <select
                    value={draft.geminiModel}
                    onChange={(e) => setDraft({ ...draft, geminiModel: e.target.value })}
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {GEMINI_MODEL_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label} ({opt.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    maxLength={80}
                    value={draft.geminiModel}
                    onChange={(e) => setDraft({ ...draft, geminiModel: e.target.value })}
                    placeholder="Contoh: gemini-3.1-flash-lite"
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 font-mono-tabular text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                )}

                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                  {GEMINI_MODEL_OPTIONS.find((m) => m.id === draft.geminiModel)?.note ||
                    'Jika model utama terkena limit kuota 429, sistem otomatis mencoba model ringan gemini-3.1-flash-lite.'}
                </p>
              </div>

              <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
                <input
                  type="checkbox"
                  checked={draft.useWebSearch}
                  onChange={(e) => setDraft({ ...draft, useWebSearch: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <span>
                  <strong className="block text-slate-900 dark:text-white">
                    Gunakan Pencarian Web Internet (Google Search)
                  </strong>
                  <span className="mt-0.5 block text-slate-500 dark:text-slate-400">
                    Membantu mencari iklan harga pasar terkini. Nonaktifkan opsi ini jika sering
                    terkena error kuota sementara penuh agar memakai pengetahuan langsung model.
                  </span>
                </span>
              </label>
            </div>
          )}

          {draft.provider === 'openai' && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Token API OpenAI *
                  </label>
                  {tokens.openai && (
                    <button
                      type="button"
                      onClick={() => setTokens((prev) => ({ ...prev, openai: '' }))}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 hover:underline dark:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Hapus Token</span>
                    </button>
                  )}
                </div>

                <div className="relative mt-1.5">
                  <input
                    type={showToken ? 'text' : 'password'}
                    autoComplete="off"
                    value={tokens.openai}
                    onChange={(e) => setTokens((prev) => ({ ...prev, openai: e.target.value }))}
                    placeholder="sk-proj-..."
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white pl-3.5 pr-11 font-mono-tabular text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((prev) => !prev)}
                    aria-label={showToken ? 'Sembunyikan token' : 'Tampilkan token'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Model OpenAI
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseCustomOpenAiModel((prev) => !prev)}
                    className="text-[11px] font-semibold text-blue-700 hover:underline dark:text-blue-400"
                  >
                    {useCustomOpenAiModel ? 'Pilih dari daftar' : 'Isi ID model manual'}
                  </button>
                </div>

                {!useCustomOpenAiModel ? (
                  <select
                    value={draft.openaiModel}
                    onChange={(e) => setDraft({ ...draft, openaiModel: e.target.value })}
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {OPENAI_MODEL_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label} ({opt.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    maxLength={80}
                    value={draft.openaiModel}
                    onChange={(e) => setDraft({ ...draft, openaiModel: e.target.value })}
                    placeholder="Contoh: gpt-4o-mini"
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 font-mono-tabular text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                )}

                <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  {OPENAI_MODEL_OPTIONS.find((m) => m.id === draft.openaiModel)?.note ||
                    'Pastikan model mendukung input teks & gambar untuk Inspeksi AI foto.'}
                </p>
              </div>
            </div>
          )}

          {draft.provider === 'claude' && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Token API Anthropic Claude *
                  </label>
                  {tokens.claude && (
                    <button
                      type="button"
                      onClick={() => setTokens((prev) => ({ ...prev, claude: '' }))}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 hover:underline dark:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Hapus Token</span>
                    </button>
                  )}
                </div>

                <div className="relative mt-1.5">
                  <input
                    type={showToken ? 'text' : 'password'}
                    autoComplete="off"
                    value={tokens.claude}
                    onChange={(e) => setTokens((prev) => ({ ...prev, claude: e.target.value }))}
                    placeholder="sk-ant-api03-..."
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white pl-3.5 pr-11 font-mono-tabular text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((prev) => !prev)}
                    aria-label={showToken ? 'Sembunyikan token' : 'Tampilkan token'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Model Claude
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseCustomClaudeModel((prev) => !prev)}
                    className="text-[11px] font-semibold text-blue-700 hover:underline dark:text-blue-400"
                  >
                    {useCustomClaudeModel ? 'Pilih dari daftar' : 'Isi ID model manual'}
                  </button>
                </div>

                {!useCustomClaudeModel ? (
                  <select
                    value={draft.claudeModel}
                    onChange={(e) => setDraft({ ...draft, claudeModel: e.target.value })}
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {CLAUDE_MODEL_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label} ({opt.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    maxLength={80}
                    value={draft.claudeModel}
                    onChange={(e) => setDraft({ ...draft, claudeModel: e.target.value })}
                    placeholder="Contoh: claude-sonnet-4-5"
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 font-mono-tabular text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                )}

                <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  {CLAUDE_MODEL_OPTIONS.find((m) => m.id === draft.claudeModel)?.note ||
                    'Model Claude modern mendukung analisis foto untuk Inspeksi AI maupun estimasi harga.'}
                </p>
              </div>
            </div>
          )}

          {draft.provider === 'custom' && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <div>
                <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Isi Cepat Contoh Endpoint Populer (Kompatibel Protokol OpenAI)
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CUSTOM_INFERENCE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          customBaseUrl: preset.baseUrl,
                          customModel: preset.sampleModel,
                        }))
                      }
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Endpoint Base URL (HTTPS) *
                </label>
                <input
                  type="url"
                  maxLength={250}
                  value={draft.customBaseUrl}
                  onChange={(e) => setDraft({ ...draft, customBaseUrl: e.target.value })}
                  placeholder="https://openrouter.ai/api/v1"
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 font-mono-tabular text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Sistem otomatis memanggil <span className="font-mono-tabular">/chat/completions</span> pada URL ini.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Model ID *
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={draft.customModel}
                  onChange={(e) => setDraft({ ...draft, customModel: e.target.value })}
                  placeholder="Contoh: anthropic/claude-sonnet-4 atau llama-3.3-70b-versatile"
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 font-mono-tabular text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    API Token / Bearer Key
                  </label>
                  {tokens.custom && (
                    <button
                      type="button"
                      onClick={() => setTokens((prev) => ({ ...prev, custom: '' }))}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 hover:underline dark:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Hapus Token</span>
                    </button>
                  )}
                </div>

                <div className="relative mt-1.5">
                  <input
                    type={showToken ? 'text' : 'password'}
                    autoComplete="off"
                    value={tokens.custom}
                    onChange={(e) => setTokens((prev) => ({ ...prev, custom: e.target.value }))}
                    placeholder="Bearer token dari provider inference Anda"
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white pl-3.5 pr-11 font-mono-tabular text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((prev) => !prev)}
                    aria-label={showToken ? 'Sembunyikan token' : 'Tampilkan token'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTokenKey && (
            <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5 text-[11px] leading-relaxed text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
              <span>
                Semua token API hanya disimpan di penyimpanan lokal browser perangkat ini (tidak
                disimpan ke database cloud) dan dikirim terenkripsi ke endpoint AI pilihan Anda.
              </span>
            </p>
          )}

          {testResult && (
            <div
              className={`rounded-xl border px-4 py-3 text-xs font-medium ${
                testResult.ok
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
                  : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
              }`}
            >
              {testResult.text}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              disabled={isTesting || isSaving}
              onClick={() => void handleTest()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
              <span>{isTesting ? 'Menguji...' : 'Uji Koneksi AI'}</span>
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="min-h-[44px] rounded-xl bg-blue-700 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
