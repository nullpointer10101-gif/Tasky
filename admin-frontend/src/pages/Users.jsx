import React, { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Search, Ban, CheckCircle, User, Edit2, Zap, Users as UsersIcon, Coins } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('balance'); // 'balance' or 'newest'

  useEffect(() => {
    fetchUsers();
  }, [sortBy]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users?sortBy=' + sortBy);
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

  const totalBalance = users.reduce((acc, u) => acc + Number(u.balance || 0), 0);

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-ink mb-2">Users Directory</h1>
          <p className="text-ink-soft">Manage all registered Mini App users.</p>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-surface-soft border border-border rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <UsersIcon size={24} />
          </div>
          <div>
            <p className="text-sm text-ink-soft font-bold uppercase tracking-wider">Total Users</p>
            <p className="text-2xl font-black text-ink">{users.length}{users.length >= 1000 ? '+' : ''}</p>
          </div>
        </div>
        <div className="bg-surface-soft border border-border rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Coins size={24} />
          </div>
          <div>
            <p className="text-sm text-ink-soft font-bold uppercase tracking-wider">Total Balance</p>
            <p className="text-2xl font-black text-ink">{totalBalance.toLocaleString()} TASKY</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search username or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-border rounded-full pl-12 pr-4 py-3 text-sm text-ink focus:border-indigo-500"
          />
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
        </div>
        
        <select 
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-surface border border-border rounded-full px-4 py-3 text-sm text-ink focus:border-indigo-500 outline-none"
        >
          <option value="balance">Sort by: Highest Balance</option>
          <option value="newest">Sort by: Newest Joined</option>
        </select>
      </div>

      {loading ? (
        <div className="text-ink p-8 text-center animate-pulse font-bold">Loading users...</div>
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="md:hidden flex flex-col gap-4">
            {filteredUsers.length === 0 ? (
               <div className="p-8 text-center text-ink-soft bg-surface-soft rounded-3xl border border-border">No users found.</div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.telegram_id} className="bg-surface-soft rounded-3xl border border-border p-4 flex flex-col gap-4 relative overflow-hidden">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                      <User size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-ink text-lg truncate">{user.first_name || 'No Name'}</p>
                      <p className="text-sm text-ink-soft truncate">@{user.username || user.telegram_id}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-surface p-2 rounded-xl border border-border">
                      <p className="text-ink-soft text-xs mb-1">Balance</p>
                      <p className="font-bold text-emerald-400 truncate">{Number(user.balance).toLocaleString()} TASKY</p>
                    </div>
                    <div className="bg-surface p-2 rounded-xl border border-border">
                      <p className="text-ink-soft text-xs mb-1">Joined</p>
                      <p className="font-bold text-ink truncate">{formatDate(user.created_at)}</p>
                    </div>
                    <div className="bg-surface p-2 rounded-xl border border-border">
                      <p className="text-ink-soft text-xs mb-1">Spins</p>
                      <p className="font-bold text-ink">{user.spins_available || 0}</p>
                    </div>
                    <div className="bg-surface p-2 rounded-xl border border-border">
                      <p className="text-ink-soft text-xs mb-1">Refs</p>
                      <p className="font-bold text-ink">{user.total_referrals}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                     <button onClick={() => handleAddSpins(user)} className="flex-1 flex justify-center items-center gap-1 py-2 bg-amber-500/10 text-amber-500 rounded-xl font-bold text-sm">
                       <Zap size={14} /> Spins
                     </button>
                     <button onClick={() => handleEditBalance(user)} className="flex-1 flex justify-center items-center gap-1 py-2 bg-indigo-500/10 text-indigo-400 rounded-xl font-bold text-sm">
                       <Edit2 size={14} /> Edit
                     </button>
                     <button onClick={() => handleToggleBan(user)} className={`flex-1 flex justify-center items-center gap-1 py-2 rounded-xl font-bold text-sm ${user.is_banned ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
                       {user.is_banned ? <CheckCircle size={14}/> : <Ban size={14}/>} 
                       {user.is_banned ? 'Unban' : 'Ban'}
                     </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block bg-surface-soft rounded-3xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
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
                          {formatDate(user.created_at)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleAddSpins(user)} className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-xl text-xs font-bold transition-colors">
                              <Zap size={14} /> Add Spins
                            </button>
                            <button onClick={() => handleEditBalance(user)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-xs font-bold transition-colors">
                              <Edit2 size={14} /> Edit
                            </button>
                            <button onClick={() => handleToggleBan(user)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${user.is_banned ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}>
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
        </>
      )}
    </div>
  );
}
