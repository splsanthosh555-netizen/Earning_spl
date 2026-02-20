import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'https://spl-earnings.onrender.com/api',
});


API.interceptors.request.use((config) => {
    const token = localStorage.getItem('spl_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('spl_token');
            localStorage.removeItem('spl_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default API;
