import { getToken } from '@/utils/tokenStorage';
import { API_BASE_URL } from './config';

export const sendChatMessage = async (message: string, island?: string): Promise<string> => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/guide/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, island: island ?? null }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `İstek başarısız oldu (${response.status})`);
  }
  const data = await response.json();
  return data.reply as string;
};
