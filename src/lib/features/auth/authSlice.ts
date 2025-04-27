import type { User } from "@/types/user";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    setUser: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      // Persist token (optional: better to use httpOnly cookie in production)
      if (typeof window !== 'undefined') {
        localStorage.setItem("token", action.payload.token);
        localStorage.setItem("user", JSON.stringify(action.payload.user));
      }
    },
    logoutUser: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      // Clear persisted token
       if (typeof window !== 'undefined') {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    },
    hydrateAuth: (state) => {
       if (typeof window !== 'undefined') {
        const token = localStorage.getItem("token");
        const userString = localStorage.getItem("user");
        if (token && userString) {
          try {
            const user = JSON.parse(userString);
            state.user = user;
            state.token = token;
            state.isAuthenticated = true;
          } catch (e) {
            console.error("Failed to parse user from localStorage", e);
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }
        }
      }
    },
  },
});

export const { setLoading, setError, setUser, logoutUser, hydrateAuth } = authSlice.actions;
export default authSlice.reducer;
