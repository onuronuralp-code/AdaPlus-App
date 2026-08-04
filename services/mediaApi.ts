import { triggerNetworkError } from './api';
import { API_BASE_URL, fetchWithTimeout } from './config';
import { getToken } from '@/utils/tokenStorage';

const MEDIA_API_BASE = `${API_BASE_URL}/api/v1/media`;

export const uploadImage = async (uri: string): Promise<string | null> => {
  try {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // @ts-ignore - FormData issue in RN
    formData.append('file', {
      uri,
      name: filename,
      type,
    });

    const token = getToken();
    const response = await fetchWithTimeout(`${MEDIA_API_BASE}/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
    
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.log('Failed to upload image:', error);
    triggerNetworkError();
    return null;
  }
};
