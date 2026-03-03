import { useState } from 'react';
import { useAllUsers, useUpdateUserRole, useSetEmailVerified } from '../../hooks/useAdmin';
import { useCurrentUser } from '../../hooks/useUser';
import { useUIStore } from '../../stores/uiStore';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  curator: 'bg-blue-100 text-blue-800',
  user: 'bg-gray-100 text-gray-600',
};

export default function AllUsersTab() {
  const addToast = useUIStore((s) => s.addToast);
  const { data: currentUser } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const updateRole = useUpdateUserRole();
  const setEmailVerified = useSetEmailVerified();

  const { data, isLoading } = useAllUsers({ q: search || undefined, limit: 50, offset: page * 50 });
  const users = data?.users || [];
  const total = data?.total || 0;

  const isAdmin = currentUser?.role === 'admin';

  const handleRoleChange = (userId: number, displayName: string | null, newRole: string) => {
    const label = displayName || 'this user';
    if (!confirm(`Change ${label}'s role to ${newRole}?`)) return;
    updateRole.mutate(
      { id: userId, role: newRole },
      {
        onSuccess: () => addToast('success', `Role updated to ${newRole}`),
        onError: (err: any) => addToast('error', err?.message || 'Failed to update role'),
      }
    );
  };

  const handleEmailVerifiedToggle = (userId: number, displayName: string | null, currentValue: boolean) => {
    const label = displayName || 'this user';
    const action = currentValue ? 'revoke verification from' : 'verify';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${label}?`)) return;
    setEmailVerified.mutate(
      { id: userId, email_verified: !currentValue },
      {
        onSuccess: () => addToast('success', currentValue ? 'Verification revoked' : 'User verified'),
        onError: (err: any) => addToast('error', err?.message || 'Failed to update verification'),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search by email or name..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
        <span className="text-sm text-gray-500">{total} users</span>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">Only administrators can manage user roles. You can view users but not change their roles.</p>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-gray-500">No users found.</p>
      ) : (
        <div className="space-y-2">
          {users.map((u: any) => {
            const isSelf = currentUser?.id === u.id;
            return (
              <div key={u.id} className="bg-white rounded-lg shadow px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {u.display_name || u.email}
                    {isSelf && <span className="text-xs text-gray-400 ml-2">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {u.email}
                    {u.bunker_count > 0 && ` · ${u.bunker_count} item${u.bunker_count !== 1 ? 's' : ''} in bunker`}
                  </p>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_COLORS[u.role] || ROLE_COLORS.user}`}>
                  {u.role}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => handleEmailVerifiedToggle(u.id, u.display_name, u.email_verified)}
                    disabled={setEmailVerified.isPending}
                    title={u.email_verified ? 'Click to revoke verification' : 'Click to verify user'}
                    className={`px-2 py-0.5 text-xs font-medium rounded-full transition-colors disabled:opacity-50 ${
                      u.email_verified
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {u.email_verified ? 'Verified' : 'Unverified'}
                  </button>
                )}
                {isAdmin && !isSelf && (
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, u.display_name, e.target.value)}
                    disabled={updateRole.isPending}
                    className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                  >
                    <option value="user">User</option>
                    <option value="curator">Curator</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
              </div>
            );
          })}
        </div>
      )}

      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50">
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-500">Page {page + 1} of {Math.ceil(total / 50)}</span>
          <button onClick={() => setPage(page + 1)} disabled={(page + 1) * 50 >= total} className="px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
