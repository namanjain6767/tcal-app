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
    },
});

// 3. Automatically add the authentication token to every request
api.interceptors.request.use(config => {
    const token = getAuthToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
