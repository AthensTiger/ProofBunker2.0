import { useAdminSettings, useUpdateSettings } from '../../hooks/useAdmin';

export default function SettingsTab() {
  const { data: settings, isLoading } = useAdminSettings();
  const update = useUpdateSettings();

  if (isLoading) return <p className="text-gray-500 text-sm">Loading settings...</p>;

  const requireLabel = settings?.require_label_verification === true;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Settings</h2>

        <div className="space-y-4">
          {/* Label Verification Mode */}
          <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Require Label Verification</p>
              <p className="text-xs text-gray-500 mt-0.5">
                When enabled, users must photograph the bottle label before adding an unverified product to their bunker.
                When disabled, users are prompted to verify but can skip.
              </p>
            </div>
            <button
              type="button"
              onClick={() => update.mutate({ require_label_verification: !requireLabel })}
              disabled={update.isPending}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 ${
                requireLabel ? 'bg-amber-700' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  requireLabel ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="pt-2">
            <p className="text-xs text-gray-400">
              Current mode: <span className="font-medium text-gray-600">{requireLabel ? 'Required' : 'Incentivized (optional)'}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
