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

export default api;
