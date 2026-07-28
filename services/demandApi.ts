import { API_BASE_URL, fetchWithTimeout } from './config';
import { getToken } from '@/utils/tokenStorage';
import { triggerNetworkError } from './api';

export type DeliveryDemandOption = 'CARGO' | 'SUPERMARKET' | 'WATER_GAS' | 'OTHER';

export interface DeliveryVoteRequest {
  option: DeliveryDemandOption;
  otherText?: string;
}

export const submitDeliveryVote = async (option: DeliveryDemandOption, otherText?: string): Promise<boolean> => {
  try {
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/demand/delivery`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ option, otherText }),
    });

    if (!response.ok) {
      console.log(`Failed to submit delivery demand vote: ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.log('Error submitting delivery demand vote:', error);
    triggerNetworkError();
    return false;
  }
};
