import React, { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Settings as SettingsIcon, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function Settings() {
  const [maintenance, setMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaintenance();
  }, []);

  const fetchMaintenance = async () => {
    try {
      const res = await api.get('/system/maintenance');
      setMaintenance(res.data.active);
    } catch (e) {
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMaintenance = async () => {
    const newStatus = !maintenance;
    try {
      await api.post('/system/maintenance', { active: newStatus });
      setMaintenance(newStatus);
      toast.success(`Maintenance mode ${newStatus ? 'ENABLED' : 'DISABLED'}`);
    } catch (e) {
      toast.error('Failed to update maintenance mode');
    }
  };

  if (loading) return <div className="p-8 text-white">Loading settings...</div>;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-center gap-3">
        <SettingsIcon size={32} className="text-white" />
        <div>
          <h1 className="text-3xl font-black text-white">System Settings</h1>
          <p className="text-ink-soft">Control global application behavior</p>
        </div>
      </div>

      <div className="bg-surface-soft border border-border rounded-3xl p-6">
        <h2 className="text-xl font-bold text-white mb-6 border-b border-border pb-4">Danger Zone</h2>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl border bg-surface-dark border-border">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="text-warning" size={24} />
              <h3 className="text-lg font-bold text-white">Maintenance Mode</h3>
            </div>
            <p className="text-ink-soft text-sm leading-relaxed">
              When enabled, all users will be completely locked out of the Mini App and will see a "We'll be right back" message. The Admin Panel will remain fully functional.
            </p>
          </div>
          <div className="shrink-0">
            <button
              onClick={handleToggleMaintenance}
              className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                maintenance 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20' 
                  : 'bg-surface hover:bg-surface-soft border border-border text-white'
              }`}
            >
              {maintenance ? (
                <>
                  <AlertTriangle size={18} />
                  DISABLE MAINTENANCE
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  ENABLE MAINTENANCE
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
