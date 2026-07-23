import React, { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Settings as SettingsIcon, AlertTriangle, ShieldCheck, Server } from 'lucide-react';

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

  if (loading) {
    return (
      <div className="p-4 md:p-10 h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse text-indigo-400">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
          <p className="font-bold text-ink tracking-widest uppercase text-sm">Loading System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 pb-20 max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-ink mb-2 tracking-tight">System Settings</h1>
        <p className="text-ink-soft text-sm md:text-base">Control global application behavior and platform infrastructure.</p>
      </div>

      <div className="bg-surface-soft border border-border/80 rounded-3xl p-6 md:p-8 shadow-xl shadow-black/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none transition-opacity group-hover:bg-red-500/10"></div>
        
        <div className="flex items-center gap-4 mb-8 border-b border-border/50 pb-6 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
            <Server size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-ink tracking-tight leading-tight">Danger Zone</h2>
            <p className="text-sm text-ink-faint">Critical system operations.</p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl border bg-[#0a0f1c] border-border/50 relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={maintenance ? "text-rose-500" : "text-amber-500"} size={22} />
              <h3 className="text-lg font-bold text-ink">Maintenance Mode</h3>
              {maintenance && <span className="ml-2 bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border border-rose-500/20 animate-pulse">Active</span>}
            </div>
            <p className="text-ink-soft text-sm leading-relaxed max-w-xl">
              When enabled, all users will be completely locked out of the Mini App and will see a "We'll be right back" message. The Admin Panel will remain fully functional.
            </p>
          </div>
          <div className="shrink-0">
            <button
              onClick={handleToggleMaintenance}
              className={`px-8 py-4 w-full md:w-auto rounded-2xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                maintenance 
                  ? 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-lg shadow-rose-500/25' 
                  : 'bg-surface border border-border text-ink hover:border-amber-500/50 hover:text-amber-400 shadow-sm'
              }`}
            >
              {maintenance ? (
                <>
                  <ShieldCheck size={18} />
                  DISABLE MAINTENANCE
                </>
              ) : (
                <>
                  <AlertTriangle size={18} />
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
