import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, LogOut } from 'lucide-react';

const primary = '#7B2335';
const text = '#1B2340';
const sidebarBg = '#F3F4F8';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Settings,        label: 'Settings',   path: '/settings' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  function isActive(path) {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }

  return (
    <div
      className="w-60 flex-shrink-0 flex flex-col h-full border-r border-gray-200"
      style={{ backgroundColor: sidebarBg }}
    >
      {/* Logo */}
      <div className="px-5 h-20 flex items-center border-b border-gray-200">
        <img src="/logos-logo.png" alt="LOGOS University College" className="h-11 object-contain" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
          const active = isActive(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                active ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200/60'
              }`}
              style={active ? { backgroundColor: primary } : {}}
            >
              <Icon size={18} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Admin user */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200/60 cursor-pointer transition-colors">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
            style={{ backgroundColor: primary }}
          >
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: text }}>Admin User</p>
            <p className="text-xs text-gray-500 truncate">admin@logos.edu</p>
          </div>
          <LogOut size={15} className="text-gray-400 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}
