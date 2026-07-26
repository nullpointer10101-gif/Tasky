import React, { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Search, Ban, CheckCircle, User, Edit2, Zap, Users as UsersIcon, Coins, History, X } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('balance');
  const [showEligible, setShowEligible] = useState(false); // 'balance' or 'newest'
  const [selectedUserForHistory, setSelectedUserForHistory] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  const handleViewHistory = async (user) => {
    setSelectedUserForHistory(user);
    setLoadingHistory(true);
    setUserHistory([]);
    try {
      const res = await api.get(`/users/${user.telegram_id}/history`);
      setUserHistory(res.data);
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  };


  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (u.telegram_id && u.telegram_id.toString().includes(searchTerm));
    const matchesEligible = showEligible ? Number(u.balance || 0) >= 3000 : true;
    return matchesSearch && matchesEligible;
  });

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
        
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-ink-soft hover:text-ink transition-colors">
            <input 
              type="checkbox" 
              checked={showEligible}
              onChange={(e) => setShowEligible(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-surface-soft text-indigo-500 focus:ring-indigo-500"
            />
            Eligible for Withdrawal (≥ 3000 TASKY)
          </label>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-surface border border-border rounded-full px-4 py-3 text-sm text-ink focus:border-indigo-500 outline-none"
          >
            <option value="balance">Sort by: Highest Balance</option>
            <option value="newest">Sort by: Newest Joined</option>
          </select>
        </div>
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
                <div key={user.telegram_id} className="bg-surface-soft rounded-3xl border border-border p-4 flex flex-col gap-4 shadow-sm relative overflow-hidden">
                  
                  {/* Header row: Avatar + Info + Balance */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 overflow-hidden cursor-pointer hover:opacity-80" onClick={() => handleViewHistory(user)}>
                      <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-500/20">
                        <User size={20} />
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-ink text-base truncate">{user.first_name || 'No Name'}</p>
                        <p className="text-xs text-ink-soft truncate">@{user.username || user.telegram_id}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] uppercase tracking-wider text-ink-soft font-bold mb-1">Balance</p>
                      <p className="font-black text-emerald-400 text-sm bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                        {Number(user.balance).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="bg-surface rounded-2xl border border-border p-3 flex justify-between items-center text-xs">
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-ink-soft mb-1 text-[10px] uppercase font-bold tracking-wider">Joined</span>
                      <span className="font-bold text-ink">{formatDate(user.created_at).split(',')[0]}</span>
                    </div>
                    <div className="w-px h-6 bg-border"></div>
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-ink-soft mb-1 text-[10px] uppercase font-bold tracking-wider">Spins</span>
                      <span className="font-bold text-ink">{user.spins_available || 0}</span>
                    </div>
                    <div className="w-px h-6 bg-border"></div>
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-ink-soft mb-1 text-[10px] uppercase font-bold tracking-wider">Refs</span>
                      <span className="font-bold text-ink">{user.total_referrals}</span>
                    </div>
                    <div className="w-px h-6 bg-border"></div>
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-ink-soft mb-1 text-[10px] uppercase font-bold tracking-wider">Ads</span>
                      <span className={`font-bold ${user.withdrawal_ads_watched >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {user.withdrawal_ads_watched || 0}/50
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                      <button onClick={() => handleViewHistory(user)} className="flex-1 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl font-bold text-xs flex justify-center items-center gap-1.5 transition-colors">
                        <History size={14} /> History
                      </button>
                      <button onClick={() => handleAddSpins(user)} className="flex-1 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl font-bold text-xs flex justify-center items-center gap-1.5 transition-colors">
                        <Zap size={14} /> Spins
                      </button>
                      <button onClick={() => handleEditBalance(user)} className="flex-1 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl font-bold text-xs flex justify-center items-center gap-1.5 transition-colors">
                        <Edit2 size={14} /> Balance
                      </button>
                      <button onClick={() => handleToggleBan(user)} className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex justify-center items-center gap-1.5 transition-colors ${user.is_banned ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400' : 'bg-red-500/10 hover:bg-red-500/20 text-red-500'}`}>
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
                    <th className="p-4 text-sm font-bold text-ink-soft">Ads Watched</th>
                    <th className="p-4 text-sm font-bold text-ink-soft">Joined</th>
                    <th className="p-4 text-sm font-bold text-ink-soft text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-ink-soft">No users found.</td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.telegram_id} className="border-b border-border hover:bg-surface/50 transition-colors">
                        <td className="p-4 cursor-pointer hover:bg-surface-soft transition-colors" onClick={() => handleViewHistory(user)}>
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
                        <td className="p-4 text-sm text-ink-soft font-bold">
                          {user.valid_referrals || 0} / {user.total_referrals}
                        </td>
                        <td className="p-4 text-sm font-bold">
                          <span className={user.withdrawal_ads_watched >= 50 ? 'text-emerald-400' : 'text-red-400'}>
                            {user.withdrawal_ads_watched || 0} / 50
                          </span>
                        </td>
                        <td className="p-4 text-sm text-ink-soft">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleViewHistory(user)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl text-xs font-bold transition-colors">
                              <History size={14} /> History
                            </button>
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

      {/* History Modal */}
      {selectedUserForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-border flex justify-between items-center bg-surface-soft">
              <div>
                <h3 className="font-black text-ink text-lg">Reward History</h3>
                <p className="text-ink-soft text-sm">@{selectedUserForHistory.username || selectedUserForHistory.telegram_id}</p>
              </div>
              <button 
                onClick={() => setSelectedUserForHistory(null)}
                className="w-8 h-8 flex items-center justify-center bg-surface hover:bg-border rounded-full text-ink transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1">
              {loadingHistory ? (
                <div className="flex justify-center p-8">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : userHistory.length === 0 ? (
                <div className="text-center p-8 text-ink-soft">
                  <History size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No rewards found for this user.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userHistory.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-surface-soft border border-border hover:border-indigo-500/30 transition-colors">
                      <div>
                        <p className="font-bold text-ink text-sm">{item.title}</p>
                        <p className="text-xs text-ink-soft mt-0.5">{formatDate(item.completed_at)}</p>
                      </div>
                      <div className="font-black text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                        +{Number(item.reward).toLocaleString()} TASKY
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
