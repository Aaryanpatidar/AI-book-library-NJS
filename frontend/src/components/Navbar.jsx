
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Upload, LayoutDashboard, LogOut, ChevronDown, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Library', icon: LayoutDashboard },
    { to: '/upload', label: 'Upload', icon: Upload },
  ];

  return (
    <header className="sticky top-0 z-50 bg-ink-900/80 backdrop-blur-md border-b border-ink-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:bg-amber-400 transition-colors">
              <BookOpen className="w-4.5 h-4.5 text-ink-950" size={18} />
            </div>
            <span className="font-serif font-bold text-lg text-parchment-100 hidden sm:block">
              AI<span className="text-amber-400"> Book</span> Library
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${active
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                      : 'text-parchment-200/60 hover:text-parchment-100 hover:bg-ink-700'
                    }`}
                >
                  <Icon size={15} />
                  <span className="hidden sm:block">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-ink-700 transition-colors group"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-ink-950 font-bold text-xs">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-sm text-parchment-200/70 group-hover:text-parchment-100 hidden sm:block max-w-[120px] truncate">
                {user?.name}
              </span>
              <ChevronDown
                size={14}
                className={`text-parchment-200/40 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-ink-800 border border-ink-600 rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-fade-in">
                {/* User info */}
                <div className="px-4 py-3 border-b border-ink-600">
                  <p className="text-sm font-medium text-parchment-100 truncate">{user?.name}</p>
                  <p className="text-xs text-parchment-200/40 truncate mt-0.5">{user?.email}</p>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <Link
                    to="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-parchment-200/70 hover:text-parchment-100 hover:bg-ink-700 transition-colors"
                  >
                    <User size={14} />
                    My Library
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-crimson-400 hover:bg-crimson-500/10 transition-colors"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
