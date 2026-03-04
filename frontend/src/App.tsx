import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import AgeGatePage from './pages/AgeGatePage';
import BunkerListPage from './pages/BunkerListPage';
import BunkerItemDetailPage from './pages/BunkerItemDetailPage';
import AddBottlePage from './pages/AddBottlePage';
import BatchEntryPage from './pages/BatchEntryPage';
import MenuBuilderPage from './pages/MenuBuilderPage';
import MenuEditorPage from './pages/MenuEditorPage';
import MenuPreviewPage from './pages/MenuPreviewPage';
import SettingsPage from './pages/SettingsPage';
import SharedBunkersPage from './pages/SharedBunkersPage';
import SharedBunkerViewPage from './pages/SharedBunkerViewPage';
import AdminPage from './pages/AdminPage';
import SupportPage from './pages/SupportPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import MessagesPage from './pages/MessagesPage';
import PostsPage from './pages/PostsPage';
import ReleaseNotesPage from './pages/ReleaseNotesPage';
import UnresolvedScansPage from './pages/UnresolvedScansPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      { index: true, element: <Navigate to="/bunker" replace /> },
      { path: 'bunker', element: <BunkerListPage /> },
      { path: 'bunker/:id', element: <BunkerItemDetailPage /> },
      { path: 'add-bottle', element: <AddBottlePage /> },
      { path: 'batch-entry', element: <BatchEntryPage /> },
      { path: 'menus', element: <MenuBuilderPage /> },
      { path: 'menus/:id/edit', element: <MenuEditorPage /> },
      { path: 'menus/:id/preview', element: <MenuPreviewPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'shared', element: <SharedBunkersPage /> },
      { path: 'shared/:shareId', element: <SharedBunkerViewPage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: 'support', element: <SupportPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'posts', element: <PostsPage /> },
      { path: 'whats-new', element: <ReleaseNotesPage /> },
      { path: 'bunker/unresolved', element: <UnresolvedScansPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/age-gate', element: <AgeGatePage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
