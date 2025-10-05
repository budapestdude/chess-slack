import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchWorkspaces } from '../store/slices/workspaceSlice';
import { logout } from '../store/slices/authSlice';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';
import { ChessEmptyState, ChessLoadingState } from '../components/ChessEmptyState';
import { KnightIcon } from '../components/ChessPieceIcons';
import toast from 'react-hot-toast';

export default function WorkspacesListPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { workspaces, loading } = useSelector((state: RootState) => state.workspace);
  const { user } = useSelector((state: RootState) => state.auth);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);

  useEffect(() => {
    dispatch(fetchWorkspaces());
  }, [dispatch]);

  const handleLogout = async () => {
    await dispatch(logout());
    toast.success('Logged out successfully');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-gray-50">
        <ChessLoadingState text="Loading workspaces..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-gray-50">
      <nav className="bg-white shadow-sm border-b-4 border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <KnightIcon className="w-8 h-8 text-gray-900" />
              <h1 className="text-2xl font-bold text-gray-900">ChessSlack</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.displayName || user?.username}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Workspaces</h2>
          <button
            onClick={() => setShowCreateWorkspace(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Create Workspace
          </button>
        </div>

        {workspaces.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg">
            <ChessEmptyState
              variant="board"
              title="No Workspaces Yet"
              description="Create your first workspace to start collaborating with your team. Think of it as setting up your chess board!"
              action={{
                label: "Create Your First Workspace",
                onClick: () => setShowCreateWorkspace(true)
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace, index) => {
              const pieces = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'] as const;
              const pieceType = pieces[index % pieces.length];

              return (
                <div
                  key={workspace.id}
                  onClick={() => navigate(`/workspace/${workspace.id}`)}
                  className="group bg-white p-6 rounded-lg shadow-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                >
                  {/* Chess piece watermark */}
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <KnightIcon className="w-32 h-32 text-gray-900" />
                  </div>

                  <div className="relative z-10">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-gray-900 rounded-full group-hover:animate-pulse" />
                      {workspace.name}
                    </h3>
                    {workspace.description && (
                      <p className="text-sm text-gray-600 mb-4">{workspace.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 uppercase font-semibold px-2 py-1 bg-gray-100 rounded">
                        {workspace.role}
                      </span>
                      <span className="text-gray-400 group-hover:text-gray-900 transition-colors">→</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateWorkspace && (
        <CreateWorkspaceModal onClose={() => setShowCreateWorkspace(false)} />
      )}
    </div>
  );
}