import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../services/authService';
import { AuthUser, UserRole } from '../types/auth';
import { 
  LogOut, 
  ChevronDown, 
  User, 
  Check, 
  Stethoscope,
  Clock
} from 'lucide-react';

interface UserNavMenuProps {
  onOpenAuthModal: () => void;
  onOpenPatientDashboard?: () => void;
}

export const UserNavMenu: React.FC<UserNavMenuProps> = ({
  onOpenAuthModal,
  onOpenPatientDashboard
}) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(authService.getCurrentUser());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      setCurrentUser(authService.getCurrentUser());
    };
    const unsubscribe = authService.subscribe(update);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    setDropdownOpen(false);
  };

  const handleSwitchRole = (role: UserRole) => {
    authService.switchRole(role);
  };

  if (!currentUser) {
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenAuthModal}
          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-md shadow-blue-600/20 transition cursor-pointer"
        >
          <User className="w-3.5 h-3.5" />
          <span>Sign In / Register</span>
        </button>
      </div>
    );
  }

  const roleBadgeColor = {
    Doctor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Nurse: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    Patient: 'bg-slate-700/40 text-slate-300 border-slate-600/30'
  }[currentUser.role];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center space-x-2.5 p-1.5 pr-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
      >
        <img
          src={currentUser.avatarUrl}
          alt={currentUser.name}
          className="w-7 h-7 rounded-lg object-cover border border-slate-700"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name)}`;
          }}
        />
        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold text-white leading-tight flex items-center space-x-1.5">
            <span>{currentUser.name.split(',')[0]}</span>
            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${roleBadgeColor}`}>
              {currentUser.role}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Session Active</span>
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3 border-b border-slate-800">
            <div className="text-xs font-bold text-white">{currentUser.name}</div>
            <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
            <div className="mt-2 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">REST Auth:</span>
              <span className="text-sky-400 font-mono flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Bearer Token (JWT)</span>
              </span>
            </div>
          </div>

          {/* Quick Role Switcher for Testing */}
          <div className="p-2 border-b border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
              Switch Test Role:
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              {(['Doctor', 'Nurse', 'Admin', 'Patient'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleSwitchRole(r)}
                  className={`px-2 py-1 rounded-lg text-left flex items-center justify-between transition ${
                    currentUser.role === r
                      ? 'bg-blue-600/30 text-blue-300 font-bold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{r}</span>
                  {currentUser.role === r && <Check className="w-3 h-3 text-blue-400" />}
                </button>
              ))}
            </div>
          </div>

          <div className="p-1 space-y-0.5">
            {onOpenPatientDashboard && (
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenPatientDashboard();
                }}
                className="w-full px-3 py-2 text-xs text-blue-300 hover:text-white hover:bg-blue-900/30 rounded-xl flex items-center space-x-2 transition text-left cursor-pointer font-semibold"
              >
                <Clock className="w-4 h-4 text-blue-400" />
                <span>My Queue &amp; Wait Time</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="w-full px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl flex items-center space-x-2 transition text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
