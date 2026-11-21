export interface ParsedAiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  errorMessage: string;
  isRateLimited: boolean;
}

const RATE_LIMIT_PATTERN =
  /429|rate[\s_-]*exceeded|rate[\s_-]*limit|too many requests|resource[\s_-]*exhausted|quota/i;

export const RATE_LIMIT_ASSISTANT_MESSAGE =
  'AI assistant is busy right now due to high traffic/rate limits. Please wait a moment and tap Retry.';

export const RATE_LIMIT_SCANNER_MESSAGE =
  'AI assistant is busy right now due to high traffic/rate limits. Please wait a moment and tap Retry—or enter item details manually.';

export function isRateLimitTextOrStatus(status?: number, text?: string): boolean {
  if (status === 429) return true;
  if (!text) return false;
  return RATE_LIMIT_PATTERN.test(text);
}

export async function parseAiHttpResponse<T = any>(
  response: Response,
  fallbackMessage: string,
  rateLimitMessage: string = RATE_LIMIT_ASSISTANT_MESSAGE
): Promise<ParsedAiResponse<T>> {
  const rawText = await response.text().catch(() => '');
  let parsed: any = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = null;
    }
  }

  const candidateErrText =
    (parsed && typeof parsed.error === 'string' && parsed.error) || rawText || '';

  const isRateLimited = isRateLimitTextOrStatus(response.status, candidateErrText);

  if (response.ok && parsed) {
    return {
      ok: true,
      status: response.status,
      data: parsed as T,
      errorMessage: '',
      isRateLimited: false,
    };
  }

  if (isRateLimited) {
    return {
      ok: false,
      status: response.status || 429,
      data: parsed,
      errorMessage: rateLimitMessage,
      isRateLimited: true,
    };
  }

  const errorMessage =
    candidateErrText.trim() ||
    (response.status === 503
      ? 'AI service is temporarily unavailable or not configured. Check Settings > Secrets or enter details manually.'
      : fallbackMessage);

  return {
    ok: false,
    status: response.status,
    data: parsed,
    errorMessage,
    isRateLimited: false,
  };
}
