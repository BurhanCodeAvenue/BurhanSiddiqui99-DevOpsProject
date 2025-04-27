import type { User } from "@/types/user";
import type { Message } from "@/types/message";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ChatState {
  activeChatUser: User | null;
  messages: Message[];
  onlineUsers: string[]; // Store user IDs of online users
  loading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  activeChatUser: null,
  messages: [],
  onlineUsers: [],
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveChatUser: (state, action: PayloadAction<User | null>) => {
      state.activeChatUser = action.payload;
      state.messages = []; // Clear messages when changing chat
      state.error = null;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      // Avoid duplicates if message already exists (e.g., due to socket events)
      if (!state.messages.some(msg => msg.id === action.payload.id)) {
        state.messages.push(action.payload);
      }
    },
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
      state.loading = false;
      state.error = null;
    },
     setOnlineUsers: (state, action: PayloadAction<string[]>) => {
      state.onlineUsers = action.payload;
    },
    setChatLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setChatError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearChatState: (state) => {
      state.activeChatUser = null;
      state.messages = [];
      state.onlineUsers = [];
      state.loading = false;
      state.error = null;
    }
  },
});

export const {
  setActiveChatUser,
  addMessage,
  setMessages,
  setOnlineUsers,
  setChatLoading,
  setChatError,
  clearChatState,
} = chatSlice.actions;
export default chatSlice.reducer;
