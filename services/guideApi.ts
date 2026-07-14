import { getToken } from '@/utils/tokenStorage';
import { API_BASE_URL } from './config';

const GUIDE_TIMEOUT_MS = 60_000;

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

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const chunk = line.slice(6);
          if (chunk) onChunk(chunk);
        }
      }
    }

    // Flush remaining buffer
    if (buffer.startsWith('data: ')) {
      const chunk = buffer.slice(6);
      if (chunk) onChunk(chunk);
    }
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
