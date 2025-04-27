import api from './api';
import type { User } from '@/types/user';

/**
 * Search for users by name.
 * Requires authentication (token is added by the API interceptor).
 */
export const searchUsersApi = async (nameQuery: string): Promise<User[]> => {
  if (!nameQuery.trim()) {
    return []; // Return empty array if query is empty
  }
  try {
    console.log(nameQuery, "searchUsersApi");	
    
    const response = await api.get<User[]>(`/api/users/search`, {
      params: { name: nameQuery }, // Send query as URL parameter
    });
    console.log("[API /users/search] Search successful, results:", response.data.name);
     // Added this log to inspect data
    if (response.data && response.data.length > 0) {
      console.log("[API /users/search] First user in results:", response.data[0]);
    } else {
       console.log("[API /users/search] No users found in results.");
    }
    
    return response.data;
  } catch (error: any) {
     console.error("Failed to search users:", error);
     // Rethrow the original error object to allow the caller to inspect status code etc.
     // The interceptor already logs a generic unauthorized message.
     throw error;
     // Previous: throw new Error(error.response?.data?.message || "User search failed.");
  }
};

// Add other user-related API calls here (e.g., get user profile)
