import { getToken } from "../utils/tokenStorage";
import { triggerNetworkError } from "./api";
import { API_BASE_URL, fetchWithTimeout } from "./config";
import { handleUnauthorized } from "../context/AuthContext";
import i18n from "../utils/i18n";

export enum PostType {
  DISCUSSION = "DISCUSSION",
  POLL = "POLL",
  COMPLAINT = "COMPLAINT",
  INFO = "INFO",
  ANNOUNCEMENT = "ANNOUNCEMENT",
}

export enum UserType {
  VISITOR = "VISITOR",
  RESIDENT = "RESIDENT",
  ADMIN = "ADMIN",
  TOURIST = "TOURIST",
  ISLAND_RESIDENT = "ISLAND_RESIDENT",
  BELEDIYE = "BELEDIYE",
  ADALAR_BELEDIYESI = "ADALAR_BELEDIYESI",
  MUHTAR = "MUHTAR",
}

export enum Island {
  BUYUKADA = "BUYUKADA",
  HEYBELIADA = "HEYBELIADA",
  BURGAZADA = "BURGAZADA",
  KINALIADA = "KINALIADA",
  SEDEF_ADASI = "SEDEF_ADASI",
}

export interface PollOptionDto {
  id: string;
  text: string;
  voteCount: number;
  percentage: number;
  isVoted?: boolean;
  voted?: boolean;
}

export interface PostDto {
  id: string;
  authorId?: string;
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
  pollEndsAt?: string;
  createdAt: string;
  isLiked?: boolean;
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
  pollDurationHours?: number;
}

const FORUM_API_BASE = `${API_BASE_URL}/api/v1/forum`;

// Helper for fetch with auth if needed
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetchWithTimeout(url, { ...options, headers });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Session expired');
  }
  if (!response.ok) {
    let errorMsg = `API Error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.message || errorData.error || errorMsg;
    } catch (e) {
      // Ignore
    }
    throw new Error(errorMsg);
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

    if (data && data.content && Array.isArray(data.content)) {
      return data.content;
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.log("Failed to fetch forum posts:", error);
    triggerNetworkError();
    return [];
  }
};

export const fetchHotPosts = async (): Promise<PostDto[]> => {
  try {
    const response = await fetchWithAuth(`${FORUM_API_BASE}/posts/hot`);
    return await response.json();
  } catch (error) {
    console.log("Failed to fetch hot posts:", error);
    triggerNetworkError();
    return [];
  }
};

export const createPost = async (
  request: CreatePostRequest,
): Promise<PostDto> => {
  const token = getToken();
  const response = await fetch(`${FORUM_API_BASE}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (body.message === 'content_policy_violation') {
      throw new Error(i18n.t('errors.contentPolicyViolation'));
    }
    throw new Error(body.message || `${i18n.t('errors.requestFailed')} (${response.status})`);
  }
  return response.json();
};

export interface UpdatePostRequest {
  content: string;
  imageUrl?: string;
}

export const updatePost = async (
  postId: string,
  request: UpdatePostRequest,
): Promise<PostDto> => {
  const token = getToken();
  const response = await fetch(`${FORUM_API_BASE}/posts/${postId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (body.message === 'content_policy_violation') {
      throw new Error(i18n.t('errors.contentPolicyViolation'));
    }
    throw new Error(body.message || `${i18n.t('errors.requestFailed')} (${response.status})`);
  }
  return response.json();
};

export interface LikeResponse {
  liked: boolean;
  likeCount: number;
}

export const likePost = async (postId: string): Promise<LikeResponse | null> => {
  try {
    const response = await fetchWithAuth(`${FORUM_API_BASE}/posts/${postId}/like`, {
      method: 'POST',
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.log('Failed to like post:', error);
    return null;
  }
};

export const reportPost = async (
  postId: string,
  reason: string,
): Promise<void> => {
  const response = await fetchWithAuth(
    `${FORUM_API_BASE}/posts/${postId}/report`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Report failed');
  }
};

export const voteOnPoll = async (
  pollId: string,
  optionId: string,
): Promise<PostDto | null> => {
  try {
    let response = await fetchWithAuth(
      `${FORUM_API_BASE}/polls/${pollId}/vote`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      },
    );
    if (!response.ok) {
      response = await fetchWithAuth(
        `${FORUM_API_BASE}/posts/${pollId}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ optionId }),
        },
      );
    }
    if (!response.ok) {
      response = await fetchWithAuth(
        `${FORUM_API_BASE}/polls/options/${optionId}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    if (!response.ok) {
      response = await fetchWithAuth(
        `${FORUM_API_BASE}/posts/polls/${pollId}/options/${optionId}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    if (!response.ok) return null;
    return await response.json().catch(() => null);
  } catch (error) {
    console.log("Failed to vote on poll:", error);
    return null;
  }
};

export const fetchReplies = async (postId: string): Promise<PostDto[]> => {
  try {
    const response = await fetchWithAuth(
      `${FORUM_API_BASE}/posts/${postId}/replies`,
    );
    return await response.json();
  } catch (error) {
    console.log("Failed to fetch replies:", error);
    triggerNetworkError();
    return [];
  }
};

export const postReply = async (
  postId: string,
  request: Partial<CreatePostRequest>,
): Promise<PostDto> => {
  const token = getToken();
  const response = await fetch(`${FORUM_API_BASE}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ...request, parentId: postId }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (body.message === 'content_policy_violation') {
      throw new Error(i18n.t('errors.contentPolicyViolation'));
    }
    throw new Error(body.message || `${i18n.t('errors.requestFailed')} (${response.status})`);
  }
  return response.json();
};

export const fetchTopics = async (): Promise<ForumTopicDto[]> => {
  try {
    const response = await fetchWithAuth(`${FORUM_API_BASE}/topics`);
    return await response.json();
  } catch (error) {
    console.log("Failed to fetch topics:", error);
    return [];
  }
};

export const fetchUserPosts = async (userId: string): Promise<PostDto[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/posts`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.content || [];
  } catch {
    return [];
  }
};

export const fetchUserReplies = async (userId: string): Promise<PostDto[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/replies`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.content || [];
  } catch {
    return [];
  }
};

export const fetchUserLikes = async (userId: string): Promise<PostDto[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/likes`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.content || [];
  } catch {
    return [];
  }
};
export const deletePost = async (id: string): Promise<void> => {
  const response = await fetchWithAuth(`${FORUM_API_BASE}/posts/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Delete failed');
  }
};
