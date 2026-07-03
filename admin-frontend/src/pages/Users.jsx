import React, { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Search, Ban, CheckCircle, User, Edit2, Zap } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBan = async (user) => {
    const newStatus = !user.is_banned;
    try {
      await api.post('/users/' + user.telegram_id + '/ban', { is_banned: newStatus });
      toast.success("User " + (newStatus ? 'Banned' : 'Unbanned') + " successfully");
      setUsers(users.map(u => u.telegram_id === user.telegram_id ? { ...u, is_banned: newStatus } : u));
    } catch (error) {
      toast.error('Failed to update ban status');
    }
  };

  const handleEditBalance = async (user) => {
    const newBalanceStr = window.prompt(`Enter new balance for ${user.username || user.telegram_id}:`, user.balance);
    if (newBalanceStr === null) return; // cancelled
    
    const newBalance = Number(newBalanceStr);
    if (isNaN(newBalance) || newBalance < 0) {
      return toast.error('Please enter a valid positive number');
    }

    try {
      await api.post(`/users/${user.telegram_id}/balance`, { balance: newBalance });
      toast.success('Balance updated successfully');
      setUsers(users.map(u => u.telegram_id === user.telegram_id ? { ...u, balance: newBalance } : u));
    } catch (error) {
      toast.error('Failed to update balance');
    }
  };

  const handleAddSpins = async (user) => {
    const spinsToAddStr = window.prompt(`How many spins to add for ${user.username || user.telegram_id}?`);
    if (spinsToAddStr === null) return; // cancelled
    
    const spinsToAdd = Number(spinsToAddStr);
    if (isNaN(spinsToAdd) || spinsToAdd <= 0) {
      return toast.error('Please enter a valid positive number');
    }

    try {
      await api.post(`/users/${user.telegram_id}/spins`, { spins_to_add: spinsToAdd });
      toast.success(`${spinsToAdd} spins added successfully`);
      setUsers(users.map(u => u.telegram_id === user.telegram_id ? { ...u, spins_available: (u.spins_available || 0) + spinsToAdd } : u));
    } catch (error) {
      toast.error('Failed to add spins');
    }
  };

  const filteredUsers = users.filter(u => 
    (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.telegram_id && u.telegram_id.toString().includes(searchTerm))
  );

  if (loading) return <div className="text-white p-8">Loading users...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-ink mb-2">Users Directory</h1>
          <p className="text-ink-soft">Manage all registered Mini App users.</p>
        </div>
        
        <div className="relative w-72">
          <input
            type="text"
            placeholder="Search username or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-border rounded-full pl-12 pr-4 py-3 text-sm text-ink focus:border-indigo-500"
          />
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
        </div>
      </div>

      <div className="bg-surface-soft rounded-3xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="p-4 text-sm font-bold text-ink-soft">User</th>
                <th className="p-4 text-sm font-bold text-ink-soft">Telegram ID</th>
                <th className="p-4 text-sm font-bold text-ink-soft">Balance</th>
                <th className="p-4 text-sm font-bold text-ink-soft">Spins</th>
                <th className="p-4 text-sm font-bold text-ink-soft">Referrals</th>
                <th className="p-4 text-sm font-bold text-ink-soft">Joined</th>
                <th className="p-4 text-sm font-bold text-ink-soft text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-ink-soft">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.telegram_id} className="border-b border-border hover:bg-surface/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-ink">{user.first_name || 'No Name'}</p>
                          <p className="text-xs text-ink-soft">@{user.username || 'unknown'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-sm text-ink-soft">{user.telegram_id}</td>
                    <td className="p-4">
                      <span className="font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full text-sm">
                        {Number(user.balance).toLocaleString()} TASKY
                      </span>
                    </td>
                    <td className="p-4 text-sm text-ink-soft font-bold">
                      {user.spins_available || 0}
                    </td>
                    <td className="p-4 text-sm text-ink-soft">{user.total_referrals}</td>
                    <td className="p-4 text-sm text-ink-soft">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAddSpins(user)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-xl text-xs font-bold transition-colors"
                          title="Add Spins"
                        >
                          <Zap size={14} /> Add Spins
                        </button>
                        <button
                          onClick={() => handleEditBalance(user)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-xs font-bold transition-colors"
                          title="Edit Balance"
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleToggleBan(user)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                            user.is_banned 
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                              : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                          }`}
                          title={user.is_banned ? 'Unban User' : 'Ban User'}
                        >
                          {user.is_banned ? <CheckCircle size={14} /> : <Ban size={14} />}
                          {user.is_banned ? 'Unban' : 'Ban'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
