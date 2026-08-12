import { API_BASE_URL, fetchWithTimeout } from "./config";
import i18n from "../utils/i18n";
import { getToken } from "../utils/tokenStorage";

const AUTH_BASE_URL = `${API_BASE_URL}/api/v1/auth`;

const phoneVerifyErrorMessage = (rawMessage: string | undefined, status: number): string => {
  if (rawMessage === 'phone_already_linked') return i18n.t('phoneVerify.phoneAlreadyLinked', { defaultValue: 'Bu telefon numarası başka bir hesaba bağlı.' });
  if (rawMessage === 'otp_incorrect_or_expired') return i18n.t('phoneVerify.incorrectCode', { defaultValue: 'Kod hatalı veya süresi dolmuş. Lütfen tekrar deneyin.' });
  return rawMessage || `Request failed (${status})`;
};

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
  phone?: string;
  phoneVerified?: boolean;
  role: string;
  userType: string;
  emailVerified: boolean;
  address?: string;
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
    additionalPhone?: string,
    existingPhoneOtp?: string,
  ): Promise<{ message: string }> => {
    try {
      const sanitized = sanitizeContact(contact);
      const contactField = isPhoneContact(sanitized) ? { phone: sanitized } : { email: sanitized };
      const normalizedAdditionalPhone = additionalPhone ? normalizePhone(additionalPhone) : undefined;
      const response = await fetchWithTimeout(`${AUTH_BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          ...contactField,
          ...(!contactField.phone && normalizedAdditionalPhone ? { phone: normalizedAdditionalPhone } : {}),
          password,
          kvkkAccepted,
          termsAccepted,
          ...(birthDate ? { birthDate } : {}),
          ...(island ? { island } : {}),
          ...(inviteToken ? { inviteToken } : {}),
          ...(existingPhoneOtp ? { existingPhoneOtp } : {}),
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

  login: async (identifier: string, password: string): Promise<LoginResponse> => {
    try {
      const sanitized = sanitizeContact(identifier);
      const contactField = isPhoneContact(sanitized) ? { phone: sanitized } : { email: sanitized };
      const response = await fetchWithTimeout(`${AUTH_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...contactField, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        let msg = data.message || data.error || i18n.t('errors.loginFailed');
        if (typeof msg === 'string' && (msg.toLowerCase().includes('credentials') || msg.toLowerCase().includes('invalid'))) {
          msg = i18n.t('auth.invalidCredentials', { defaultValue: 'Geçersiz e-posta/telefon veya şifre.' });
        }
        throw new Error(msg);
      }
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
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error || data.success === false || data.userNotFound || data.exists === false || data.userExists === false) {
        let msg = data.message || data.error || i18n.t('auth.userNotFound', { defaultValue: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.' });
        if (typeof msg === 'string' && (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('bulunamadı') || msg.toLowerCase().includes('user') || msg.toLowerCase().includes('exist') || response.status === 404 || response.status === 400)) {
          msg = i18n.t('auth.userNotFound', { defaultValue: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.' });
        }
        throw new Error(msg);
      }
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

  verifyPassword: async (identifier: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!identifier) return { success: false, message: i18n.t('errors.invalidPassword', { defaultValue: 'Mevcut şifreniz hatalı.' }) };
      const res = await authApi.login(identifier, password);
      if (res && res.token) {
        return { success: true };
      }
      return { success: false, message: i18n.t('errors.invalidPassword', { defaultValue: 'Mevcut şifreniz hatalı.' }) };
    } catch {
      return { success: false, message: i18n.t('errors.invalidPassword', { defaultValue: 'Mevcut şifreniz hatalı.' }) };
    }
  },

  // Exchanges a still-valid JWT for a fresh 30-day token.
  // Called silently on every app launch — zero UX impact.
  refresh: async (currentToken: string): Promise<LoginResponse | null> => {
    try {
      const response = await fetchWithTimeout(`${AUTH_BASE_URL}/refresh`, {
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
      const response = await fetchWithTimeout(`${AUTH_BASE_URL}/invite?token=${encodeURIComponent(inviteToken)}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.email ?? null;
    } catch {
      return null;
    }
  },

  // Public — sends an OTP to prove ownership of a phone number typed into the
  // "already have a phone account?" field on invite-signup, before it's submitted
  // alongside the main signup request.
  sendExistingPhoneOtp: async (phone: string): Promise<void> => {
    const response = await fetchWithTimeout(`${AUTH_BASE_URL}/existing-phone/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalizePhone(phone) }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `Request failed (${response.status})`);
    }
  },

  updateProfile: async (fullName: string, address: string): Promise<UserProfile | null> => {
    const token = getToken();
    const body = { fullName, address };
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/users/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.message || `Request failed (${response.status})`);
    }
    return response.json();
  },

  sendPhoneOtp: async (phone: string): Promise<void> => {
    const token = getToken();
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/users/me/phone/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(phoneVerifyErrorMessage(body.message, response.status));
    }
  },

  verifyPhone: async (phone: string, code: string): Promise<UserProfile> => {
    const token = getToken();
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/users/me/phone/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone, code }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(phoneVerifyErrorMessage(body.message, response.status));
    }
    return response.json();
  },

  sendEmailOtp: async (email: string): Promise<void> => {
    const token = getToken();
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/users/me/email/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `Request failed (${response.status})`);
    }
  },

  verifyEmail: async (email: string, code: string): Promise<UserProfile> => {
    const token = getToken();
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/users/me/email/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email, code }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `Request failed (${response.status})`);
    }
    return response.json();
  },

  deleteAccount: async (): Promise<boolean> => {
    try {
      const token = getToken();
      if (!token) return true;
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/users/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) return true;
      if (response.status === 404) {
        const altResponse = await fetchWithTimeout(`${API_BASE_URL}/api/v1/auth/account`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        return altResponse.ok;
      }
      return false;
    } catch (e) {
      console.warn("deleteAccount request error:", e);
      return false;
    }
  },
};

export const fetchUserCount = async (): Promise<number> => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/users/count`);
    if (!response.ok) return 0;
    const data = await response.json();
    return data.count || 0;
  } catch {
    return 0;
  }
};
