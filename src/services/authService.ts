import api from './api';
import type { User } from '@/types/user';

interface AuthResponse {
  user: User;
  token: string;
  message?: string; // Optional message for errors
}

interface SignupData {
  name: string;
  email: string;
  password: string;
  profilePic?: string; // URL or path
}

interface SigninData {
  email: string;
  password: string;
}

/**
 * Sign up a new user.
 * Currently sends profilePic as a URL string.
 * TODO: Implement actual file upload if needed.
 */
export const signup = async (data: SignupData): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>('/api/auth/signup', data);
    return response.data;
  } catch (error: any) {
    // Rethrow the error so the component can catch it and display the message
    throw error;
  }
};

/**
 * Sign in an existing user.
 */
export const signin = async (data: SigninData): Promise<AuthResponse> => {
   try {
    const response = await api.post<AuthResponse>('/api/auth/signin', data);
    return response.data;
   } catch (error: any) {
     // Rethrow the error
     throw error;
  }
};

// Add other auth-related functions here if needed (e.g., forgot password)
