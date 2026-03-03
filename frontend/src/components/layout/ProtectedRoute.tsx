import { Navigate, Outlet } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useCurrentUser } from '../../hooks/useUser';
import LoadingScreen from './LoadingScreen';
import Navbar from './Navbar';
import FloatingChat from '../support/FloatingChat';
import ToastContainer from '../ui/ToastContainer';

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading: authLoading, error: authError } = useAuth0();
  const { data: user, isLoading: userLoading } = useCurrentUser();

  // Always check auth loading first to prevent flash (v1 lesson)
  if (authLoading) return <LoadingScreen />;
  // If Auth0 errored (e.g. silent-auth iframe blocked) treat as logged out
  if (authError || !isAuthenticated) return <Navigate to="/login" replace />;

  // Wait for user data to load before checking age
  if (userLoading) return <LoadingScreen />;

  // Redirect to age gate if not verified
  if (user && !user.age_verified) return <Navigate to="/age-gate" replace />;

  // Redirect to verify-email page if email not verified
  if (user && user.age_verified && !user.email_verified) return <Navigate to="/verify-email" replace />;

  return (
    <div className="min-h-screen bg-gray-50 print:min-h-0 print:bg-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 print:p-0 print:m-0 print:max-w-none">
        <Outlet />
      </main>
      <ToastContainer />
      <FloatingChat />
    </div>
  );
}
