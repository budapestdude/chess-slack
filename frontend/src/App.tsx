import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { lazy, Suspense } from 'react';
import { RootState } from './store';
import { ChessLoadingState } from './components/ChessEmptyState';

// Lazy load all page components for better code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const WorkspacesListPage = lazy(() => import('./pages/WorkspacesListPage'));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage'));
const AgentDashboardPage = lazy(() => import('./pages/AgentDashboardPage'));
const TaskBoardPage = lazy(() => import('./pages/TaskBoardPage'));
const PersonalTrackerPage = lazy(() => import('./pages/PersonalTrackerPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const ToolsPage = lazy(() => import('./pages/ToolsPage'));
const CollaborationPage = lazy(() => import('./pages/CollaborationPage'));
const MeetingPage = lazy(() => import('./pages/MeetingPage'));
const BusinessPage = lazy(() => import('./pages/BusinessPage'));
const MarketingPage = lazy(() => import('./pages/MarketingPage'));
const SprintOverviewPage = lazy(() => import('./pages/SprintOverviewPage'));
const MarketingSprintPage = lazy(() => import('./pages/MarketingSprintPage'));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useSelector((state: RootState) => state.auth);
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token } = useSelector((state: RootState) => state.auth);
  return !token ? <>{children}</> : <Navigate to="/workspaces" />;
}

// Loading fallback component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 via-white to-gray-50">
      <ChessLoadingState text="Loading ChessSlack..." />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
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
        <Route
          path="/invite/:token"
          element={
            <PrivateRoute>
              <AcceptInvitePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/agents"
          element={
            <PrivateRoute>
              <AgentDashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/tasks"
          element={
            <PrivateRoute>
              <TaskBoardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/personal"
          element={
            <PrivateRoute>
              <PersonalTrackerPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/documents"
          element={
            <PrivateRoute>
              <DocumentsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/tools"
          element={
            <PrivateRoute>
              <ToolsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/collaboration"
          element={
            <PrivateRoute>
              <CollaborationPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/meetings"
          element={
            <PrivateRoute>
              <MeetingPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/business"
          element={
            <PrivateRoute>
              <BusinessPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/marketing"
          element={
            <PrivateRoute>
              <MarketingPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/marketing/sprints"
          element={
            <PrivateRoute>
              <SprintOverviewPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/marketing/sprint/:sprintId"
          element={
            <PrivateRoute>
              <MarketingSprintPage />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/workspaces" />} />
        <Route path="*" element={<Navigate to="/workspaces" />} />
      </Routes>
    </Suspense>
  );
}