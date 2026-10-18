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
    <header className="sticky top-0 z-40 bg-[#141a36]/95 backdrop-blur-md border-b border-[#2a3464] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        <button onClick={() => setActiveView('gis-survey')} className="flex items-center gap-2.5 text-left focus:outline-none">
          <span className="w-8 h-8 rounded-lg bg-[#e5484d] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 30 30" fill="none" aria-hidden="true">
              <path d="M15 6 24 22H6z" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
              <circle cx="15" cy="17" r="2.2" fill="#fff" />
            </svg>
          </span>
          <span className="font-bold text-base tracking-tight">Scheme Hub 2026</span>
        </button>

        <div className="flex items-center gap-2">
          {showTools && (
            <>
              <button onClick={() => setActiveView(activeView === 'tools-directory' ? 'gis-survey' : 'tools-directory')}
                className="text-xs font-bold px-3 py-2 rounded-lg text-[#d6dcf5] hover:bg-white/10 flex items-center gap-1.5">
                <Wrench className="w-4 h-4" /> Tools
              </button>
              <a href="admin_users.html" className="bg-[#f2b233]/20 hover:bg-[#f2b233]/30 border border-[#f2b233]/50 text-[#ffe3a3] text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5">
                <Lock className="w-4 h-4" /> Admin
              </a>
            </>
          )}
          {!minimal && <button onClick={onOpenAndroidModal} className="text-[#10b981] bg-[#10b981]/15 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5" title="Install Android app">
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Android app</span>
            {isInstallable && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
          </button>}
          <button onClick={() => void signOut()} className="text-xs font-bold px-3 py-2 rounded-lg text-[#ffcf8a] hover:bg-white/10 flex items-center gap-1.5">
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
