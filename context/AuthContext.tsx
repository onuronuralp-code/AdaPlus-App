import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../services/authApi';
import { setToken, loadAuthData, setUserStorage } from '../utils/tokenStorage';

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
    };

    const logout = async () => {
        setUser(null);
        await setToken(null); // This also clears user storage in my implementation
    };
    
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
