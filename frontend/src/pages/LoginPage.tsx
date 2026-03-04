import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Navigate } from 'react-router-dom';
import LoadingScreen from '../components/layout/LoadingScreen';

export default function LoginPage() {
  const { loginWithRedirect, isAuthenticated, isLoading, error } = useAuth0();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  // If Auth0 silent-auth hangs (e.g. Chrome iOS blocks the refresh iframe),
  // stop waiting after 4 s and show the sign-in button.
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setLoadingTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (isLoading && !error && !loadingTimedOut) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/bunker" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 flex items-center justify-center">
      <div className="text-center">
        <img
          src="/logo.png"
          alt="Proof Bunker"
          className="w-64 h-64 object-contain mx-auto mb-6 drop-shadow-2xl"
        />
        <p className="text-amber-200 text-lg mb-10">
          Your premium spirits collection, organized.
        </p>
        <button
          onClick={() => loginWithRedirect()}
          className="bg-white text-amber-900 font-semibold px-8 py-3 rounded-lg text-lg hover:bg-amber-50 transition-colors shadow-lg"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
