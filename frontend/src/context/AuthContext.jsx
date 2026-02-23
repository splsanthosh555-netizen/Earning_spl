import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('spl_token');
        const savedUser = localStorage.getItem('spl_user');

        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
                // Refresh user data
                API.get('/user/profile').then(res => {
                    const userData = res.data;
                    setUser(userData);
                    localStorage.setItem('spl_user', JSON.stringify(userData));
                }).catch(() => {
                    logout();
                });
            } catch (err) {
                console.error("Auth init error:", err);
                logout();
            }
        }
        setLoading(false);
    }, []);

    const login = (token, userData) => {
        localStorage.setItem('spl_token', token);
        localStorage.setItem('spl_user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('spl_token');
        localStorage.removeItem('spl_user');
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const res = await API.get('/user/profile');
            setUser(res.data);
            localStorage.setItem('spl_user', JSON.stringify(res.data));
        } catch (err) {
            // ignore
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};
