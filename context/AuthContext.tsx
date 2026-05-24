import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserProfile } from '../services/authApi';
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
    const logoutRef = useRef<() => Promise<void>>();

    useEffect(() => {
        _onUnauthorized = () => logoutRef.current?.();
        return () => { _onUnauthorized = null; };
    }, []);

    useEffect(() => {
        const initializeAuth = async () => {
            const { token, user: storedUser } = await loadAuthData();
            if (token && storedUser) {
                setUser(storedUser);
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

    if (!isInitialized) return null;

    return (
        <AuthContext.Provider value={{ user, isLoggedIn, login, logout, updateProfile }}>
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
