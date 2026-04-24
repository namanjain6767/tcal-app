import axios from 'axios';

// --- Helper function to get the auth token from local storage ---
const getAuthToken = () => localStorage.getItem('token');

// 1. Read the API URL from the environment variable
const API_URL = import.meta.env.VITE_API_URL;

// 2. Create a central Axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
    },
});

// 3. Automatically add the authentication token to every request
// Also add a timestamp to prevent browser/CDN caching
api.interceptors.request.use(config => {
    const token = getAuthToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add cache-busting timestamp to GET requests
    if (config.method === 'get') {
        config.params = {
            ...config.params,
            _t: Date.now()
        };
    }
    
    return config;
});

// 4. Intercept 401 Unauthorized responses to automatically log out
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            console.error('Session expired or invalid token. Logging out...');
            localStorage.removeItem('token');
            localStorage.removeItem('currentPage');
            window.location.href = '/'; // Redirect to home/login
        }
        return Promise.reject(error);
    }
);

export default api;
