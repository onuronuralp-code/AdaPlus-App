import { getToken } from '@/utils/tokenStorage';
import { API_BASE_URL } from './config';

const GUIDE_TIMEOUT_MS = 60_000;

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
