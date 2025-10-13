import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { workspaceService } from '../../services/workspace';
import { Workspace } from '../../types';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
  error: string | null;
}

const initialState: WorkspaceState = {
  workspaces: [],
  currentWorkspace: null,
  loading: false,
  error: null,
};

export const fetchWorkspaces = createAsyncThunk('workspace/fetchAll', async () => {
  return await workspaceService.getWorkspaces();
});

export const fetchWorkspace = createAsyncThunk(
  'workspace/fetchOne',
  async (workspaceId: string) => {
    return await workspaceService.getWorkspace(workspaceId);
  }
);

export const createWorkspace = createAsyncThunk(
  'workspace/create',
  async (data: { name: string; slug: string; description?: string; workspaceType?: 'standard' | 'tournament' }) => {
    return await workspaceService.createWorkspace(data.name, data.slug, data.description, data.workspaceType);
  }
);

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setCurrentWorkspace: (state, action: PayloadAction<Workspace>) => {
      state.currentWorkspace = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkspaces.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.loading = false;
        state.workspaces = action.payload;
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch workspaces';
      })
      .addCase(fetchWorkspace.fulfilled, (state, action) => {
        state.currentWorkspace = action.payload;
      })
      .addCase(createWorkspace.fulfilled, (state, action) => {
        state.workspaces.push(action.payload);
        state.currentWorkspace = action.payload;
      });
  },
});

export const { setCurrentWorkspace, clearError } = workspaceSlice.actions;
export default workspaceSlice.reducer;