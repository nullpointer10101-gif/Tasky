import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveActivity from './pages/LiveActivity';
import Ads from './pages/Ads';
import DynamicSettings from './pages/DynamicSettings';
import TaskManagement from './pages/TaskManagement';
import TaskReviews from './pages/TaskReviews';
import Withdrawals from './pages/Withdrawals';
import GramClaims from './pages/GramClaims';
import GramWatchers from './pages/GramWatchers';
import GramWithdrawals from './pages/GramWithdrawals';
import Users from './pages/Users';
import Broadcast from './pages/Broadcast';
import Settings from './pages/Settings';
import Machines from './pages/Machines';
import SpecialOffers from './pages/SpecialOffers';
import PromoCodes from './pages/PromoCodes';
import NftHolders from './pages/NftHolders';
import GramDeposits from './pages/GramDeposits';
import api from './api';
import { Toaster } from 'react-hot-toast';

function App() {
  const [auth, setAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const savedPass = localStorage.getItem('tasky_admin_password');
      if (!savedPass) {
        setLoading(false);
        return;
      }
      try {
        await api.get('/stats');
        setAuth(true);
      } catch (err) {
        localStorage.removeItem('tasky_admin_password');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) {
    return <div className="h-screen bg-surface flex items-center justify-center text-ink">Loading Vault...</div>;
  }

  return (
    <BrowserRouter basename="/admin">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      <Routes>
        <Route path="/login" element={!auth ? <Login setAuth={setAuth} /> : <Navigate to="/" />} />
        
        {auth ? (
          <Route path="/" element={<Layout setAuth={setAuth} />}>
            <Route index element={<Dashboard />} />
            <Route path="live-activity" element={<LiveActivity />} />
            <Route path="ads" element={<Ads />} />
            <Route path="settings" element={<DynamicSettings />} />
            <Route path="tasks" element={<TaskManagement />} />
            <Route path="reviews" element={<TaskReviews />} />
            <Route path="withdrawals" element={<Withdrawals />} />
            <Route path="gram-claims" element={<GramClaims />} />
            <Route path="gram-watchers" element={<GramWatchers />} />
            <Route path="gram-withdrawals" element={<GramWithdrawals />} />
            <Route path="nft-holders" element={<NftHolders />} />
            <Route path="gram-deposits" element={<GramDeposits />} />
            <Route path="users" element={<Users />} />
            <Route path="broadcast" element={<Broadcast />} />
            <Route path="machines" element={<Machines />} />
            <Route path="special-offers" element={<SpecialOffers />} />
            <Route path="promocodes" element={<PromoCodes />} />
            <Route path="system-settings" element={<Settings />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
