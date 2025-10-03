import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Sidebar from './Sidebar';
import { dmService } from '../services/dm';

// Mock services
vi.mock('../services/dm', () => ({
  dmService: {
    getUserDMs: vi.fn(),
  },
}));

// Create a mock store
const createMockStore = (authState = {}) => {
  return configureStore({
    reducer: {
      auth: () => ({
        user: { id: 'user-1', username: 'testuser' },
        ...authState,
      }),
    },
  });
};

// Wrapper component for tests
const renderWithProviders = (
  component: React.ReactElement,
  store = createMockStore()
) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>{component}</BrowserRouter>
    </Provider>
  );
};

describe('Sidebar', () => {
  const mockWorkspace = {
    id: 'workspace-1',
    name: 'Test Workspace',
    description: 'A test workspace',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockChannels = [
    {
      id: 'channel-1',
      workspaceId: 'workspace-1',
      name: 'general',
      description: 'General discussion',
      isPrivate: false,
      isMember: true,
      userRole: 'member' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'channel-2',
      workspaceId: 'workspace-1',
      name: 'random',
      description: 'Random stuff',
      isPrivate: false,
      isMember: true,
      userRole: 'member' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const mockOnCreateChannel = vi.fn();
  const mockOnCreateDM = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (dmService.getUserDMs as any).mockResolvedValue([]);
  });

  it('renders workspace name', () => {
    renderWithProviders(
      <Sidebar
        workspace={mockWorkspace}
        channels={mockChannels}
        currentChannel={null}
        onCreateChannel={mockOnCreateChannel}
        onCreateDM={mockOnCreateDM}
      />
    );

    expect(screen.getByText('Test Workspace')).toBeInTheDocument();
  });

  it('renders all public channels', () => {
    renderWithProviders(
      <Sidebar
        workspace={mockWorkspace}
        channels={mockChannels}
        currentChannel={null}
        onCreateChannel={mockOnCreateChannel}
        onCreateDM={mockOnCreateDM}
      />
    );

    expect(screen.getByText('general')).toBeInTheDocument();
    expect(screen.getByText('random')).toBeInTheDocument();
  });

  it('highlights the current channel', () => {
    renderWithProviders(
      <Sidebar
        workspace={mockWorkspace}
        channels={mockChannels}
        currentChannel={mockChannels[0]}
        onCreateChannel={mockOnCreateChannel}
        onCreateDM={mockOnCreateDM}
      />
    );

    const generalButton = screen.getByText('general').closest('button');
    expect(generalButton).toHaveClass('bg-gray-700');
    expect(generalButton).toHaveClass('font-semibold');
  });

  it('calls onCreateChannel when create channel button is clicked', () => {
    renderWithProviders(
      <Sidebar
        workspace={mockWorkspace}
        channels={mockChannels}
        currentChannel={null}
        onCreateChannel={mockOnCreateChannel}
        onCreateDM={mockOnCreateDM}
      />
    );

    const createButtons = screen.getAllByTitle('Create channel');
    fireEvent.click(createButtons[0]);

    expect(mockOnCreateChannel).toHaveBeenCalledTimes(1);
  });

  it('calls onCreateDM when create DM button is clicked', () => {
    renderWithProviders(
      <Sidebar
        workspace={mockWorkspace}
        channels={mockChannels}
        currentChannel={null}
        onCreateChannel={mockOnCreateChannel}
        onCreateDM={mockOnCreateDM}
      />
    );

    const createDMButton = screen.getByTitle('New direct message');
    fireEvent.click(createDMButton);

    expect(mockOnCreateDM).toHaveBeenCalledTimes(1);
  });

  it('fetches and displays DMs on mount', async () => {
    const mockDMs = [
      {
        id: 'dm-1',
        workspaceId: 'workspace-1',
        isGroup: false,
        members: [
          {
            id: 'user-1',
            displayName: 'Test User',
            username: 'testuser',
          },
          {
            id: 'user-2',
            displayName: 'Other User',
            username: 'otheruser',
          },
        ],
        createdAt: new Date().toISOString(),
      },
    ];

    (dmService.getUserDMs as any).mockResolvedValue(mockDMs);

    renderWithProviders(
      <Sidebar
        workspace={mockWorkspace}
        channels={mockChannels}
        currentChannel={null}
        onCreateChannel={mockOnCreateChannel}
        onCreateDM={mockOnCreateDM}
      />
    );

    await waitFor(() => {
      expect(dmService.getUserDMs).toHaveBeenCalledWith('workspace-1');
    });

    await waitFor(() => {
      expect(screen.getByText('Other User')).toBeInTheDocument();
    });
  });

  it('shows loading message when DMs are being fetched', () => {
    (dmService.getUserDMs as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithProviders(
      <Sidebar
        workspace={mockWorkspace}
        channels={mockChannels}
        currentChannel={null}
        onCreateChannel={mockOnCreateChannel}
        onCreateDM={mockOnCreateDM}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('filters out private channels the user is not a member of', () => {
    const channelsWithPrivate = [
      ...mockChannels,
      {
        id: 'channel-3',
        workspaceId: 'workspace-1',
        name: 'secret',
        description: 'Secret channel',
        isPrivate: true,
        isMember: false,
        userRole: null as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    renderWithProviders(
      <Sidebar
        workspace={mockWorkspace}
        channels={channelsWithPrivate}
        currentChannel={null}
        onCreateChannel={mockOnCreateChannel}
        onCreateDM={mockOnCreateDM}
      />
    );

    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('shows private channels the user is a member of', () => {
    const channelsWithPrivate = [
      ...mockChannels,
      {
        id: 'channel-3',
        workspaceId: 'workspace-1',
        name: 'private',
        description: 'Private channel',
        isPrivate: true,
        isMember: true,
        userRole: 'member' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    renderWithProviders(
      <Sidebar
        workspace={mockWorkspace}
        channels={channelsWithPrivate}
        currentChannel={null}
        onCreateChannel={mockOnCreateChannel}
        onCreateDM={mockOnCreateDM}
      />
    );

    expect(screen.getByText('private')).toBeInTheDocument();
  });
});