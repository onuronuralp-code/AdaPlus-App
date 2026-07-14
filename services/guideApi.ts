import { getToken } from '@/utils/tokenStorage';
import { API_BASE_URL } from './config';

const GUIDE_TIMEOUT_MS = 60_000;

// Spring writes "data:" immediately followed by the token — no separator space added.
// A leading space in the token IS part of the data (word boundary), never strip it.
function parseSseLine(line: string): string | null {
  if (!line.startsWith('data:')) return null;
  const value = line.slice(5);
  return value || null;
}

export const sendChatMessageStream = async (
  message: string,
  island: string | undefined,
  onChunk: (chunk: string) => void,
): Promise<void> => {
  const token = getToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GUIDE_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/guide/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, island: island ?? null }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `İstek başarısız oldu (${response.status})`);
    }

    if (!response.body) {
      // React Native older builds: body is null — read full text and parse SSE lines
      const text = await response.text();
      for (const line of text.split('\n')) {
        const chunk = parseSseLine(line);
        if (chunk) onChunk(chunk);
      }
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const chunk = parseSseLine(line);
        if (chunk) onChunk(chunk);
      }
    }

    // Flush any remaining data in the buffer
    const remaining = parseSseLine(buffer);
    if (remaining) onChunk(remaining);
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error('Yanıt çok uzun sürdü, lütfen tekrar dene.');
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
};

// Non-streaming fallback kept for reference
export const sendChatMessage = async (message: string, island?: string): Promise<string> => {
  const token = getToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GUIDE_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/guide/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, island: island ?? null }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `İstek başarısız oldu (${response.status})`);
    }
    const data = await response.json();
    return data.reply as string;
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error('Yanıt çok uzun sürdü, lütfen tekrar dene.');
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
};
