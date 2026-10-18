import React from 'react';
import { Smartphone, Lock, LogOut, Wrench } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useAuth } from '../services/auth';

interface NavbarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenAndroidModal: () => void;
  /** Field tools and the admin page are only for the platform owner and ULB admins. */
  showTools: boolean;
  /** Cashier / general public: brand and Sign out only. */
  minimal?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeView, setActiveView, onOpenAndroidModal, showTools, minimal = false }) => {
  const { isInstallable } = usePWAInstall();
  const { signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[68px] flex items-center justify-between gap-3">
        <button onClick={() => setActiveView('gis-survey')} className="flex items-center gap-2.5 text-left focus:outline-none">
          <span className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center shadow-sm">
            <svg width="20" height="20" viewBox="0 0 30 30" fill="none" aria-hidden="true">
              <path d="M15 6 24 22H6z" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
              <circle cx="15" cy="17" r="2.2" fill="#fff" />
            </svg>
          </span>
          <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">Scheme Hub <span className="text-blue-700">2026</span><span className="block text-[10px] sm:text-[11px] font-semibold tracking-[.14em] uppercase text-slate-500">Municipal services workspace</span></span>
        </button>

        <div className="flex items-center gap-2">
          {showTools && (
            <>
              <button onClick={() => setActiveView(activeView === 'tools-directory' ? 'gis-survey' : 'tools-directory')}
                className="text-xs font-bold px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center gap-1.5">
                <Wrench className="w-4 h-4" /> Tools
              </button>
              <a href="admin_users.html" className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5">
                <Lock className="w-4 h-4" /> Admin
              </a>
            </>
          )}
          {!minimal && <button onClick={onOpenAndroidModal} className="text-emerald-800 bg-emerald-50 border border-emerald-100 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5" title="Install Android app">
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Android app</span>
            {isInstallable && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
          </button>}
          <button onClick={() => void signOut()} className="text-xs font-bold px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center gap-1.5">
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
