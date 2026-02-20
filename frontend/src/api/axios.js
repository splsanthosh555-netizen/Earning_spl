import axios from 'axios';

import toast from 'react-hot-toast';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'https://earning-spl.onrender.com/api',
});

// Add auth token to every request
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('spl_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// For debugging: show the exact URL that fails
API.interceptors.response.use(
    (response) => response,
    (error) => {
        const failedUrl = error.config?.url || 'unknown';
        const fullUrl = `${error.config?.baseURL}${failedUrl}`;
        console.error(`API Error reaching: ${fullUrl}`, error);

        if (error.response?.status === 401) {
            localStorage.removeItem('spl_token');
            localStorage.removeItem('spl_user');
            window.location.href = '/login';
        } else if (!error.response) {
            // Network error / Connection failed
            toast.error(`Server unreachable at: ${fullUrl}. Please check Render status.`);
        }
        return Promise.reject(error);
    }
);

export default API;
