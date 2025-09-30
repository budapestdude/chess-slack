import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import WorkspacesListPage from './pages/WorkspacesListPage';
import WorkspacePage from './pages/WorkspacePage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useSelector((state: RootState) => state.auth);
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token } = useSelector((state: RootState) => state.auth);
  return !token ? <>{children}</> : <Navigate to="/workspaces" />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/workspaces"
        element={
          <PrivateRoute>
            <WorkspacesListPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId"
        element={
          <PrivateRoute>
            <WorkspacePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId/channel/:channelId"
        element={
          <PrivateRoute>
            <WorkspacePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId/dm/:dmGroupId"
        element={
          <PrivateRoute>
            <WorkspacePage />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/workspaces" />} />
      <Route path="*" element={<Navigate to="/workspaces" />} />
    </Routes>
  );
}