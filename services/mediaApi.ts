import { triggerNetworkError } from './api';
import { API_BASE_URL, fetchWithTimeout } from './config';
import { getToken } from '@/utils/tokenStorage';

const MEDIA_API_BASE = `${API_BASE_URL}/api/v1/media`;

export const uploadImage = async (uri: string): Promise<string | null> => {
  try {
    const formData = new FormData();
    const rawFilename = uri.split('/').pop()?.split('?')[0] || 'image.jpg';
    const match = /\.(\w+)$/.exec(rawFilename);
    const extension = match?.[1]?.toLowerCase();
    const filename = extension ? rawFilename : `${rawFilename}.jpg`;
    const type = extension === 'png'
      ? 'image/png'
      : extension === 'webp'
        ? 'image/webp'
        : extension === 'heic' || extension === 'heif'
          ? `image/${extension}`
          : 'image/jpeg';

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
    if (typeof data === 'string') return data;
    return data.url ?? data.imageUrl ?? data.fileUrl ?? data.path ?? null;
  } catch (error) {
    console.log('Failed to upload image:', error);
    triggerNetworkError();
    return null;
  }
};
