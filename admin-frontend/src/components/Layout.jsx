import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, ArrowDownToLine, Settings, PlusSquare, LogOut, ShieldAlert, Users, Send, Server, Menu, X } from 'lucide-react';
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
    { path: '/reviews', label: 'Task Reviews', icon: CheckSquare },
    { path: '/withdrawals', label: 'Withdrawals', icon: ArrowDownToLine },
    { path: '/tasks', label: 'Manage Tasks', icon: PlusSquare },
    { path: '/settings', label: 'Dynamic Settings', icon: Settings },
    { path: '/broadcast', label: 'Broadcast', icon: Send },
    { path: '/machines', label: 'Machines', icon: Server },
    { path: '/system-settings', label: 'System Settings', icon: Server },
  ];

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-surface relative">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-surface-soft border-b border-border flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
          <h1 className="text-lg font-black text-ink leading-tight">Tasky</h1>
        </div>
        <button onClick={toggleSidebar} className="text-ink-soft p-2 bg-white/5 rounded-lg">
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`w-64 bg-surface-soft border-r border-border flex flex-col fixed inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-200 ease-in-out`}>
        <div className="p-6 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-ink leading-tight">Tasky</h1>
              <p className="text-[10px] text-ink-faint uppercase font-bold tracking-widest">Admin Control</p>
            </div>
          </div>
          <button className="md:hidden text-ink-soft" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto hide-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
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
      <div className="flex-1 overflow-y-auto hide-scrollbar relative pt-16 md:pt-0 w-full">
        <Outlet />
      </div>
    </div>
  );
}
