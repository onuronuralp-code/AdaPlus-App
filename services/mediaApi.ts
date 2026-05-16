import { triggerNetworkError } from './api';
import { API_BASE_URL } from './config';

const MEDIA_API_BASE = `${API_BASE_URL}/api/v1/media`;

export const uploadImage = async (uri: string): Promise<string | null> => {
  try {
    const formData = new FormData();
    // In React Native, we need to provide name, type, and uri for the file
    const filename = uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;

    // @ts-ignore - FormData issue in RN
    formData.append('file', {
      uri,
      name: filename,
      type,
    });

    const response = await fetch(`${MEDIA_API_BASE}/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
    
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Failed to upload image:', error);
    triggerNetworkError();
    return null;
  }
};
