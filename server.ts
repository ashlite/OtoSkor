import 'dotenv/config';
import dns from 'node:dns/promises';
import net from 'node:net';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type, type GenerateContentResponse } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

type AiProvider = 'gemini' | 'openai' | 'claude' | 'custom';

interface AiRuntimeConfig {
  provider: AiProvider;
  model: string;
  customBaseUrl: string;
  useWebSearch: boolean;
  openaiToken: string;
  claudeToken: string;
  customToken: string;
}

class HttpAiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new HttpAiError(
      503,
      'Kunci Gemini API server belum tersedia. Anda dapat memilih OpenAI, Claude, atau Custom AI di Pengaturan Akun & AI.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function resolveAiRuntime(req: express.Request): AiRuntimeConfig {
  const rawCfg = (req.body?.aiConfig || {}) as {
    provider?: unknown;
    model?: unknown;
    customBaseUrl?: unknown;
    useWebSearch?: unknown;
  };
  const provider: AiProvider =
    rawCfg.provider === 'openai' || rawCfg.provider === 'claude' || rawCfg.provider === 'custom'
      ? rawCfg.provider
      : 'gemini';

  const defaultModel =
    provider === 'openai'
      ? 'gpt-4o-mini'
      : provider === 'claude'
        ? 'claude-sonnet-4-5'
        : provider === 'custom'
          ? ''
          : 'gemini-4-hydrogen';

  const rawModel = typeof rawCfg.model === 'string' ? rawCfg.model.trim() : '';
  const model =
    rawModel && /^[a-zA-Z0-9._:/@-]{1,80}$/.test(rawModel) ? rawModel : defaultModel;
  const customBaseUrl =
    typeof rawCfg.customBaseUrl === 'string' ? rawCfg.customBaseUrl.trim().slice(0, 250) : '';
  const useWebSearch = typeof rawCfg.useWebSearch === 'boolean' ? rawCfg.useWebSearch : true;
  const openaiToken = (req.header('x-openai-api-key') || '').trim();
  const claudeToken = (req.header('x-claude-api-key') || '').trim();
  const customToken = (req.header('x-custom-api-key') || '').trim();

  return {
    provider,
    model,
    customBaseUrl,
    useWebSearch,
    openaiToken,
    claudeToken,
    customToken,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isQuotaOrRateError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.toLowerCase().includes('quota') ||
    msg.toLowerCase().includes('rate limit')
  );
}

function extractJsonObject(rawText: string): Record<string, unknown> {
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error('Respons AI tidak mengandung format JSON yang valid.');
  }
  const slice = cleaned.slice(startIdx, endIdx + 1);
  return JSON.parse(slice) as Record<string, unknown>;
}

interface GroundingSource {
  title: string;
  uri: string;
}

function extractGroundingSources(response: GenerateContentResponse): GroundingSource[] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];

  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    const title = chunk.web?.title || uri;
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      sources.push({ title: title || 'Sumber Referensi', uri });
    }
    if (sources.length >= 4) break;
  }

  return sources;
}

function parseSafeNumber(val: unknown): number {
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateOrReservedIp(rawIp: string): boolean {
  const ip = rawIp.trim().toLowerCase().split('%')[0];
  const ipVersion = net.isIP(ip);
  if (ipVersion === 4) {
    return isPrivateOrReservedIpv4(ip);
  }
  if (ipVersion === 6) {
    if (ip === '::' || ip === '::1') return true;
    if (ip.startsWith('::ffff:')) {
      const mapped = ip.slice('::ffff:'.length);
      if (net.isIP(mapped) === 4) {
        return isPrivateOrReservedIpv4(mapped);
      }
      return true;
    }
    if (
      ip.startsWith('fc') ||
      ip.startsWith('fd') ||
      ip.startsWith('fe8') ||
      ip.startsWith('fe9') ||
      ip.startsWith('fea') ||
      ip.startsWith('feb') ||
      ip.startsWith('ff')
    ) {
      return true;
    }
    return false;
  }
  return true;
}

async function validateAndNormalizeCustomBaseUrl(rawUrl: string): Promise<string> {
  if (!rawUrl) {
    throw new HttpAiError(
      400,
      'Endpoint Base URL untuk Custom AI belum diisi. Buka Pengaturan Akun & AI.'
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new HttpAiError(
      400,
      'Format Base URL Custom AI tidak valid. Gunakan format HTTPS seperti https://openrouter.ai/api/v1.'
    );
  }

  if (parsed.protocol !== 'https:') {
    throw new HttpAiError(
      400,
      'Base URL Custom AI wajib menggunakan protokol HTTPS demi keamanan token Anda.'
    );
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new HttpAiError(
      400,
      'Base URL Custom AI tidak boleh mengandung kredensial URL, query parameter, atau fragment.'
    );
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    !host ||
    !host.includes('.') ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localdomain') ||
    host === 'metadata.google.internal'
  ) {
    throw new HttpAiError(
      400,
      'Host endpoint Custom AI harus berupa domain publik HTTPS yang valid (bukan localhost atau jaringan internal).'
    );
  }

  if (net.isIP(host) !== 0) {
    if (isPrivateOrReservedIp(host)) {
      throw new HttpAiError(
        400,
        'Alamat IP privat/lokal tidak diizinkan untuk endpoint Custom AI.'
      );
    }
  } else {
    let resolved: Array<{ address: string }>;
    try {
      resolved = await dns.lookup(host, { all: true });
    } catch {
      throw new HttpAiError(
        400,
        `Domain endpoint "${host}" tidak dapat di-resolve. Periksa kembali penulisan Base URL.`
      );
    }
    if (!resolved || resolved.length === 0 || resolved.some((r) => isPrivateOrReservedIp(r.address))) {
      throw new HttpAiError(
        400,
        'Endpoint Custom AI mengarah ke alamat jaringan yang tidak diizinkan.'
      );
    }
  }

  let cleanPath = parsed.pathname.replace(/\/+$/, '');
  if (cleanPath.endsWith('/chat/completions')) {
    cleanPath = cleanPath.slice(0, -'/chat/completions'.length);
  }
  return `${parsed.origin}${cleanPath}/chat/completions`;
}

function getProviderDisplayName(provider: AiProvider): string {
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

async function runOpenAiCompatibleJson(params: {
  provider: 'openai' | 'custom';
  endpoint: string;
  token: string;
  model: string;
  systemInstruction: string;
  promptText: string;
  imageDataUrls?: string[];
}): Promise<{
  parsed: Record<string, unknown>;
  sources: GroundingSource[];
  usedProvider: AiProvider;
  usedModel: string;
  fallbackNotice?: string;
}> {
  const label = getProviderDisplayName(params.provider);

  if (params.provider === 'openai' && !params.token) {
    throw new HttpAiError(
      400,
      'Token OpenAI belum diisi. Buka menu Pengaturan Akun & AI untuk memasukkan token OpenAI Anda.'
    );
  }
  if (!params.model) {
    throw new HttpAiError(
      400,
      `ID Model untuk ${label} belum diisi. Buka menu Pengaturan Akun & AI untuk mengisinya.`
    );
  }

  const userContent:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string; detail: 'low' | 'auto' } }
      > =
    params.imageDataUrls && params.imageDataUrls.length > 0
      ? [
          ...params.imageDataUrls.map((url) => ({
            type: 'image_url' as const,
            image_url: { url, detail: 'auto' as const },
          })),
          { type: 'text' as const, text: params.promptText },
        ]
      : params.promptText;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (params.token) {
    headers.Authorization = `Bearer ${params.token}`;
  }

  const sendCompletion = async (includeResponseFormat: boolean) => {
    const bodyPayload: Record<string, unknown> = {
      model: params.model,
      messages: [
        { role: 'system', content: params.systemInstruction },
        { role: 'user', content: userContent },
      ],
    };
    if (includeResponseFormat) {
      bodyPayload.response_format = { type: 'json_object' };
    }

    return fetch(params.endpoint, {
      method: 'POST',
      headers,
      redirect: 'error',
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify(bodyPayload),
    });
  };

  let response: Response;
  try {
    response = await sendCompletion(true);
  } catch (networkErr) {
    throw new HttpAiError(
      502,
      `Gagal terhubung ke endpoint ${label}: ${networkErr instanceof Error ? networkErr.message : 'Koneksi gagal'}.`
    );
  }

  if (!response.ok && (response.status === 400 || response.status === 422)) {
    const firstErrBody = await response.text().catch(() => '');
    const lowerErr = firstErrBody.toLowerCase();
    if (
      params.provider === 'custom' &&
      (lowerErr.includes('response_format') || lowerErr.includes('json_object'))
    ) {
      try {
        response = await sendCompletion(false);
      } catch (retryNetErr) {
        throw new HttpAiError(
          502,
          `Gagal terhubung ke endpoint ${label}: ${retryNetErr instanceof Error ? retryNetErr.message : 'Koneksi gagal'}.`
        );
      }
    } else {
      let parsedMsg = '';
      try {
        const errJson = JSON.parse(firstErrBody) as { error?: { message?: string } };
        parsedMsg = errJson.error?.message || '';
      } catch {
        parsedMsg = firstErrBody;
      }
      if (
        params.imageDataUrls &&
        params.imageDataUrls.length > 0 &&
        (lowerErr.includes('image') || lowerErr.includes('vision') || lowerErr.includes('multimodal'))
      ) {
        throw new HttpAiError(
          400,
          `Model ${label} "${params.model}" tidak mendukung input foto/vision untuk Inspeksi AI. Ganti ke model vision atau gunakan Gemini/OpenAI/Claude.`
        );
      }
      throw new HttpAiError(
        response.status,
        `Permintaan ${label} gagal (${response.status})${parsedMsg ? `: ${parsedMsg.slice(0, 140)}` : ''}.`
      );
    }
  }

  if (!response.ok) {
    let errText = '';
    try {
      const errJson = (await response.json()) as { error?: { message?: string; code?: string } };
      errText = errJson.error?.message || '';
    } catch {
      errText = '';
    }

    if (response.status === 401 || response.status === 403) {
      throw new HttpAiError(
        response.status,
        `Token ${label} tidak valid, ditolak, atau kedaluwarsa. Periksa kembali di Pengaturan Akun & AI.`
      );
    }
    if (response.status === 429) {
      throw new HttpAiError(
        429,
        `Kuota atau rate limit ${label} terlampaui${errText ? ` (${errText.slice(0, 120)})` : ''}. Periksa saldo/limit Anda atau ganti model.`
      );
    }
    if (response.status === 404) {
      throw new HttpAiError(
        404,
        `Endpoint atau model ${label} "${params.model}" tidak ditemukan (404).`
      );
    }
    throw new HttpAiError(
      response.status >= 400 && response.status < 500 ? response.status : 502,
      `Permintaan ${label} gagal (${response.status})${errText ? `: ${errText.slice(0, 140)}` : ''}.`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  };
  const rawContent = data.choices?.[0]?.message?.content;
  const content =
    typeof rawContent === 'string'
      ? rawContent
      : Array.isArray(rawContent)
        ? rawContent
            .map((part) => (typeof part?.text === 'string' ? part.text : ''))
            .join('\n')
        : '';

  const parsed = extractJsonObject(content);

  return {
    parsed,
    sources: [],
    usedProvider: params.provider,
    usedModel: params.model,
  };
}

async function runAnthropicClaudeJson(params: {
  token: string;
  model: string;
  systemInstruction: string;
  promptText: string;
  imageDataUrls?: string[];
}): Promise<{
  parsed: Record<string, unknown>;
  sources: GroundingSource[];
  usedProvider: AiProvider;
  usedModel: string;
  fallbackNotice?: string;
}> {
  if (!params.token) {
    throw new HttpAiError(
      400,
      'Token Anthropic Claude belum diisi. Buka menu Pengaturan Akun & AI untuk memasukkan token Claude Anda.'
    );
  }

  type ClaudeBlock =
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

  const blocks: ClaudeBlock[] = [];
  if (params.imageDataUrls && params.imageDataUrls.length > 0) {
    for (const dataUrl of params.imageDataUrls) {
      const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl);
      if (m) {
        blocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: m[1].toLowerCase(),
            data: m[2],
          },
        });
      }
    }
  }
  blocks.push({ type: 'text', text: params.promptText });

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': params.token,
        'anthropic-version': '2023-06-01',
      },
      redirect: 'error',
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        model: params.model,
        max_tokens: 2048,
        system: `${params.systemInstruction}\n\nBalas HANYA 1 objek JSON valid tanpa blok markdown atau teks lain di luar JSON.`,
        messages: [
          {
            role: 'user',
            content: blocks,
          },
        ],
      }),
    });
  } catch (networkErr) {
    throw new HttpAiError(
      502,
      `Gagal terhubung ke Anthropic Claude: ${networkErr instanceof Error ? networkErr.message : 'Koneksi gagal'}.`
    );
  }

  if (!response.ok) {
    let errText = '';
    try {
      const errJson = (await response.json()) as { error?: { message?: string; type?: string } };
      errText = errJson.error?.message || '';
    } catch {
      errText = '';
    }

    if (response.status === 401 || response.status === 403) {
      throw new HttpAiError(
        response.status,
        'Token Anthropic Claude tidak valid atau tidak memiliki izin akses. Periksa kembali di Pengaturan Akun & AI.'
      );
    }
    if (response.status === 429) {
      throw new HttpAiError(
        429,
        `Kuota atau rate limit Claude terlampaui${errText ? ` (${errText.slice(0, 120)})` : ''}. Periksa billing Anthropic atau pilih provider lain.`
      );
    }
    if (response.status === 404) {
      throw new HttpAiError(
        404,
        `Model Claude "${params.model}" tidak ditemukan atau tidak tersedia untuk akun Anda.`
      );
    }
    throw new HttpAiError(
      response.status >= 400 && response.status < 500 ? response.status : 502,
      `Permintaan Claude gagal (${response.status})${errText ? `: ${errText.slice(0, 140)}` : ''}.`
    );
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const textContent = (data.content || [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text || '')
    .join('\n');

  const parsed = extractJsonObject(textContent);

  return {
    parsed,
    sources: [],
    usedProvider: 'claude',
    usedModel: params.model,
  };
}

async function runGeminiJson(params: {
  model: string;
  systemInstruction: string;
  promptText: string;
  useWebSearch?: boolean;
  imageParts?: Array<{ inlineData: { mimeType: string; data: string } }>;
  responseSchema?: Record<string, unknown>;
}): Promise<{
  parsed: Record<string, unknown>;
  sources: GroundingSource[];
  usedProvider: AiProvider;
  usedModel: string;
  fallbackNotice?: string;
}> {
  const ai = getGeminiClient();
  const contents =
    params.imageParts && params.imageParts.length > 0
      ? { parts: [...params.imageParts, { text: params.promptText }] }
      : params.promptText;

  const invoke = async (targetModel: string, withSearch: boolean) => {
    const config: Record<string, unknown> = {
      systemInstruction: params.systemInstruction,
    };
    if (targetModel.startsWith('gemini-4')) {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
    }
    if (withSearch && !params.responseSchema) {
      config.tools = [{ googleSearch: {} }];
    }
    if (params.responseSchema) {
      config.responseMimeType = 'application/json';
      config.responseSchema = params.responseSchema;
    }

    return ai.models.generateContent({
      model: targetModel,
      contents,
      config,
    });
  };

  let response: GenerateContentResponse;
  let usedModel = params.model;
  let fallbackNotice: string | undefined;

  try {
    response = await invoke(params.model, Boolean(params.useWebSearch));
  } catch (primaryErr) {
    if (!isQuotaOrRateError(primaryErr)) {
      throw primaryErr;
    }

    await sleep(900);

    // Fallback 1: retry same model without Google Search grounding (search grounding has stricter quota)
    if (params.useWebSearch && !params.responseSchema) {
      try {
        response = await invoke(params.model, false);
        fallbackNotice =
          'Kuota pencarian web sedang padat; estimasi dihitung langsung oleh model AI tanpa pencarian web.';
        return {
          parsed: extractJsonObject(response.text || ''),
          sources: [],
          usedProvider: 'gemini',
          usedModel,
          fallbackNotice,
        };
      } catch (noSearchErr) {
        if (!isQuotaOrRateError(noSearchErr)) {
          throw noSearchErr;
        }
      }
    }

    // Fallback 2: step down to lighter quota model gemini-3.1-flash-lite if user was on another model
    if (params.model !== 'gemini-3.1-flash-lite') {
      try {
        usedModel = 'gemini-3.1-flash-lite';
        response = await invoke(usedModel, false);
        fallbackNotice =
          `Kuota model ${params.model} sedang penuh; otomatis dialihkan ke gemini-3.1-flash-lite.`;
        return {
          parsed: extractJsonObject(response.text || ''),
          sources: [],
          usedProvider: 'gemini',
          usedModel,
          fallbackNotice,
        };
      } catch (liteErr) {
        if (!isQuotaOrRateError(liteErr)) {
          throw liteErr;
        }
      }
    }

    throw new HttpAiError(
      429,
      'Kuota permintaan Gemini API sementara penuh (429). Coba ganti model ke gemini-3.1-flash-lite, matikan pencarian web, atau gunakan token OpenAI, Claude, atau Custom AI di Pengaturan Akun & AI.'
    );
  }

  return {
    parsed: extractJsonObject(response.text || ''),
    sources: extractGroundingSources(response),
    usedProvider: 'gemini',
    usedModel,
    fallbackNotice,
  };
}

async function runConfiguredAiJson(
  runtime: AiRuntimeConfig,
  params: {
    systemInstruction: string;
    promptText: string;
    imageDataUrls?: string[];
    imageParts?: Array<{ inlineData: { mimeType: string; data: string } }>;
    responseSchema?: Record<string, unknown>;
  }
) {
  if (runtime.provider === 'openai') {
    return runOpenAiCompatibleJson({
      provider: 'openai',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      token: runtime.openaiToken,
      model: runtime.model,
      systemInstruction: params.systemInstruction,
      promptText: params.promptText,
      imageDataUrls: params.imageDataUrls,
    });
  }

  if (runtime.provider === 'claude') {
    return runAnthropicClaudeJson({
      token: runtime.claudeToken,
      model: runtime.model,
      systemInstruction: params.systemInstruction,
      promptText: params.promptText,
      imageDataUrls: params.imageDataUrls,
    });
  }

  if (runtime.provider === 'custom') {
    const endpoint = await validateAndNormalizeCustomBaseUrl(runtime.customBaseUrl);
    return runOpenAiCompatibleJson({
      provider: 'custom',
      endpoint,
      token: runtime.customToken,
      model: runtime.model,
      systemInstruction: params.systemInstruction,
      promptText: params.promptText,
      imageDataUrls: params.imageDataUrls,
    });
  }

  return runGeminiJson({
    model: runtime.model,
    systemInstruction: params.systemInstruction,
    promptText: params.promptText,
    useWebSearch: runtime.useWebSearch,
    imageParts: params.imageParts,
    responseSchema: params.responseSchema,
  });
}

function handleApiError(res: express.Response, err: unknown) {
  console.error('AI Server Error:', err instanceof Error ? err.message : String(err));
  if (err instanceof HttpAiError) {
    return res.status(err.status).json({ error: err.message });
  }

  const msg = err instanceof Error ? err.message : String(err);

  if (isQuotaOrRateError(err)) {
    return res.status(429).json({
      error:
        'Kuota permintaan AI sementara penuh. Buka Pengaturan Akun & AI untuk memilih model Gemini lain atau menggunakan token OpenAI / Claude / Custom AI.',
    });
  }
  if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
    return res.status(403).json({
      error:
        'Akses API ditolak atau model memerlukan kunci berbayar. Periksa pengaturan model/token AI atau isi angka secara manual.',
    });
  }
  if (msg.includes('404') || msg.includes('NOT_FOUND')) {
    return res.status(404).json({
      error: 'Model AI yang dipilih tidak ditemukan. Ubah pilihan model di Pengaturan Akun & AI.',
    });
  }
  return res.status(500).json({
    error: 'Gagal mengambil respons AI. Anda tetap dapat mengisi data secara manual.',
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '8mb' }));

  app.get('/api/health', (_req, res) => {
    return res.status(200).json({ ok: true });
  });

  app.post('/api/ai/test', async (req, res) => {
    try {
      const runtime = resolveAiRuntime(req);
      const result = await runConfiguredAiJson(runtime, {
        systemInstruction:
          'Anda adalah asisten uji koneksi AI. Balas HANYA JSON valid: {"ok": true, "message": "Koneksi AI berhasil"}',
        promptText: 'Balas JSON valid dengan key "ok" (boolean true) dan "message" singkat Bahasa Indonesia.',
      });

      const providerLabel = getProviderDisplayName(result.usedProvider);
      return res.json({
        ok: true,
        message:
          typeof result.parsed.message === 'string' && result.parsed.message.trim()
            ? result.parsed.message.trim().slice(0, 160)
            : `Koneksi ${providerLabel} (${result.usedModel}) berhasil.`,
        usedProvider: result.usedProvider,
        usedModel: result.usedModel,
        fallbackNotice: result.fallbackNotice,
      });
    } catch (err) {
      return handleApiError(res, err);
    }
  });

  app.post('/api/ai/market-price', async (req, res) => {
    try {
      const runtime = resolveAiRuntime(req);
      const { brand, model, year, transmission, fuelType, odometerKm, location } = req.body as {
        brand?: string;
        model?: string;
        year?: number;
        transmission?: string;
        fuelType?: string;
        odometerKm?: number;
        location?: string;
      };

      if (!brand || !model || !year) {
        return res.status(400).json({
          error: 'Merek, model, dan tahun mobil wajib diisi sebelum cek harga pasar AI.',
        });
      }

      const promptText = [
        `Cari kisaran harga pasar mobil bekas wajar di Indonesia saat ini untuk:`,
        `- Mobil: ${String(brand).slice(0, 60)} ${String(model).slice(0, 80)} tahun ${Number(year)}`,
        transmission ? `- Transmisi: ${String(transmission).slice(0, 40)}` : '',
        fuelType ? `- Bahan bakar: ${String(fuelType).slice(0, 30)}` : '',
        odometerKm !== undefined ? `- Odometer: ${Number(odometerKm)} km` : '',
        location ? `- Lokasi/Wilayah: ${String(location).slice(0, 120)}` : '',
        ``,
        `Balas HANYA dengan 1 objek JSON valid (tanpa teks tambahan di luar JSON) dengan format persis:`,
        `{"estimatedPrice": number_rupiah_integer, "priceLow": number_rupiah_integer, "priceHigh": number_rupiah_integer, "summary": "penjelasan singkat 1-2 kalimat bahasa Indonesia"}`,
      ]
        .filter(Boolean)
        .join('\n');

      const result = await runConfiguredAiJson(runtime, {
        systemInstruction:
          'Anda adalah penilai harga mobil bekas di Indonesia (referensi OLX, Mobil123, Carmudi, Carro, Carsome Indonesia). Jawab ringkas dalam JSON murni dengan satuan Rupiah penuh (contoh: 185000000).',
        promptText,
      });

      const estimatedPrice = parseSafeNumber(result.parsed.estimatedPrice);
      const priceLow = parseSafeNumber(result.parsed.priceLow) || estimatedPrice;
      const priceHigh = parseSafeNumber(result.parsed.priceHigh) || estimatedPrice;
      const summary =
        typeof result.parsed.summary === 'string' && result.parsed.summary.trim()
          ? result.parsed.summary.trim().slice(0, 320)
          : 'Estimasi harga pasar mobil bekas berdasarkan referensi pasar Indonesia.';

      if (estimatedPrice <= 0) {
        return res.status(502).json({
          error: 'AI belum menemukan angka harga pasar yang valid. Silakan isi manual.',
        });
      }

      return res.json({
        estimatedPrice,
        priceLow,
        priceHigh,
        summary,
        sources: result.sources,
        usedProvider: result.usedProvider,
        usedModel: result.usedModel,
        fallbackNotice: result.fallbackNotice,
      });
    } catch (err) {
      return handleApiError(res, err);
    }
  });

  app.post('/api/ai/new-car-info', async (req, res) => {
    try {
      const runtime = resolveAiRuntime(req);
      const { brand, model, year, transmission, fuelType, location } = req.body as {
        brand?: string;
        model?: string;
        year?: number;
        transmission?: string;
        fuelType?: string;
        location?: string;
      };

      if (!brand || !model) {
        return res.status(400).json({
          error: 'Merek dan model mobil wajib diisi sebelum cek harga baru & status produksi.',
        });
      }

      const promptText = [
        `Cari informasi harga OTR unit BARU (saat ini jika masih dijual baru, atau harga OTR baru terakhir/tahun ${Number(year) || 'terakhir'} jika model sudah diskontinue) dan status produksi di Indonesia untuk:`,
        `- Mobil: ${String(brand).slice(0, 60)} ${String(model).slice(0, 80)} (tahun unit yang disurvei: ${Number(year) || '-'})`,
        transmission ? `- Transmisi: ${String(transmission).slice(0, 40)}` : '',
        fuelType ? `- Bahan bakar: ${String(fuelType).slice(0, 30)}` : '',
        location ? `- Wilayah: ${String(location).slice(0, 120)}` : '',
        ``,
        `Balas HANYA dengan 1 objek JSON valid (tanpa teks tambahan di luar JSON) dengan format persis:`,
        `{"newCarPrice": number_rupiah_integer, "productionStatus": "Masih Diproduksi" | "Diskontinue", "discontinuedYear": number_or_null, "summary": "penjelasan singkat 1-2 kalimat status produksi dan referensi harga OTR baru di Indonesia"}`,
      ]
        .filter(Boolean)
        .join('\n');

      const result = await runConfiguredAiJson(runtime, {
        systemInstruction:
          'Anda adalah konsultan otomotif Indonesia yang memantau harga OTR mobil baru APM resmi serta status apakah suatu model/generasi mobil masih diproduksi atau sudah diskontinue di Indonesia. Jawab hanya JSON valid dalam Rupiah penuh.',
        promptText,
      });

      const newCarPrice = parseSafeNumber(result.parsed.newCarPrice);
      const rawStatus =
        typeof result.parsed.productionStatus === 'string'
          ? result.parsed.productionStatus.toLowerCase()
          : '';
      const productionStatus = rawStatus.includes('diskontinue') || rawStatus.includes('discontinue') || rawStatus.includes('stop')
        ? ('Diskontinue' as const)
        : ('Masih Diproduksi' as const);
      const rawDiscYear = Number(result.parsed.discontinuedYear);
      const discontinuedYear =
        Number.isFinite(rawDiscYear) && rawDiscYear >= 1980 && rawDiscYear <= 2035
          ? Math.round(rawDiscYear)
          : null;
      const summary =
        typeof result.parsed.summary === 'string' && result.parsed.summary.trim()
          ? result.parsed.summary.trim().slice(0, 320)
          : `Status model: ${productionStatus}.`;

      if (newCarPrice <= 0) {
        return res.status(502).json({
          error: 'AI belum menemukan referensi harga baru yang valid. Silakan isi manual.',
        });
      }

      return res.json({
        newCarPrice,
        productionStatus,
        discontinuedYear,
        summary,
        sources: result.sources,
        usedProvider: result.usedProvider,
        usedModel: result.usedModel,
        fallbackNotice: result.fallbackNotice,
      });
    } catch (err) {
      return handleApiError(res, err);
    }
  });

  app.post('/api/ai/repair-cost', async (req, res) => {
    try {
      const runtime = resolveAiRuntime(req);
      const { brand, model, year, transmission, fuelType, itemLabel, itemHint, issueNote, status } =
        req.body as {
          brand?: string;
          model?: string;
          year?: number;
          transmission?: string;
          fuelType?: string;
          itemLabel?: string;
          itemHint?: string;
          issueNote?: string;
          status?: string;
        };

      if (!brand || !model || !itemLabel) {
        return res.status(400).json({
          error: 'Data tipe mobil dan komponen pemeriksaan wajib tersedia.',
        });
      }

      const severity =
        status === 'defect'
          ? 'Rusak / perlu ganti atau perbaikan penuh'
          : 'Perlu perhatian / servis ringan-menengah';

      const promptText = [
        `Cari estimasi biaya perbaikan dan harga suku cadang di Indonesia untuk masalah berikut:`,
        `- Kendaraan: ${String(brand).slice(0, 60)} ${String(model).slice(0, 80)} tahun ${Number(year) || ''} (${String(transmission || '')}, ${String(fuelType || '')})`,
        `- Komponen diperiksa: ${String(itemLabel).slice(0, 140)}`,
        itemHint ? `- Konteks cek: ${String(itemHint).slice(0, 180)}` : '',
        `- Tingkat kondisi: ${severity}`,
        issueNote ? `- Catatan temuan inspektor: ${String(issueNote).slice(0, 250)}` : '',
        ``,
        `Balas HANYA dengan 1 objek JSON valid (tanpa teks tambahan di luar JSON) dengan format persis:`,
        `{"estimatedCost": number_total_rupiah_integer, "partsEstimate": number_rupiah_integer, "laborEstimate": number_rupiah_integer, "summary": "rincian singkat 1-2 kalimat bahasa Indonesia"}`,
      ]
        .filter(Boolean)
        .join('\n');

      const result = await runConfiguredAiJson(runtime, {
        systemInstruction:
          'Anda adalah estimator bengkel mobil berpengalaman di Indonesia. Berikan harga suku cadang dan jasa bengkel aktual di Indonesia untuk tipe mobil spesifik tersebut dalam format JSON murni satuan Rupiah penuh.',
        promptText,
      });

      const partsEstimate = parseSafeNumber(result.parsed.partsEstimate);
      const laborEstimate = parseSafeNumber(result.parsed.laborEstimate);
      const estimatedCost =
        parseSafeNumber(result.parsed.estimatedCost) || partsEstimate + laborEstimate;
      const summary =
        typeof result.parsed.summary === 'string' && result.parsed.summary.trim()
          ? result.parsed.summary.trim().slice(0, 320)
          : 'Estimasi suku cadang dan jasa bengkel untuk tipe kendaraan ini.';

      if (estimatedCost <= 0) {
        return res.status(502).json({
          error: 'AI belum menemukan estimasi biaya yang valid. Silakan isi manual.',
        });
      }

      return res.json({
        estimatedCost,
        partsEstimate,
        laborEstimate,
        summary,
        sources: result.sources,
        usedProvider: result.usedProvider,
        usedModel: result.usedModel,
        fallbackNotice: result.fallbackNotice,
      });
    } catch (err) {
      return handleApiError(res, err);
    }
  });

  app.post('/api/ai/inspect-category', async (req, res) => {
    try {
      const runtime = resolveAiRuntime(req);
      const {
        brand,
        model,
        year,
        transmission,
        fuelType,
        odometerKm,
        categoryTitle,
        items,
        images,
      } = req.body as {
        brand?: string;
        model?: string;
        year?: number;
        transmission?: string;
        fuelType?: string;
        odometerKm?: number;
        categoryTitle?: string;
        items?: Array<{
          id?: string;
          label?: string;
          hint?: string;
          defaultRepairEstimate?: number;
        }>;
        images?: string[];
      };

      if (!categoryTitle || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          error: 'Data kategori dan daftar poin pemeriksaan wajib tersedia.',
        });
      }

      if (!Array.isArray(images) || images.length === 0) {
        return res.status(400).json({
          error: 'Unggah atau pilih minimal 1 foto unit untuk dianalisis AI.',
        });
      }

      const validDataUrls: string[] = [];
      const validImageParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];
      for (const rawImg of images.slice(0, 6)) {
        if (typeof rawImg !== 'string') continue;
        const trimmed = rawImg.trim();
        const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/i.exec(
          trimmed
        );
        if (match) {
          const normalizedMime =
            match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
          validDataUrls.push(`data:${normalizedMime};base64,${match[2]}`);
          validImageParts.push({
            inlineData: {
              mimeType: normalizedMime,
              data: match[2],
            },
          });
        }
      }

      if (validImageParts.length === 0) {
        return res.status(400).json({
          error: 'Format foto tidak valid. Gunakan foto JPEG, PNG, atau WebP.',
        });
      }

      const sanitizedItems = items
        .filter((it) => typeof it.id === 'string' && typeof it.label === 'string')
        .map((it) => ({
          id: String(it.id),
          label: String(it.label).slice(0, 160),
          hint: String(it.hint || '').slice(0, 220),
          defaultRepairEstimate: parseSafeNumber(it.defaultRepairEstimate),
        }));

      const itemListText = sanitizedItems
        .map(
          (it, idx) =>
            `${idx + 1}. id="${it.id}" | Poin: "${it.label}" | Panduan: "${it.hint}" | Estimasi dasar jika rusak: Rp${it.defaultRepairEstimate}`
        )
        .join('\n');

      const promptText = [
        `Analisis ${validImageParts.length} foto inspeksi mobil bekas berikut untuk grup kategori: "${String(categoryTitle).slice(0, 120)}".`,
        `Identitas kendaraan: ${String(brand || 'Mobil').slice(0, 60)} ${String(model || '').slice(0, 80)} tahun ${Number(year) || '-'} (${String(transmission || '-')}, ${String(fuelType || '-')}, odometer ${odometerKm !== undefined ? Number(odometerKm) : '-'} km).`,
        ``,
        `Daftar poin pemeriksaan pada grup ini:`,
        itemListText,
        ``,
        `ATURAN KETAT PENILAIAN:`,
        `1. Evaluasi HANYA kondisi yang benar-benar terlihat jelas pada foto yang dikirim.`,
        `2. JANGAN mengarang atau menebak hal yang tidak tampak di foto (misalnya suara mesin stasioner, getaran, rasa perpindahan transmisi/CVT, kelurusan setir saat test drive, getar rem, bau apek/jamur, atau bagian mobil yang fotonya belum diunggah).`,
        `3. Untuk setiap item di atas:`,
        `   - Jika kondisi item DAPAT diamati cukup jelas dari foto: set canAssessFromPhoto=true, status='good' | 'attention' | 'defect', note=ringkasan temuan visual (maks 220 karakter), estimatedRepairCost=0 jika 'good' atau estimasi Rupiah wajar untuk mobil tipe ini di Indonesia jika 'attention'/'defect', dan uncheckableReason="".`,
        `   - Jika kondisi item TIDAK DAPAT dicek dari foto (karena butuh tes suara/jalan/sentuh/bau, atau bagian tersebut tidak ada di foto): set canAssessFromPhoto=false, status='na', estimatedRepairCost=0, note="", dan uncheckableReason=penjelasan singkat spesifik dalam Bahasa Indonesia mengapa tidak bisa dicek via foto.`,
        `4. Pastikan seluruh ${sanitizedItems.length} itemId di atas ada di array items.`,
        ``,
        `Balas HANYA dengan 1 objek JSON valid sesuai format:`,
        `{"overallObservation": "string", "items": [{"itemId": "string", "canAssessFromPhoto": boolean, "status": "good"|"attention"|"defect"|"na", "note": "string", "estimatedRepairCost": integer, "uncheckableReason": "string"}]}`,
      ].join('\n');

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          overallObservation: {
            type: Type.STRING,
            description:
              'Ringkasan 1-2 kalimat hasil pengamatan foto pada grup ini dalam Bahasa Indonesia.',
          },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                itemId: { type: Type.STRING },
                canAssessFromPhoto: { type: Type.BOOLEAN },
                status: {
                  type: Type.STRING,
                  description: "Harus salah satu dari: 'good', 'attention', 'defect', 'na'",
                },
                note: { type: Type.STRING },
                estimatedRepairCost: { type: Type.INTEGER },
                uncheckableReason: { type: Type.STRING },
              },
              required: [
                'itemId',
                'canAssessFromPhoto',
                'status',
                'note',
                'estimatedRepairCost',
                'uncheckableReason',
              ],
            },
          },
        },
        required: ['overallObservation', 'items'],
      };

      const result = await runConfiguredAiJson(runtime, {
        systemInstruction:
          'Anda adalah inspektor mobil bekas profesional dan jujur di Indonesia. Tugas Anda menilai foto kendaraan secara objektif serta melaporkan dengan jelas poin apa saja yang tidak dapat dinilai dari foto agar pembeli memeriksanya secara manual di lapangan.',
        promptText,
        imageDataUrls: validDataUrls,
        imageParts: validImageParts,
        responseSchema,
      });

      const parsed = result.parsed as {
        overallObservation?: unknown;
        items?: Array<{
          itemId?: unknown;
          canAssessFromPhoto?: unknown;
          status?: unknown;
          note?: unknown;
          estimatedRepairCost?: unknown;
          uncheckableReason?: unknown;
        }>;
      };

      const rawMap = new Map<string, NonNullable<typeof parsed.items>[number]>();
      if (Array.isArray(parsed.items)) {
        for (const entry of parsed.items) {
          if (typeof entry?.itemId === 'string') {
            rawMap.set(entry.itemId, entry);
          }
        }
      }

      const normalizedItems = sanitizedItems.map((reqItem) => {
        const aiItem = rawMap.get(reqItem.id);
        if (!aiItem) {
          return {
            itemId: reqItem.id,
            label: reqItem.label,
            canAssessFromPhoto: false,
            status: 'na' as const,
            note: '',
            estimatedRepairCost: 0,
            uncheckableReason:
              'Tidak cukup informasi visual pada foto yang dikirim. Perlu pemeriksaan manual langsung.',
          };
        }

        const canAssess = Boolean(aiItem.canAssessFromPhoto);
        const rawStatus =
          typeof aiItem.status === 'string' ? aiItem.status.toLowerCase().trim() : 'na';
        const validStatus =
          canAssess && (rawStatus === 'good' || rawStatus === 'attention' || rawStatus === 'defect')
            ? (rawStatus as 'good' | 'attention' | 'defect')
            : ('na' as const);

        const assessed = canAssess && validStatus !== 'na';
        const repairCost =
          assessed && (validStatus === 'attention' || validStatus === 'defect')
            ? parseSafeNumber(aiItem.estimatedRepairCost) ||
              (validStatus === 'defect'
                ? reqItem.defaultRepairEstimate
                : Math.round(reqItem.defaultRepairEstimate * 0.5))
            : 0;

        return {
          itemId: reqItem.id,
          label: reqItem.label,
          canAssessFromPhoto: assessed,
          status: validStatus,
          note:
            assessed && typeof aiItem.note === 'string' ? aiItem.note.trim().slice(0, 280) : '',
          estimatedRepairCost: repairCost,
          uncheckableReason: assessed
            ? ''
            : typeof aiItem.uncheckableReason === 'string' && aiItem.uncheckableReason.trim()
              ? aiItem.uncheckableReason.trim().slice(0, 240)
              : 'Tidak terlihat pada foto atau membutuhkan pengecekan fisik/suara/jalan langsung.',
        };
      });

      const overallObservation =
        typeof parsed.overallObservation === 'string' && parsed.overallObservation.trim()
          ? parsed.overallObservation.trim().slice(0, 360)
          : `Analisis AI selesai menggunakan ${validImageParts.length} foto untuk kategori ${categoryTitle}.`;

      return res.json({
        overallObservation,
        analyzedPhotoCount: validImageParts.length,
        items: normalizedItems,
        usedProvider: result.usedProvider,
        usedModel: result.usedModel,
        fallbackNotice: result.fallbackNotice,
      });
    } catch (err) {
      return handleApiError(res, err);
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OtoSkor server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
