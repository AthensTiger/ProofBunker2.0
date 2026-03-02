import { useAuth0 } from '@auth0/auth0-react';
import { Navigate } from 'react-router-dom';
import LoadingScreen from '../components/layout/LoadingScreen';

export default function LoginPage() {
  const { loginWithRedirect, isAuthenticated, isLoading, error } = useAuth0();

  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/bunker" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
          Proof Bunker
        </h1>
        <p className="text-amber-200 text-lg mb-10">
          Your premium spirits collection, organized.
        </p>
        <button
          onClick={() => loginWithRedirect()}
          className="bg-white text-amber-900 font-semibold px-8 py-3 rounded-lg text-lg hover:bg-amber-50 transition-colors shadow-lg"
        >
          Sign In
        </button>
        {error && (
          <p className="mt-6 text-red-300 text-sm bg-black/30 rounded px-4 py-2 max-w-sm mx-auto">
            Auth error: {error.message}
          </p>
        )}
      </div>
    </div>
  );
}
