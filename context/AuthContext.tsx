import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authApi, UserProfile } from '../services/authApi';
import { setToken, loadAuthData, setUserStorage } from '../utils/tokenStorage';
import { registerForPushNotifications, unregisterPushNotifications } from '../services/notificationService';

// Called by any API service that receives a 401 — triggers silent logout.
let _onUnauthorized: (() => void) | null = null;
export const handleUnauthorized = () => _onUnauthorized?.();

interface AuthContextType {
    user: UserProfile | null;
    isLoggedIn: boolean;
    login: (user: UserProfile, token: string) => Promise<void>;
    logout: () => Promise<void>;
    updateProfile: (updatedUser: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const logoutRef = useRef<(() => Promise<void>) | undefined>(undefined);

    useEffect(() => {
        _onUnauthorized = () => logoutRef.current?.();
        return () => { _onUnauthorized = null; };
    }, []);

    useEffect(() => {
        const initializeAuth = async () => {
            const { token, user: storedUser } = await loadAuthData();
            if (token && storedUser) {
                // Silently refresh the token on every app launch.
                // If the stored token is still valid, we get back a fresh 30-day token
                // so the user is never forced to re-login (Instagram pattern).
                // If the token is already expired the refresh returns null → logout.
                try {
                    const refreshed = await authApi.refresh(token);
                    if (refreshed) {
                        await setToken(refreshed.token);
                        await setUserStorage(refreshed.user);
                        setUser(refreshed.user);
                        registerForPushNotifications();
                    }
                } catch {
                    // Network error on refresh — leave user logged out silently
                }
            }
            setIsInitialized(true);
        };
        initializeAuth();
    }, []);

    const login = async (userData: UserProfile, token: string) => {
        setUser(userData);
        await setToken(token);
        await setUserStorage(userData);
        // Register after token is stored so the API call includes the Authorization header
        registerForPushNotifications();
    };

    const logout = async () => {
        setUser(null);
        await setToken(null);
        unregisterPushNotifications(); // fire-and-forget — don't block logout on this
    };

    // Keep ref in sync so _onUnauthorized can call the latest logout closure
    logoutRef.current = logout;
    
    const updateProfile = async (updatedUser: UserProfile) => {
        setUser(updatedUser);
        await setUserStorage(updatedUser);
    };

    const isLoggedIn = !!user;

    // Temporary override to give the user ISLANDER permissions for testing
    const testUser = user ? { ...user, role: 'ISLANDER' as any, userType: 'RESIDENT' as any } : null;

    if (!isInitialized) return null;

    return (
        <AuthContext.Provider value={{ user: testUser, isLoggedIn, login, logout, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
