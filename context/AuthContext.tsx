import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../services/authApi';
import { setToken, loadToken } from '../utils/tokenStorage';

interface AuthContextType {
    user: UserProfile | null;
    isLoggedIn: boolean;
    login: (user: UserProfile, token: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const initializeAuth = async () => {
            const token = await loadToken();
            if (token) {
                // Optionally verify token or fetch user profile here
                // For now, we'll keep the user null until they login again 
                // OR we could store the user object too.
            }
            setIsInitialized(true);
        };
        initializeAuth();
    }, []);

    const login = async (userData: UserProfile, token: string) => {
        setUser(userData);
        await setToken(token);
    };

    const logout = async () => {
        setUser(null);
        await setToken(null);
    };

    const isLoggedIn = !!user;

    if (!isInitialized) return null;

    return (
        <AuthContext.Provider value={{ user, isLoggedIn, login, logout }}>
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
