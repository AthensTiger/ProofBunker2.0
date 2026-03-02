import { useState, useEffect } from 'react';
import { useAdminDistiller, useUpdateDistiller } from '../../hooks/useAdmin';
import { useUIStore } from '../../stores/uiStore';

interface DistillerEditModalProps {
  distillerId: number;
  onClose: () => void;
}

export default function DistillerEditModal({ distillerId, onClose }: DistillerEditModalProps) {
  const addToast = useUIStore((s) => s.addToast);
  const { data: distiller, isLoading } = useAdminDistiller(distillerId);
  const updateMutation = useUpdateDistiller();

  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [website, setWebsite] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [status, setStatus] = useState('');
  const [description, setDescription] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (!distiller) return;
    setName(distiller.name || '');
    setCountry(distiller.country || '');
    setRegion(distiller.region || '');
    setCity(distiller.city || '');
    setAddress(distiller.address || '');
    setLatitude(distiller.latitude != null ? String(distiller.latitude) : '');
    setLongitude(distiller.longitude != null ? String(distiller.longitude) : '');
    setWebsite(distiller.website || '');
    setFoundedYear(distiller.founded_year != null ? String(distiller.founded_year) : '');
    setStatus(distiller.status || '');
    setDescription(distiller.description || '');
    setIsVerified(distiller.is_verified || false);
  }, [distiller]);

  const handleSave = () => {
    updateMutation.mutate(
      {
        id: distillerId,
        name: name.trim(),
        country: country.trim() || null,
        region: region.trim() || null,
        city: city.trim() || null,
        address: address.trim() || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        website: website.trim() || null,
        founded_year: foundedYear ? parseInt(foundedYear) : null,
        status: status.trim() || null,
        description: description.trim() || null,
        is_verified: isVerified,
      } as any,
      {
        onSuccess: () => { addToast('success', 'Distiller updated'); onClose(); },
        onError: () => addToast('error', 'Failed to update distiller'),
      }
    );
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Edit Distiller</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-gray-500">Loading...</div>
        ) : (
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <input type="text" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="e.g., active" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Founded Year</label>
                <input type="number" value={foundedYear} onChange={(e) => setFoundedYear(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputCls} resize-y`} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} className="rounded border-gray-300 text-amber-700 focus:ring-amber-500" />
              Verified
            </label>
            {distiller && (
              <p className="text-xs text-gray-400">{distiller.product_count} product{distiller.product_count !== 1 ? 's' : ''} linked</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending || !name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
