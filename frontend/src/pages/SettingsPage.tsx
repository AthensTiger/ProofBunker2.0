import { useState, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useCurrentUser, useUpdateProfile, useUploadUserLogo, useDeleteUserLogo } from '../hooks/useUser';
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation, useUploadLocationLogo, useDeleteLocationLogo } from '../hooks/useLocations';
import { useMyShares, useCreateShare, useDeleteShare } from '../hooks/useShares';
import { useUIStore } from '../stores/uiStore';
import ExportDialog from '../components/export/ExportDialog';
import HelpTip from '../components/ui/HelpTip';

export default function SettingsPage() {
  const { logout } = useAuth0();
  const addToast = useUIStore((s) => s.addToast);
  const { data: user } = useCurrentUser();
  const { data: locations = [] } = useLocations();
  const { data: shares = [] } = useMyShares();
  const updateProfile = useUpdateProfile();
  const uploadUserLogo = useUploadUserLogo();
  const deleteUserLogo = useDeleteUserLogo();
  const uploadLocationLogo = useUploadLocationLogo();
  const deleteLocationLogo = useDeleteLocationLogo();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();
  const createShare = useCreateShare();
  const deleteShare = useDeleteShare();

  const userLogoInputRef = useRef<HTMLInputElement>(null);
  const locationLogoInputRef = useRef<HTMLInputElement>(null);
  const [targetLocationId, setTargetLocationId] = useState<number | null>(null);

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [newLocationName, setNewLocationName] = useState('');
  const [editingLocation, setEditingLocation] = useState<{ id: number; name: string } | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [showExport, setShowExport] = useState(false);

  const handleUserLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadUserLogo.mutate(file, {
      onSuccess: () => addToast('success', 'Bunker logo updated'),
      onError: () => addToast('error', 'Failed to upload logo'),
    });
    e.target.value = '';
  };

  const handleLocationLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetLocationId) return;
    uploadLocationLogo.mutate({ id: targetLocationId, file }, {
      onSuccess: () => addToast('success', 'Location logo updated'),
      onError: () => addToast('error', 'Failed to upload logo'),
    });
    e.target.value = '';
    setTargetLocationId(null);
  };

  const handleSaveProfile = () => {
    updateProfile.mutate(
      { display_name: displayName.trim() || null },
      {
        onSuccess: () => addToast('success', 'Profile updated'),
        onError: () => addToast('error', 'Failed to update profile'),
      }
    );
  };

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;
    createLocation.mutate(newLocationName.trim(), {
      onSuccess: () => {
        setNewLocationName('');
        addToast('success', 'Location added');
      },
      onError: (err: any) => addToast('error', err?.message || 'Failed to add location'),
    });
  };

  const handleSaveLocationName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation?.name.trim()) return;
    updateLocation.mutate(
      { id: editingLocation.id, name: editingLocation.name.trim() },
      {
        onSuccess: () => {
          setEditingLocation(null);
          addToast('success', 'Location renamed');
        },
        onError: (err: any) => addToast('error', err?.message || 'Failed to rename location'),
      }
    );
  };

  const handleDeleteLocation = (id: number, name: string) => {
    if (!confirm(`Delete location "${name}"?`)) return;
    deleteLocation.mutate(id, {
      onSuccess: () => addToast('success', `"${name}" deleted`),
      onError: (err: any) => addToast('error', err?.message || 'Failed to delete location'),
    });
  };

  const handleCreateShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;
    createShare.mutate(
      { email: shareEmail.trim() },
      {
        onSuccess: () => {
          setShareEmail('');
          addToast('success', 'Share invitation sent');
        },
        onError: () => addToast('error', 'Failed to create share'),
      }
    );
  };

  const handleDeleteShare = (id: number) => {
    if (!confirm('Remove this share?')) return;
    deleteShare.mutate(id, {
      onSuccess: () => addToast('success', 'Share removed'),
      onError: () => addToast('error', 'Failed to remove share'),
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Profile */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <button
                onClick={handleSaveProfile}
                disabled={updateProfile.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Bunker Logo */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Bunker Logo</h2>
        <p className="text-sm text-gray-500 mb-4">Used as a watermark on Print Bunker menus.</p>
        <input
          ref={userLogoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUserLogoChange}
        />
        <div className="flex items-center gap-4">
          {user?.logo_url ? (
            <img
              src={user.logo_url}
              alt="Bunker logo"
              className="w-20 h-20 object-contain rounded border border-gray-200 bg-gray-50"
            />
          ) : (
            <div className="w-20 h-20 rounded border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
              <span className="text-2xl text-gray-300">🖼</span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => userLogoInputRef.current?.click()}
              disabled={uploadUserLogo.isPending || deleteUserLogo.isPending}
              className="px-4 py-2 text-sm font-medium border border-amber-700 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
            >
              {uploadUserLogo.isPending ? 'Uploading…' : user?.logo_url ? 'Replace Logo' : 'Upload Logo'}
            </button>
            {user?.logo_url && (
              <button
                onClick={() => deleteUserLogo.mutate(undefined, {
                  onSuccess: () => addToast('success', 'Logo removed'),
                  onError: () => addToast('error', 'Failed to remove logo'),
                })}
                disabled={deleteUserLogo.isPending || uploadUserLogo.isPending}
                className="px-4 py-2 text-sm font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                {deleteUserLogo.isPending ? 'Removing…' : 'Remove Logo'}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Locations */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Storage Locations <HelpTip text="Named spots where you physically keep bottles (e.g., 'Bar Cart', 'Basement Rack'). Create locations here, then assign bottles to them from the bunker view." position="right" /></h2>
        {/* Hidden file input for location logos */}
        <input
          ref={locationLogoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLocationLogoChange}
        />
        <div className="space-y-2 mb-4">
          {locations.map((loc) => (
            <div key={loc.id} className="flex items-center py-2 border-b border-gray-100 last:border-0 gap-2">
              {/* Location logo thumbnail / upload button */}
              <button
                title={loc.logo_url ? 'Replace location logo' : 'Upload location logo'}
                onClick={() => {
                  setTargetLocationId(loc.id);
                  locationLogoInputRef.current?.click();
                }}
                disabled={uploadLocationLogo.isPending && targetLocationId === loc.id}
                className="flex-shrink-0 w-8 h-8 rounded border border-gray-200 overflow-hidden bg-gray-50 hover:border-amber-400 transition-colors disabled:opacity-50"
              >
                {loc.logo_url ? (
                  <img src={loc.logo_url} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-gray-300 text-xs">📷</span>
                )}
              </button>
              {loc.logo_url && (
                <button
                  title="Remove location logo"
                  onClick={() => deleteLocationLogo.mutate(loc.id, {
                    onSuccess: () => addToast('success', 'Logo removed'),
                    onError: () => addToast('error', 'Failed to remove logo'),
                  })}
                  disabled={deleteLocationLogo.isPending}
                  className="flex-shrink-0 text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                >
                  ✕
                </button>
              )}
              {editingLocation?.id === loc.id ? (
                <form onSubmit={handleSaveLocationName} className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editingLocation.name}
                    onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                    autoFocus
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={!editingLocation.name.trim() || updateLocation.isPending}
                    className="text-sm font-medium text-amber-700 hover:text-amber-800 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLocation(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <span className="text-sm text-gray-900 flex-1">{loc.name}</span>
                  <button
                    onClick={() => setEditingLocation({ id: loc.id, name: loc.name })}
                    className="text-sm text-amber-700 hover:text-amber-800"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleDeleteLocation(loc.id, loc.name)}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}
          {locations.length === 0 && (
            <p className="text-sm text-gray-400">No locations added yet.</p>
          )}
        </div>
        <form onSubmit={handleAddLocation} className="flex gap-2">
          <input
            type="text"
            value={newLocationName}
            onChange={(e) => setNewLocationName(e.target.value)}
            placeholder="New location name..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newLocationName.trim() || createLocation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </section>

      {/* Sharing */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sharing <HelpTip text="Give other users read-only access to your bunker. Enter their email address — they'll see your collection when they log in. You control which details are visible." position="right" /></h2>
        <div className="space-y-2 mb-4">
          {shares.map((share) => (
            <div key={share.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm text-gray-900">{share.shared_with_email}</p>
                <p className="text-xs text-gray-500 capitalize">{share.status}</p>
              </div>
              <button
                onClick={() => handleDeleteShare(share.id)}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
          {shares.length === 0 && (
            <p className="text-sm text-gray-400">Not sharing with anyone yet.</p>
          )}
        </div>
        <form onSubmit={handleCreateShare} className="flex gap-2">
          <input
            type="email"
            value={shareEmail}
            onChange={(e) => setShareEmail(e.target.value)}
            placeholder="Email address to share with..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!shareEmail.trim() || createShare.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Invite
          </button>
        </form>
      </section>

      {/* Export */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Export</h2>
        <p className="text-sm text-gray-600 mb-3">Download your collection data.</p>
        <button
          onClick={() => setShowExport(true)}
          className="px-4 py-2 text-sm font-medium border border-amber-700 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
        >
          Export Collection
        </button>
      </section>

      {/* Sign Out */}
      <section className="bg-white rounded-lg shadow p-6">
        <button
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
          className="text-sm font-medium text-red-600 hover:text-red-700"
        >
          Sign Out
        </button>
      </section>

      <ExportDialog open={showExport} onClose={() => setShowExport(false)} />
    </div>
  );
}
