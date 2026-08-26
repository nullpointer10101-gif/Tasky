import React, { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Search, Ban, CheckCircle, User, Zap, Users as UsersIcon, Coins, History, X, Wallet, MessageSquare, RefreshCw, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('balance');
  const [showEligible, setShowEligible] = useState(false);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // New state for the user management modal
  const [selectedManageUser, setSelectedManageUser] = useState(null);

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

  // --- Handlers ---
  const handleToggleBan = async (user) => {
    const newStatus = !user.is_banned;
    try {
      await api.post('/users/' + user.telegram_id + '/ban', { is_banned: newStatus });
      toast.success("User " + (newStatus ? 'Banned' : 'Unbanned') + " successfully");
      setUsers(users.map(u => u.telegram_id === user.telegram_id ? { ...u, is_banned: newStatus } : u));
      if (selectedManageUser?.telegram_id === user.telegram_id) {
        setSelectedManageUser(prev => ({ ...prev, is_banned: newStatus }));
      }
    } catch (error) {
      toast.error('Failed to update ban status');
    }
  };

  const handleEditBalance = async (user, action = 'edit') => {
    let promptText = `Enter new balance for ${user.username || user.telegram_id}:`;
    if (action === 'add') promptText = `How much TASKY to ADD for ${user.username || user.telegram_id}?`;
    if (action === 'deduct') promptText = `How much TASKY to DEDUCT from ${user.username || user.telegram_id}?`;

    const inputStr = window.prompt(promptText, action === 'edit' ? user.balance : '');
    if (inputStr === null || inputStr.trim() === '') return;

    const amount = Number(inputStr);
    if (isNaN(amount) || amount < 0) {
      return toast.error('Please enter a valid positive number');
    }

    let newBalance = Number(user.balance);
    if (action === 'edit') newBalance = amount;
    else if (action === 'add') newBalance += amount;
    else if (action === 'deduct') {
      if (amount > newBalance) return toast.error('Cannot deduct more than current balance');
      newBalance -= amount;
    }

    try {
      await api.post(`/users/${user.telegram_id}/balance`, { balance: newBalance });
      toast.success(`Balance updated successfully to ${newBalance}`);
      setUsers(users.map(u => u.telegram_id === user.telegram_id ? { ...u, balance: newBalance } : u));
      if (selectedManageUser?.telegram_id === user.telegram_id) {
        setSelectedManageUser(prev => ({ ...prev, balance: newBalance }));
      }
    } catch (error) {
      toast.error('Failed to update balance');
    }
  };

  const handleAddSpins = async (user) => {
    const spinsToAddStr = window.prompt(`How many spins to add for ${user.username || user.telegram_id}?`);
    if (spinsToAddStr === null || spinsToAddStr.trim() === '') return;
    
    const spinsToAdd = Number(spinsToAddStr);
    if (isNaN(spinsToAdd) || spinsToAdd <= 0) {
      return toast.error('Please enter a valid positive number');
    }

    try {
      await api.post(`/users/${user.telegram_id}/spins`, { spins_to_add: spinsToAdd });
      toast.success(`${spinsToAdd} spins added successfully`);
      const newSpins = (user.spins_available || 0) + spinsToAdd;
      setUsers(users.map(u => u.telegram_id === user.telegram_id ? { ...u, spins_available: newSpins } : u));
      if (selectedManageUser?.telegram_id === user.telegram_id) {
        setSelectedManageUser(prev => ({ ...prev, spins_available: newSpins }));
      }
    } catch (error) {
      toast.error('Failed to add spins');
    }
  };

  const handleEditGramWallet = async (user) => {
    const newAddress = window.prompt(`Enter new Gram wallet address for ${user.username || user.telegram_id} (leave empty to reset/clear):`, user.gram_wallet_address || '');
    if (newAddress === null) return; 

    try {
      await api.post(`/users/${user.telegram_id}/gram-wallet`, { gram_wallet_address: newAddress });
      toast.success('Gram wallet address updated successfully');
      const cleanAddr = newAddress.trim() || null;
      setUsers(users.map(u => u.telegram_id === user.telegram_id ? { ...u, gram_wallet_address: cleanAddr } : u));
      if (selectedManageUser?.telegram_id === user.telegram_id) {
        setSelectedManageUser(prev => ({ ...prev, gram_wallet_address: cleanAddr }));
      }
    } catch (error) {
      toast.error('Failed to update Gram wallet address');
    }
  };

  const handleEditTonWallet = async (user) => {
    const newAddress = window.prompt(`Enter new TON wallet address for ${user.username || user.telegram_id} (leave empty to reset/clear):`, user.wallet_address || '');
    if (newAddress === null) return; 

    try {
      await api.post(`/users/${user.telegram_id}/ton-wallet`, { ton_wallet_address: newAddress });
      toast.success('TON wallet address updated successfully');
      const cleanAddr = newAddress.trim() || null;
      setUsers(users.map(u => u.telegram_id === user.telegram_id ? { ...u, wallet_address: cleanAddr } : u));
      if (selectedManageUser?.telegram_id === user.telegram_id) {
        setSelectedManageUser(prev => ({ ...prev, wallet_address: cleanAddr }));
      }
    } catch (error) {
      toast.error('Failed to update TON wallet address');
    }
  };

  const handleResetAds = async (user) => {
    if (!window.confirm(`Are you sure you want to reset the Ads Progress for ${user.username || user.telegram_id} to 0?`)) return;
    try {
      await api.post(`/users/${user.telegram_id}/reset-ads`);
      toast.success('Ads progress reset successfully');
      setUsers(users.map(u => u.telegram_id === user.telegram_id ? { ...u, withdrawal_ads_watched: 0 } : u));
      if (selectedManageUser?.telegram_id === user.telegram_id) {
        setSelectedManageUser(prev => ({ ...prev, withdrawal_ads_watched: 0 }));
      }
    } catch (error) {
      toast.error('Failed to reset ads progress');
    }
  };

  const handleBroadcast = async (user) => {
    const message = window.prompt(`Enter message to broadcast directly to ${user.username || user.telegram_id}:\n(HTML is supported)`);
    if (message === null || message.trim() === '') return;
    try {
      await api.post(`/users/${user.telegram_id}/broadcast`, { message });
      toast.success('Message sent successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send message');
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

  // --- Filtering & Sorting ---
  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (u.telegram_id && u.telegram_id.toString().includes(searchTerm));
    const matchesEligible = showEligible ? Number(u.balance || 0) >= 3000 : true;
    return matchesSearch && matchesEligible;
  }).sort((a, b) => {
    if (sortBy === 'balance') return Number(b.balance || 0) - Number(a.balance || 0);
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'ads') return Number(b.withdrawal_ads_watched || 0) - Number(a.withdrawal_ads_watched || 0);
    return 0;
  });

  const totalBalance = users.reduce((acc, u) => acc + Number(u.balance || 0), 0);
  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-4 md:p-8 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-ink mb-2">Users Directory</h1>
          <p className="text-ink-soft">Manage all registered Mini App users in one clean view.</p>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
        <div className="bg-surface-soft border border-border rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <span className="font-bold text-lg">TV</span>
          </div>
          <div>
            <p className="text-sm text-ink-soft font-bold uppercase tracking-wider">Ads Watched</p>
            <p className="text-2xl font-black text-ink">
              {users.reduce((acc, u) => acc + Number(u.total_ads_watched || 0), 0).toLocaleString()}
            </p>
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
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-ink-soft hover:text-ink transition-colors w-full sm:w-auto justify-center sm:justify-start">
            <input 
              type="checkbox" 
              checked={showEligible}
              onChange={(e) => setShowEligible(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-surface-soft text-indigo-500 focus:ring-indigo-500"
            />
            Eligible (≥ 3000 TASKY)
          </label>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full sm:w-auto bg-surface border border-border rounded-full px-4 py-3 text-sm text-ink focus:border-indigo-500 outline-none"
          >
            <option value="balance">Sort by: Highest Balance</option>
            <option value="ads">Sort by: Highest Ads Watched</option>
            <option value="newest">Sort by: Newest Joined</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-ink p-8 text-center animate-pulse font-bold">Loading users...</div>
      ) : (
        <div className="bg-surface-soft border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="p-4 text-xs font-bold text-ink-soft uppercase tracking-wider">User</th>
                  <th className="p-4 text-xs font-bold text-ink-soft uppercase tracking-wider">Balance</th>
                  <th className="p-4 text-xs font-bold text-ink-soft uppercase tracking-wider">Ads Progress</th>
                  <th className="p-4 text-xs font-bold text-ink-soft uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-ink-soft uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-ink-soft">No users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.telegram_id} className="border-b border-border hover:bg-surface/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                            <User size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-ink text-sm">{user.first_name || 'No Name'}</p>
                            <p className="text-xs text-ink-soft">@{user.username || user.telegram_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg text-sm border border-emerald-500/20">
                          {Number(user.balance || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm font-bold">
                          <span className={user.withdrawal_ads_watched >= 1000 ? 'text-emerald-400' : 'text-red-400'}>
                            {user.withdrawal_ads_watched || 0}
                          </span>
                          <span className="text-ink-soft">/ 1000</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {user.is_banned ? (
                           <span className="text-xs font-bold px-2 py-1 bg-red-500/10 text-red-500 rounded-md border border-red-500/20 flex items-center gap-1 w-fit">
                             <Ban size={12}/> Banned
                           </span>
                        ) : (
                           <span className="text-xs font-bold px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20 flex items-center gap-1 w-fit">
                             <CheckCircle size={12}/> Active
                           </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedManageUser(user)}
                          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs transition-colors shadow-sm shadow-indigo-500/20"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MANAGE USER MODAL */}
      {selectedManageUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-border p-4 md:p-6 flex justify-between items-center z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-ink">{selectedManageUser.first_name || 'No Name'}</h2>
                  <p className="text-sm text-ink-soft font-mono">@{selectedManageUser.username} | ID: {selectedManageUser.telegram_id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedManageUser(null)}
                className="w-10 h-10 bg-surface-soft hover:bg-border text-ink rounded-full flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 md:p-6 space-y-6">
              
              {/* Profile Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface-soft border border-border p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase font-bold text-ink-soft tracking-wider mb-1">Balance</span>
                  <span className="text-lg font-black text-emerald-400">{Number(selectedManageUser.balance || 0).toLocaleString()}</span>
                </div>
                <div className="bg-surface-soft border border-border p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase font-bold text-ink-soft tracking-wider mb-1">Ads (Total/Prog)</span>
                  <span className="text-lg font-black text-ink">{selectedManageUser.total_ads_watched || 0} <span className="text-ink-soft text-sm">/ {selectedManageUser.withdrawal_ads_watched || 0}</span></span>
                </div>
                <div className="bg-surface-soft border border-border p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase font-bold text-ink-soft tracking-wider mb-1">Spins</span>
                  <span className="text-lg font-black text-amber-500">{selectedManageUser.spins_available || 0}</span>
                </div>
                <div className="bg-surface-soft border border-border p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase font-bold text-ink-soft tracking-wider mb-1">Joined</span>
                  <span className="text-sm font-bold text-ink">{formatDate(selectedManageUser.created_at).split(',')[0]}</span>
                </div>
              </div>

              {/* Wallets */}
              <div className="bg-surface-soft border border-border rounded-2xl overflow-hidden">
                <div className="p-3 bg-surface border-b border-border">
                  <span className="text-xs font-bold text-ink-soft uppercase tracking-wider px-1">Connected Wallets</span>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center bg-surface border border-border p-3 rounded-xl">
                    <div className="flex items-center gap-3 truncate pr-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0"><Wallet size={16}/></div>
                      <div className="truncate">
                        <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wider mb-0.5">TON Wallet</p>
                        <p className="text-sm font-mono text-ink truncate">{selectedManageUser.wallet_address || 'Not Connected'}</p>
                      </div>
                    </div>
                    <button onClick={() => handleEditTonWallet(selectedManageUser)} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 whitespace-nowrap">Edit</button>
                  </div>
                  <div className="flex justify-between items-center bg-surface border border-border p-3 rounded-xl">
                    <div className="flex items-center gap-3 truncate pr-4">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0"><Wallet size={16}/></div>
                      <div className="truncate">
                        <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wider mb-0.5">Gram Wallet</p>
                        <p className="text-sm font-mono text-ink truncate">{selectedManageUser.gram_wallet_address || 'Not Connected'}</p>
                      </div>
                    </div>
                    <button onClick={() => handleEditGramWallet(selectedManageUser)} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 whitespace-nowrap">Edit</button>
                  </div>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <button onClick={() => handleEditBalance(selectedManageUser, 'add')} className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors">
                  <ArrowUpRight size={20} />
                  <span className="text-xs font-bold">Add Balance</span>
                </button>
                <button onClick={() => handleEditBalance(selectedManageUser, 'deduct')} className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors">
                  <ArrowDownRight size={20} />
                  <span className="text-xs font-bold">Deduct Balance</span>
                </button>
                <button onClick={() => handleAddSpins(selectedManageUser)} className="p-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors">
                  <Zap size={20} />
                  <span className="text-xs font-bold">Add Spins</span>
                </button>
                <button onClick={() => handleBroadcast(selectedManageUser)} className="p-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors">
                  <MessageSquare size={20} />
                  <span className="text-xs font-bold">Direct Message</span>
                </button>
                <button onClick={() => handleResetAds(selectedManageUser)} className="p-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/20 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors">
                  <RefreshCw size={20} />
                  <span className="text-xs font-bold">Reset Ads</span>
                </button>
                <button onClick={() => handleViewHistory(selectedManageUser)} className="p-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors">
                  <History size={20} />
                  <span className="text-xs font-bold">View History</span>
                </button>
                <button onClick={() => handleToggleBan(selectedManageUser)} className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-2 transition-colors col-span-2 md:col-span-3 ${selectedManageUser.is_banned ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20'}`}>
                  {selectedManageUser.is_banned ? <CheckCircle size={20}/> : <Ban size={20}/>}
                  <span className="text-xs font-bold">{selectedManageUser.is_banned ? 'Unban User' : 'Ban User'}</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* USER HISTORY MODAL (Kept existing but styled minimally) */}
      {selectedUserForHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-border shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface-soft/50 rounded-t-3xl">
              <div>
                <h2 className="text-xl font-black text-ink">Task History</h2>
                <p className="text-sm text-ink-soft">Showing latest 200 tasks for @{selectedUserForHistory.username || selectedUserForHistory.telegram_id}</p>
              </div>
              <button onClick={() => setSelectedUserForHistory(null)} className="p-2 bg-surface hover:bg-border text-ink rounded-full transition-colors border border-border">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {loadingHistory ? (
                <div className="text-center text-ink-soft animate-pulse font-bold p-8">Loading history...</div>
              ) : userHistory.length === 0 ? (
                <div className="text-center text-ink-soft p-8 bg-surface-soft rounded-2xl border border-border">No task history found.</div>
              ) : (
                <div className="space-y-3">
                  {userHistory.map((task, idx) => (
                    <div key={idx} className="bg-surface-soft border border-border rounded-2xl p-4 flex justify-between items-center hover:border-indigo-500/30 transition-colors">
                      <div>
                        <p className="font-bold text-ink text-sm mb-1">{task.title}</p>
                        <p className="text-xs text-ink-soft font-mono">{formatDate(task.completed_at)}</p>
                      </div>
                      <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-sm font-black whitespace-nowrap">
                        +{task.reward} TASKY
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
