import { triggerNetworkError } from './api';
import { getToken } from '../utils/tokenStorage';

export enum PostType {
  DISCUSSION = 'DISCUSSION',
  POLL = 'POLL',
  COMPLAINT = 'COMPLAINT',
  INFO = 'INFO',
  ANNOUNCEMENT = 'ANNOUNCEMENT'
}

export enum UserType {
  VISITOR = 'VISITOR',
  RESIDENT = 'RESIDENT',
  ADMIN = 'ADMIN',
  TOURIST = 'TOURIST',
  ISLAND_RESIDENT = 'ISLAND_RESIDENT'
}

export enum Island {
  BUYUKADA = 'BUYUKADA',
  HEYBELIADA = 'HEYBELIADA',
  BURGAZADA = 'BURGAZADA',
  KINALIADA = 'KINALIADA',
  SEDEF_ADASI = 'SEDEF_ADASI'
}

export interface PollOptionDto {
  id: string;
  text: string;
  voteCount: number;
  percentage: number;
}

export interface PostDto {
  id: string;
  authorName?: string;
  authorUserType?: UserType;
  content: string;
  postType: PostType;
  island: Island;
  imageUrl?: string;
  topicId?: string;
  topicName?: string;
  parentId?: string;
  replyCount: number;
  likeCount: number;
  pollOptions?: PollOptionDto[];
  createdAt: string;
  isLiked?: boolean; // Added for frontend state
}

export interface ForumTopicDto {
  id: string;
  name: string;
  description: string;
}

export interface CreatePostRequest {
  content: string;
  postType: PostType;
  island: Island;
  pollOptions?: string[];
  imageUrl?: string;
  topicId?: string;
  parentId?: string;
  anonymous: boolean;
}

import { API_URL } from './apiConfig';

const FORUM_API_BASE = API_URL + '/api/v1/forum';

// Helper for fetch with auth if needed
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response;
};

export const fetchPosts = async (topicId?: string): Promise<PostDto[]> => {
  try {
    const url = topicId 
      ? `${FORUM_API_BASE}/topics/${topicId}/posts` 
      : `${FORUM_API_BASE}/posts`;
    
    const response = await fetchWithAuth(url);
    const data = await response.json();
    
    // Handle Spring Data Page structure if present
    if (data && data.content && Array.isArray(data.content)) {
      return data.content;
    }
    
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Failed to fetch forum posts:', error);
    triggerNetworkError();
    return [];
  }
};

export const fetchHotPosts = async (): Promise<PostDto[]> => {
  try {
    const response = await fetchWithAuth(`${FORUM_API_BASE}/posts/hot`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch hot posts:', error);
    triggerNetworkError();
    return [];
  }
};

export const createPost = async (request: CreatePostRequest): Promise<PostDto | null> => {
  try {
    const response = await fetchWithAuth(`${FORUM_API_BASE}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to create post:', error);
    triggerNetworkError();
    return null;
  }
};

export const likePost = async (postId: string): Promise<boolean> => {
  try {
    const response = await fetchWithAuth(`${FORUM_API_BASE}/posts/${postId}/like`, {
      method: 'POST',
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to like post:', error);
    return false;
  }
};

export const reportPost = async (postId: string, reason: string): Promise<boolean> => {
  try {
    const response = await fetchWithAuth(`${FORUM_API_BASE}/posts/${postId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to report post:', error);
    return false;
  }
};

export const voteOnPoll = async (pollId: string, optionId: string): Promise<PostDto | null> => {
  try {
    const response = await fetchWithAuth(`${FORUM_API_BASE}/polls/${pollId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to vote on poll:', error);
    return null;
  }
};

export const fetchReplies = async (postId: string): Promise<PostDto[]> => {
  try {
    const response = await fetchWithAuth(`${FORUM_API_BASE}/posts/${postId}/replies`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch replies:', error);
    triggerNetworkError();
    return [];
  }
};

export const postReply = async (postId: string, request: Partial<CreatePostRequest>): Promise<PostDto | null> => {
  try {
    const response = await fetchWithAuth(`${FORUM_API_BASE}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, parentId: postId }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to post reply:', error);
    triggerNetworkError();
    return null;
  }
};

export const fetchTopics = async (): Promise<ForumTopicDto[]> => {
  try {
    const response = await fetchWithAuth(`${FORUM_API_BASE}/topics`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch topics:', error);
    return [];
  }
};

export const fetchUserPosts = async (userId: string): Promise<PostDto[]> => {
  try {
    const response = await fetchWithAuth(`${API_URL}/api/v1/users/${userId}/posts`);
    const data = await response.json();
    return data.content || [];
  } catch (error) {
    console.error('Failed to fetch user posts:', error);
    return [];
  }
};

export const fetchUserReplies = async (userId: string): Promise<PostDto[]> => {
  try {
    const response = await fetchWithAuth(`${API_URL}/api/v1/users/${userId}/replies`);
    const data = await response.json();
    return data.content || [];
  } catch (error) {
    console.error('Failed to fetch user replies:', error);
    return [];
  }
};

export const fetchUserLikes = async (userId: string): Promise<PostDto[]> => {
  try {
    const response = await fetchWithAuth(`${API_URL}/api/v1/users/${userId}/likes`);
    const data = await response.json();
    return data.content || [];
  } catch (error) {
    console.error('Failed to fetch user likes:', error);
    return [];
  }
};
