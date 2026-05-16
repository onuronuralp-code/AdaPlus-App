import { API_BASE_URL } from "./config";

const AUTH_BASE_URL = `${API_BASE_URL}/api/v1/auth`;

const wrapNetworkError = (error: unknown): never => {
  if (error instanceof TypeError) {
    throw new Error(
      "Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.",
    );
  }
  throw error;
};

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  emailVerified: boolean;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export const authApi = {
  signup: async (
    fullName: string,
    email: string,
    password: string,
    kvkkAccepted: boolean = true,
    termsAccepted: boolean = true,
  ): Promise<{ message: string }> => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, kvkkAccepted, termsAccepted }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.message || data.error || "Kayıt sırasında bir hata oluştu.",
        );
      return data;
    } catch (error) {
      return wrapNetworkError(error);
    }
  },

  verifyOtp: async (
    email: string,
    code: string,
  ): Promise<{ message: string }> => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.message || data.error || "Doğrulama kodu geçersiz.",
        );
      return data;
    } catch (error) {
      return wrapNetworkError(error);
    }
  },

  login: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || data.error || "Giriş yapılamadı.");
      return data;
    } catch (error) {
      return wrapNetworkError(error);
    }
  },

  resendVerification: async (email: string): Promise<{ message: string }> => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || data.error || "Kod gönderilemedi.");
      return data;
    } catch (error) {
      return wrapNetworkError(error);
    }
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.message ||
            data.error ||
            "Şifre sıfırlama bağlantısı gönderilemedi.",
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
      const response = await fetch(`${AUTH_BASE_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.message ||
            data.error ||
            "Şifre sıfırlanamadı. Bağlantı geçersiz veya süresi dolmuş olabilir.",
        );
      return data;
    } catch (error) {
      return wrapNetworkError(error);
    }
  },
};
