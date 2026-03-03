import { useAuth0 } from '@auth0/auth0-react';

export default function VerifyEmailPage() {
  const { logout } = useAuth0();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 mb-3">Account Pending Verification</h1>

        <p className="text-gray-600 mb-4">
          Your account is awaiting verification by an administrator. Once approved, you'll have full access to Proof Bunker.
        </p>

        <p className="text-sm text-gray-500 mb-8">
          If you believe this is an error or need assistance, please contact support.
        </p>

        <button
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
          className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
