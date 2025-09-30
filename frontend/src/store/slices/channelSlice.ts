import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { channelService } from '../../services/channel';
import { Channel } from '../../types';

interface ChannelState {
  channels: Channel[];
  currentChannel: Channel | null;
  loading: boolean;
  error: string | null;
}

const initialState: ChannelState = {
  channels: [],
  currentChannel: null,
  loading: false,
  error: null,
};

export const fetchChannels = createAsyncThunk(
  'channel/fetchAll',
  async (workspaceId: string) => {
    return await channelService.getChannels(workspaceId);
  }
);

export const fetchChannel = createAsyncThunk(
  'channel/fetchOne',
  async ({ workspaceId, channelId }: { workspaceId: string; channelId: string }) => {
    return await channelService.getChannel(workspaceId, channelId);
  }
);

export const createChannel = createAsyncThunk(
  'channel/create',
  async (data: {
    workspaceId: string;
    name: string;
    description?: string;
    isPrivate?: boolean;
  }) => {
    return await channelService.createChannel(
      data.workspaceId,
      data.name,
      data.description,
      data.isPrivate
    );
  }
);

export const joinChannel = createAsyncThunk(
  'channel/join',
  async ({ workspaceId, channelId }: { workspaceId: string; channelId: string }) => {
    await channelService.joinChannel(workspaceId, channelId);
    return channelId;
  }
);

const channelSlice = createSlice({
  name: 'channel',
  initialState,
  reducers: {
    setCurrentChannel: (state, action: PayloadAction<Channel>) => {
      state.currentChannel = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChannels.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChannels.fulfilled, (state, action) => {
        state.loading = false;
        state.channels = action.payload;
      })
      .addCase(fetchChannels.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch channels';
      })
      .addCase(fetchChannel.fulfilled, (state, action) => {
        state.currentChannel = action.payload;
      })
      .addCase(createChannel.fulfilled, (state, action) => {
        state.channels.push(action.payload);
      })
      .addCase(joinChannel.fulfilled, (state, action) => {
        const channel = state.channels.find((c) => c.id === action.payload);
        if (channel) {
          channel.isMember = true;
        }
      });
  },
});

export const { setCurrentChannel, clearError } = channelSlice.actions;
export default channelSlice.reducer;