import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchWorkspaces } from '../store/slices/workspaceSlice';
import { logout } from '../store/slices/authSlice';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading workspaces...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">ChessSlack</h1>
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
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">You don't have any workspaces yet.</p>
            <button
              onClick={() => setShowCreateWorkspace(true)}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Create your first workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                onClick={() => navigate(`/workspace/${workspace.id}`)}
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {workspace.name}
                </h3>
                {workspace.description && (
                  <p className="text-sm text-gray-600 mb-4">{workspace.description}</p>
                )}
                <span className="text-xs text-gray-500 uppercase">{workspace.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateWorkspace && (
        <CreateWorkspaceModal onClose={() => setShowCreateWorkspace(false)} />
      )}
    </div>
  );
}