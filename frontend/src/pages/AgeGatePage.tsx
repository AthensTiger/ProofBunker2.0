import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Navigate } from 'react-router-dom';
import { useCurrentUser, useVerifyAge } from '../hooks/useUser';
import LoadingScreen from '../components/layout/LoadingScreen';

export default function AgeGatePage() {
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth0();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const verifyAge = useVerifyAge();
  const [denied, setDenied] = useState(false);

  if (authLoading || userLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.age_verified) return <Navigate to="/bunker" replace />;

  if (denied) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Sorry
          </h2>
          <p className="text-gray-600 mb-6">
            You must be at least 21 years of age to use Proof Bunker.
          </p>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="text-amber-700 hover:text-amber-900 font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Age Verification
        </h2>
        <p className="text-gray-600 mb-8">
          You must be at least 21 years of age to use Proof Bunker.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => verifyAge.mutate()}
            disabled={verifyAge.isPending}
            className="bg-amber-700 text-white font-semibold px-6 py-3 rounded-lg hover:bg-amber-800 transition-colors disabled:opacity-50"
          >
            {verifyAge.isPending ? 'Verifying...' : 'I am 21 or older'}
          </button>
          <button
            onClick={() => setDenied(true)}
            className="text-gray-500 hover:text-gray-700 font-medium py-2"
          >
            I am under 21
          </button>
        </div>
      </div>
    </div>
  );
}
