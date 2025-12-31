import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// API base URL - adjust according to your environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Define types
interface MfaSetupState {
  challengeId: string | null;
  options: any | null;
  loading: boolean;
  error: string | null;
  success: boolean;
  token: string | null;
  user: any | null;
}

const initialState: MfaSetupState = {
  challengeId: null,
  options: null,
  loading: false,
  error: null,
  success: false,
  token: null,
  user: null,
};

// Async thunk to select MFA method
export const selectMfaMethod = createAsyncThunk(
  'mfaSetup/selectMfaMethod',
  async (
    { challengeId, mfaMethod }: { challengeId: string; mfaMethod: 'TOTP' | 'PASSKEY' },
    { rejectWithValue }
  ) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/users/select-mfa-method`, {
        challengeId,
        mfaMethod,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to select MFA method'
      );
    }
  }
);

// Async thunk to verify MFA setup (both TOTP and PASSKEY)
export const verifyMfaSetup = createAsyncThunk(
  'mfaSetup/verifyMfaSetup',
  async (
    { challengeId, code, credential }: { 
      challengeId: string; 
      code?: string; 
      credential?: any 
    },
    { rejectWithValue }
  ) => {
    try {
      const payload: any = { challengeId };
      if (code) payload.code = code;
      if (credential) payload.credential = credential;
      
      const response = await axios.post(`${API_BASE_URL}/api/v1/users/verify-mfa-setup`, payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to verify MFA'
      );
    }
  }
);

const mfaSetupSlice = createSlice({
  name: 'mfaSetup',
  initialState,
  reducers: {
    resetMfaSetup: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
    },
    setChallengeId: (state, action) => {
      state.challengeId = action.payload;
    },
    clearMfaSetup: () => initialState,
  },
  extraReducers: (builder) => {
    // Select MFA Method
    builder
      .addCase(selectMfaMethod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(selectMfaMethod.fulfilled, (state, action) => {
        state.loading = false;
        // Store the challengeId from the response
        state.challengeId = action.payload.challengeId;
        state.options = action.payload;
        state.error = null;
      })
      .addCase(selectMfaMethod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Verify MFA Setup
    builder
      .addCase(verifyMfaSetup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyMfaSetup.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
        // Clear sensitive data after successful verification
        state.challengeId = null;
        state.options = null;
      })
      .addCase(verifyMfaSetup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetMfaSetup, setChallengeId, clearMfaSetup } = mfaSetupSlice.actions;
export default mfaSetupSlice.reducer;

