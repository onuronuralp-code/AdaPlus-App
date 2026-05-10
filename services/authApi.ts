import { API_URL } from './apiConfig';

const AUTH_BASE_URL = API_URL + '/api/v1/auth';

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
    signup: async (fullName: string, email: string, password: string): Promise<{ message: string }> => {
        const response = await fetch(`${AUTH_BASE_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, password }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Kayıt sırasında bir hata oluştu.');
        }
        return data;
    },

    verifyOtp: async (email: string, code: string): Promise<{ message: string }> => {
        const response = await fetch(`${AUTH_BASE_URL}/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Doğrulama kodu geçersiz.');
        }
        return data;
    },

    login: async (email: string, password: string): Promise<LoginResponse> => {
        const response = await fetch(`${AUTH_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Giriş yapılamadı.');
        }
        return data;
    },

    resendVerification: async (email: string): Promise<{ message: string }> => {
        const response = await fetch(`${AUTH_BASE_URL}/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Kod gönderilemedi.');
        }
        return data;
    },

    forgotPassword: async (email: string): Promise<{ message: string }> => {
        const response = await fetch(`${AUTH_BASE_URL}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Şifre sıfırlama bağlantısı gönderilemedi.');
        }
        return data;
    },

    resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
        const response = await fetch(`${AUTH_BASE_URL}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Şifre sıfırlanamadı. Bağlantı geçersiz veya süresi dolmuş olabilir.');
        }
        return data;
    },
    updateProfile: async (fullName: string, role: string): Promise<UserProfile> => {
        const token = require('../utils/tokenStorage').getToken();
        const response = await fetch(API_URL + '/api/v1/users/me', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ fullName, role }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Profil güncellenemedi.');
        }
        return data;
    },
};
