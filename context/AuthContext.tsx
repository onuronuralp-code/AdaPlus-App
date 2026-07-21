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
    login: (user: UserProfile, token: string, isNewSignup?: boolean) => Promise<void>;
    logout: () => Promise<void>;
    updateProfile: (updatedUser: UserProfile) => void;
    hasJustBecomeIslander: boolean;
    clearIslanderCelebration: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [hasJustBecomeIslander, setHasJustBecomeIslander] = useState(false);
    const logoutRef = useRef<(() => Promise<void>) | undefined>(undefined);

    useEffect(() => {
        _onUnauthorized = () => logoutRef.current?.();
        return () => { _onUnauthorized = null; };
    }, []);

    useEffect(() => {
        const initializeAuth = async () => {
            const { token, user: storedUser } = await loadAuthData();
            if (token && storedUser) {
                // Optimistically log the user in so the app opens instantly and works offline
                setUser(storedUser);
                
                try {
                    const refreshed = await authApi.refresh(token);
                    if (refreshed) {
                        if (storedUser.userType !== 'ISLAND_RESIDENT' && refreshed.user.userType === 'ISLAND_RESIDENT') {
                            setHasJustBecomeIslander(true);
                        }
                        await setToken(refreshed.token);
                        await setUserStorage(refreshed.user);
                        setUser(refreshed.user);
                        registerForPushNotifications();
                    }
                } catch {
                    // Network error on refresh — do nothing, keep user logged in
                }
            }
            setIsInitialized(true);
        };
        initializeAuth();
    }, []);

    const login = async (userData: UserProfile, token: string, isNewSignup?: boolean) => {
        setUser(userData);
        await setToken(token);
        await setUserStorage(userData);
        if (isNewSignup && userData.userType === 'ISLAND_RESIDENT') {
            setHasJustBecomeIslander(true);
        }
        registerForPushNotifications();
    };

    const logout = async () => {
        setUser(null);
        await setToken(null);
        unregisterPushNotifications();
    };

    logoutRef.current = logout;
    
    const updateProfile = async (updatedUser: UserProfile) => {
        if (user && user.userType !== 'ISLAND_RESIDENT' && updatedUser.userType === 'ISLAND_RESIDENT') {
            setHasJustBecomeIslander(true);
        }
        setUser(updatedUser);
        await setUserStorage(updatedUser);
    };

    const clearIslanderCelebration = () => setHasJustBecomeIslander(false);

    const isLoggedIn = !!user;

    if (!isInitialized) return null;

    return (
        <AuthContext.Provider value={{ 
            user, isLoggedIn, login, logout, updateProfile, 
            hasJustBecomeIslander, clearIslanderCelebration 
        }}>
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
