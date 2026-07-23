import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Login({ setAuth }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      localStorage.setItem('tasky_admin_password', password);
      // Make a test request to verify the password
      await api.get('/stats');
      setAuth(true);
      toast.success('Vault Unlocked');
      navigate('/');
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('tasky_admin_password');
        toast.error('Invalid Master Password');
      } else {
        toast.error(error.response?.data?.error || 'Server/Database connection error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/30 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-3xl font-black text-ink tracking-tight">Tasky Admin</h1>
          <p className="text-ink-soft text-sm mt-3 font-medium">Secure infrastructure control panel</p>
        </div>

        <form onSubmit={handleLogin} className="bg-surface-soft p-8 rounded-[2rem] border border-border/80 shadow-2xl shadow-black/40 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none transition-opacity group-hover:bg-indigo-500/20"></div>

          <div className="space-y-6 relative z-10">
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-2 uppercase tracking-wider pl-1">Master Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-ink-faint">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl pl-11 pr-4 py-4 text-ink focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono tracking-widest text-lg shadow-inner"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-black py-4 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 disabled:opacity-70 group/btn mt-2"
            >
              {loading ? (
                <div className="flex items-center gap-2 animate-pulse">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Verifying...
                </div>
              ) : (
                <>
                  Unlock Vault
                  <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
        
        <p className="text-center text-ink-faint text-[10px] uppercase font-bold tracking-widest mt-8">
          Restricted Access Only
        </p>
      </div>
    </div>
  );
}
