import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
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
      toast.success('Access Granted');
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
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-black text-ink">Tasky Admin</h1>
          <p className="text-ink-soft text-sm mt-2">Enter the master password to access the control panel.</p>
        </div>

        <form onSubmit={handleLogin} className="bg-surface-soft p-6 rounded-3xl border border-border">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-ink-soft mb-2">Master Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Verifying...' : 'Unlock Vault'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
