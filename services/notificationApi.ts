import { getToken } from "../utils/tokenStorage";
import { API_BASE_URL } from "./config";
import { handleUnauthorized } from "../context/AuthContext";

export enum NotificationType {
  REPLY = "REPLY",
  LIKE = "LIKE",
  ACTIVITY = "ACTIVITY",
  SYSTEM = "SYSTEM",
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  referenceId?: string;
  read: boolean;
  createdAt: string;
}

const BASE = `${API_BASE_URL}/api/v1/users/me/notifications`;

const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchNotifications = async (): Promise<NotificationDto[]> => {
  try {
    const res = await fetch(BASE, { headers: authHeaders() });
    if (res.status === 401) { handleUnauthorized(); return []; }
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
};

export const fetchUnreadCount = async (): Promise<number> => {
  try {
    const res = await fetch(`${BASE}/unread-count`, { headers: authHeaders() });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count ?? 0;
  } catch {
    return 0;
  }
};

export const markNotificationRead = async (id: string): Promise<void> => {
  try {
    await fetch(`${BASE}/${id}/read`, { method: "POST", headers: authHeaders() });
  } catch {}
};

export const markAllRead = async (): Promise<void> => {
  try {
    await fetch(`${BASE}/read-all`, { method: "POST", headers: authHeaders() });
  } catch {}
};
