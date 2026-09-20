import { API_BASE_URL } from './config';
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
    // Uploads use a single bounded request. Retrying a multipart POST can leave
    // the publish button spinning for almost a minute on a weak connection and
    // may submit the same image more than once.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    let response: Response;
    try {
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Image upload timed out')), 30_000);
      });
      response = await Promise.race([
        fetch(`${MEDIA_API_BASE}/upload`, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        }),
        timeout,
      ]);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
    
    const data = await response.json();
    if (typeof data === 'string') return data;
    return data.url ?? data.imageUrl ?? data.fileUrl ?? data.path ?? null;
  } catch (error) {
    console.log('Failed to upload image:', error);
    // The event form presents its own actionable error message. Do not open the
    // global network modal here: it can cover that message and look like the app
    // has frozen while the upload is timing out.
    return null;
  }
};
