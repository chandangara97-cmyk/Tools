import React from 'react';
import { Smartphone, Lock, LogOut, Wrench, Command, ChevronDown } from 'lucide-react';
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

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  onOpenAndroidModal,
  showTools,
  minimal = false,
}) => {
  const { isInstallable } = usePWAInstall();
  const { signOut, role, displayName } = useAuth();

  return (
    <header className="scheme-navbar sticky top-0 z-40 border-b text-slate-100">
      <div className="max-w-[1600px] mx-auto min-h-[72px] px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setActiveView('gis-survey')}
          className="flex items-center gap-3 text-left rounded-xl focus:outline-none shrink-0"
          aria-label="Go to Scheme Hub home"
        >
          <span className="hub-brand-mark w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0">
            <Command className="w-5 h-5" strokeWidth={2.4} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="hub-brand-name text-[15px] sm:text-base font-extrabold tracking-tight">
              Scheme Hub <span className="text-cyan-300">2026</span>
            </span>
            <span className="hub-brand-subtitle text-[10px] uppercase tracking-[.19em] mt-1">
              Civic operations platform
            </span>
          </span>
        </button>

        <nav aria-label="Main navigation" className="flex items-center justify-end gap-1.5 sm:gap-2 min-w-0">
          {showTools && (
            <>
              <button
                type="button"
                onClick={() => setActiveView(activeView === 'tools-directory' ? 'gis-survey' : 'tools-directory')}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold ${
                  activeView === 'tools-directory'
                    ? 'hub-nav-active border-blue-400/30'
                    : 'border-transparent text-slate-300 hover:text-white'
                }`}
                aria-current={activeView === 'tools-directory' ? 'page' : undefined}
              >
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Tools directory</span>
                <span className="sm:hidden">Tools</span>
              </button>
              <a
                href="admin_users.html"
                className="inline-flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2.5 text-xs font-bold text-amber-100 hover:border-amber-200/40"
              >
                <Lock className="w-4 h-4" />
                <span>Admin</span>
              </a>
            </>
          )}

          {!minimal && (
            <button
              type="button"
              onClick={onOpenAndroidModal}
              className="relative inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2.5 text-xs font-bold text-cyan-100 hover:border-cyan-200/40"
              title="Install Android app"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden md:inline">Install app</span>
              {isInstallable && <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />}
            </button>
          )}

          <div className="hidden lg:flex items-center gap-2 border-l border-white/10 pl-3 ml-1">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-teal-300 text-slate-950 text-xs font-black flex items-center justify-center">
              {(displayName || role || 'U').trim().slice(0, 1).toUpperCase()}
            </span>
            <span className="max-w-32 min-w-0">
              <span className="block text-xs font-bold text-slate-100 truncate">{displayName || 'Signed in user'}</span>
              <span className="block text-[10px] text-slate-400 capitalize truncate">{role || 'account'}</span>
            </span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-bold text-slate-300 hover:border-rose-300/30 hover:text-rose-100"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </nav>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
    </header>
  );
};
