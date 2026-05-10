import { API_URL } from './api';

export interface ContactRequest {
  fullName: string;
  email: string;
  message: string;
}

export const contactApi = {
  send: async (data: ContactRequest) => {
    const response = await fetch(`${API_URL}/api/v1/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return await response.json();
  },
};
