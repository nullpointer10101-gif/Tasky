import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, ArrowDownToLine, Settings, PlusSquare, LogOut, ShieldAlert, Users, Send, Server, Menu, X, PlaySquare, Gift, Coins, Tv } from 'lucide-react';

import { Toaster } from 'react-hot-toast';

export default function Layout({ setAuth }) {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('tasky_admin_password');
    setAuth(false);
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/users', label: 'Users', icon: Users },
    { path: '/ads', label: 'Ads Dashboard', icon: PlaySquare },
    { path: '/tasks', label: 'Manage Tasks', icon: PlusSquare },
    { path: '/reviews', label: 'Task Reviews', icon: CheckSquare },
    { path: '/withdrawals', label: 'Withdrawals', icon: ArrowDownToLine },
    { path: '/gram-claims', label: 'Gram Claims', icon: Coins },
    { path: '/gram-watchers', label: '📺 Gram Watchers', icon: Tv },
    { path: '/gram-withdrawals', label: '💎 GRAM Withdrawals', icon: Coins },
    { path: '/settings', label: 'Dynamic Settings', icon: Settings },
    { path: '/broadcast', label: 'Broadcast', icon: Send },
    { path: '/machines', label: 'Machines', icon: Server },
    { path: '/special-offers', label: '🎁 Special Offers', icon: Gift },
    { path: '/promocodes', label: 'Bounty Codes', icon: Gift },
    { path: '/system-settings', label: 'System Settings', icon: Server },
  ];

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-surface relative">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-surface-soft/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldAlert size={18} />
          </div>
          <h1 className="text-xl font-black text-ink tracking-tight">Tasky</h1>
        </div>
        <button onClick={toggleSidebar} className="text-ink-soft hover:text-ink p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`w-72 bg-surface-soft border-r border-border flex flex-col fixed inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-out shadow-2xl md:shadow-none`}>
        <div className="p-6 flex items-center justify-between border-b border-border/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-ink tracking-tight leading-tight">Tasky</h1>
              <p className="text-[10px] text-indigo-400 uppercase font-black tracking-widest">Admin Control</p>
            </div>
          </div>
          <button className="md:hidden text-ink-soft hover:text-ink p-2 rounded-xl hover:bg-white/5 transition-colors" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto hide-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 text-sm font-bold " + (
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/15 to-indigo-500/5 text-indigo-400 shadow-[inset_2px_0_0_0_#818cf8]'
                    : 'text-ink-soft hover:bg-surface hover:text-ink'
                )
              }
            >
              <item.icon size={18} className="shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border/50">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 px-4 py-3.5 w-full rounded-2xl text-sm font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-200"
          >
            <LogOut size={18} />
            Lock Vault
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar relative pt-16 md:pt-0 w-full bg-surface">
        <Outlet />
      </div>
    </div>
  );
}
