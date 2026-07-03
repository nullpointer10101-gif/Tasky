import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, ArrowDownToLine, Settings, PlusSquare, LogOut, ShieldAlert, Users, Send, Server } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

export default function Layout({ setAuth }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('tasky_admin_password');
    setAuth(false);
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/users', label: 'Users', icon: Users },
    { path: '/reviews', label: 'Task Reviews', icon: CheckSquare },
    { path: '/withdrawals', label: 'Withdrawals', icon: ArrowDownToLine },
    { path: '/tasks', label: 'Manage Tasks', icon: PlusSquare },
    { path: '/settings', label: 'Dynamic Settings', icon: Settings },
    { path: '/broadcast', label: 'Broadcast', icon: Send },
    { path: '/machines', label: 'Machines', icon: Server },
    { path: '/system-settings', label: 'System Settings', icon: Server },
  ];

  return (
    <div className="flex h-screen bg-surface">
      
      {/* Sidebar */}
      <div className="w-64 bg-surface-soft border-r border-border flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black text-ink leading-tight">Tasky</h1>
            <p className="text-[10px] text-ink-faint uppercase font-bold tracking-widest">Admin Control</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto hide-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-bold " + (
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    : 'text-ink-soft hover:bg-white/5 hover:text-ink'
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            Lock Vault
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar relative">
        <Outlet />
      </div>
    </div>
  );
}
