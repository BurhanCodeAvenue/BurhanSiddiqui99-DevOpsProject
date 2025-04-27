import axios from 'axios';
import { store } from '@/lib/store'; // Import Redux store
import { logoutUser } from '@/lib/features/auth/authSlice'; // Import logoutUser action

// Define your API base URL (For Next.js API Routes, it's usually just the root)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''; // Use environment variable or default to relative path

const api = axios.create({
  baseURL: API_BASE_URL, // Base URL will prepend '/api/...' routes
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token; // Get token from Redux state
    console.log(`[Axios Request Interceptor] Token from store for ${config.url}: ${token ? 'Present' : 'Missing'}`); // Log token presence and URL

    // Ensure headers object exists
    config.headers = config.headers ?? {};

    // Add token only to our internal API routes (adjust the condition if needed)
    // Check if the URL starts with '/api/' OR if it doesn't start with 'http' (relative paths assumed to be internal)
    if (token && config.url && (config.url.startsWith('/api/') || (!config.url.startsWith('http://') && !config.url.startsWith('https://')))) {
        console.log(`[Axios Request Interceptor] Attaching token to ${config.method?.toUpperCase()} ${config.url}`);
        config.headers.Authorization = `Bearer ${token}`;
    } else if (config.url && (config.url.startsWith('/api/') || (!config.url.startsWith('http://') && !config.url.startsWith('https://')))) {
        console.warn(`[Axios Request Interceptor] No token found in Redux state for internal API route: ${config.url}`);
        // Optionally, you could prevent the request here if a token is mandatory
        // return Promise.reject(new Error("Authentication token is missing"));
    } else {
        console.log(`[Axios Request Interceptor] Not attaching token to external URL: ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error('[Axios Request Interceptor] Request error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor for global error handling
api.interceptors.response.use(
  (response) => response, // Simply return successful responses
  (error) => {
    // Log errors globally
    if (error.response) {
      const status = error.response.status;
      const url = error.config.url;
      const message = error.response.data?.message || error.message;

      console.error(`[Axios Response Interceptor] Response error: ${status} for ${url}. Message: "${message}"`, error.response.data);

      // Check if it's a 401 Unauthorized error specifically
      if (status === 401) {
        console.warn(`[Axios Response Interceptor] Received 401 Unauthorized for ${url}. Token might be invalid or expired.`);

        // Check if the user is currently marked as authenticated in Redux.
        // Only dispatch logout if they are currently considered logged in, to avoid loops.
        const isAuthenticated = store.getState().auth.isAuthenticated;
        if (isAuthenticated) {
           console.log("[Axios Response Interceptor] User is authenticated in Redux, dispatching logout.");
           store.dispatch(logoutUser());
           // UI redirection should be handled by components listening to the auth state change
           // (e.g., in ChatLayout or a dedicated AuthGuard component)
        } else {
            console.log("[Axios Response Interceptor] User is already logged out in Redux, skipping logout dispatch.");
        }

      } else {
         // Handle other server errors (4xx other than 401, 5xx)
         console.error(`[Axios Response Interceptor] Unhandled server error: ${status} for ${url}`);
      }
    } else if (error.request) {
       // The request was made but no response was received
       console.error('[Axios Response Interceptor] No response received for request:', error.config.url, error.request);
    } else {
       // Something happened in setting up the request that triggered an Error
       console.error('[Axios Response Interceptor] Error setting up request:', error.message);
    }

    // Forward the error so individual calls can handle it appropriately if needed
    return Promise.reject(error);
  }
);


export default api;
