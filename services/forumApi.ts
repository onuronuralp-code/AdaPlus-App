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

const MOCK_POSTS: PostDto[] = [
  {
    id: "mock1",
    authorId: "user1",
    authorName: "Ahmet Yılmaz",
    authorUserType: UserType.RESIDENT,
    content: "Adalar'da hafta sonu etkinlikleri hakkında ne düşünüyorsunuz? Bence daha fazla müzik festivali olmalı.",
    postType: PostType.DISCUSSION,
    island: Island.BUYUKADA,
    replyCount: 5,
    likeCount: 12,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    isLiked: false,
  },
  {
    id: "mock2",
    authorId: "user2",
    authorName: "Ayşe Demir",
    authorUserType: UserType.TOURIST,
    content: "Bisiklet kiralama fiyatları hakkında bilgisi olan var mı? Hangi rotayı önerirsiniz?",
    postType: PostType.INFO,
    island: Island.HEYBELIADA,
    replyCount: 2,
    likeCount: 8,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    isLiked: true,
  },
  {
    id: "mock3",
    authorId: "admin1",
    authorName: "AdaPlus",
    authorUserType: UserType.ADMIN,
    content: "Şiddetli lodos nedeniyle yarınki vapur seferlerinde aksamalar olabilir. Lütfen sefer saatlerini kontrol edin.",
    postType: PostType.ANNOUNCEMENT,
    island: Island.BUYUKADA,
    replyCount: 14,
    likeCount: 45,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    isLiked: false,
  }
];

// Helper for fetch with auth if needed
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetchWithTimeout(url, { ...options, headers });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Session expired');
  }
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

    // Return mock data if empty or error
    return data && data.length > 0 ? data : MOCK_POSTS;
  } catch (error) {
    console.log("Using mock data for forum posts due to error:", error);
    return MOCK_POSTS;
  }
};

export const fetchHotPosts = async (): Promise<PostDto[]> => {
  try {
    const response = await fetchWithAuth(`${FORUM_API_BASE}/posts/hot`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch hot posts:", error);
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
    console.error('Failed to like post:', error);
    return null;
  }
};

export const reportPost = async (
  postId: string,
  reason: string,
): Promise<boolean> => {
  try {
    const response = await fetchWithAuth(
      `${FORUM_API_BASE}/posts/${postId}/report`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      },
    );
    return response.ok;
  } catch (error) {
    console.error("Failed to report post:", error);
    return false;
  }
};

export const voteOnPoll = async (
  pollId: string,
  optionId: string,
): Promise<PostDto | null> => {
  try {
    const response = await fetchWithAuth(
      `${FORUM_API_BASE}/polls/${pollId}/vote`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      },
    );
    return await response.json();
  } catch (error) {
    console.error("Failed to vote on poll:", error);
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
    console.error("Failed to fetch replies:", error);
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
    console.error("Failed to fetch topics:", error);
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
export const deletePost = async (id: string): Promise<boolean> => {
  try {
    const token = await getToken();
    const response = await fetchWithTimeout(`${FORUM_API_BASE}/posts/${id}`, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to delete post:", error);
    return false;
  }
};
