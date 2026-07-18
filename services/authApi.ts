import { API_BASE_URL, fetchWithTimeout } from "./config";
import i18n from "../utils/i18n";

const AUTH_BASE_URL = `${API_BASE_URL}/api/v1/auth`;

const isPhoneContact = (contact: string) =>
  /^\+?[0-9]{7,15}$/.test(contact.trim().replace(/[\s\-()]/g, ''));

const normalizePhone = (phone: string): string => {
  const digits = phone.trim().replace(/[\s\-()]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('00')) return '+' + digits.slice(2);
  if (digits.startsWith('0')) return '+90' + digits.slice(1);
  return '+90' + digits;
};

const sanitizeContact = (contact: string) => {
  const trimmed = contact.trim();
  if (isPhoneContact(trimmed)) return normalizePhone(trimmed);
  return trimmed.toLowerCase();
};

const wrapNetworkError = (error: unknown): never => {
  if (error instanceof TypeError) {
    throw new Error(i18n.t('errors.networkError'));
  }
  throw error;
};

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  userType: string;
  emailVerified: boolean;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export const authApi = {
  signup: async (
    fullName: string,
    contact: string,
    password: string,
    kvkkAccepted: boolean = true,
    termsAccepted: boolean = true,
    birthDate?: string,
    island?: string,
    inviteToken?: string,
  ): Promise<{ message: string }> => {
    try {
      const sanitized = sanitizeContact(contact);
      const contactField = isPhoneContact(sanitized) ? { phone: sanitized } : { email: sanitized };
      const response = await fetchWithTimeout(`${AUTH_BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          ...contactField,
          password,
          kvkkAccepted,
          termsAccepted,
          ...(birthDate ? { birthDate } : {}),
          ...(island ? { island } : {}),
          ...(inviteToken ? { inviteToken } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.message || data.error || i18n.t('errors.signupFailed'),
        );
      return data;
    } catch (error) {
      return wrapNetworkError(error);
    }
  },

  verifyOtp: async (
    contact: string,
    code: string,
  ): Promise<LoginResponse> => {
    try {
      const sanitized = sanitizeContact(contact);
      const contactField = isPhoneContact(sanitized) ? { phone: sanitized } : { email: sanitized };
      const response = await fetchWithTimeout(`${AUTH_BASE_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...contactField, code }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.message || data.error || i18n.t('errors.otpInvalid'),
        );
      return data as LoginResponse;
    } catch (error) {
      return wrapNetworkError(error);
    }
  },

  login: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await fetchWithTimeout(`${AUTH_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sanitizeContact(email), password }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || data.error || i18n.t('errors.loginFailed'));
      return data;
    } catch (error) {
      return wrapNetworkError(error);
    }
  },

  resendVerification: async (contact: string): Promise<{ message: string }> => {
    try {
      const sanitized = sanitizeContact(contact);
      const contactField = isPhoneContact(sanitized) ? { phone: sanitized } : { email: sanitized };
      const response = await fetchWithTimeout(`${AUTH_BASE_URL}/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactField),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || data.error || i18n.t('errors.resendFailed'));
      return data;
    } catch (error) {
      return wrapNetworkError(error);
    }
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    try {
      const response = await fetchWithTimeout(`${AUTH_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sanitizeContact(email) }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.message ||
            data.error ||
            i18n.t('errors.forgotPasswordFailed'),
        );
      return data;
    } catch (error) {
      return wrapNetworkError(error);
    }
  },

  resetPassword: async (
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> => {
    try {
      const response = await fetchWithTimeout(`${AUTH_BASE_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.message ||
            data.error ||
            i18n.t('errors.resetPasswordFailed'),
        );
      return data;
    } catch (error) {
      return wrapNetworkError(error);
    }
  },

  // Exchanges a still-valid JWT for a fresh 30-day token.
  // Called silently on every app launch — zero UX impact.
  refresh: async (currentToken: string): Promise<LoginResponse | null> => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  },

  getInviteEmail: async (inviteToken: string): Promise<string | null> => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/invite?token=${encodeURIComponent(inviteToken)}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.email ?? null;
    } catch {
      return null;
    }
  },

  deleteAccount: async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
