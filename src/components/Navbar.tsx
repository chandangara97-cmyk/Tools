import React from 'react';
import { Smartphone, Lock, LogOut, Wrench } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useAuth } from '../services/auth';

interface NavbarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenAndroidModal: () => void;
  showTools: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeView, setActiveView, onOpenAndroidModal, showTools }) => {
  const { isInstallable } = usePWAInstall();
  const { signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 text-white">
      <div className="h-[2px] bg-gradient-to-r from-transparent via-[#e8b84a]/70 to-transparent" />
      <div className="bg-[#080e1a]/85 backdrop-blur-2xl border-b border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[3.35rem] flex items-center justify-between gap-3">
          <button
            onClick={() => setActiveView('gis-survey')}
            className="flex items-center gap-3 text-left focus:outline-none group"
          >
            <span
              className="w-9 h-9 rounded-[11px] flex items-center justify-center border border-[#e8b84a]/30 shadow-[0_0_20px_rgba(232,184,74,0.12)] transition-all group-hover:border-[#e8b84a]/50 group-hover:shadow-[0_0_28px_rgba(232,184,74,0.2)]"
              style={{
                background: 'linear-gradient(145deg, rgba(232,184,74,0.22), rgba(232,184,74,0.04))',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 30 30" fill="none" aria-hidden="true">
                <path d="M15 6 24 22H6z" stroke="#f7df9a" strokeWidth="2.3" strokeLinejoin="round" />
                <circle cx="15" cy="17" r="2.1" fill="#f7df9a" />
              </svg>
            </span>
            <div className="leading-none">
              <span className="block text-[10px] font-semibold tracking-[0.16em] uppercase text-[#e8b84a]/80 mb-0.5">
                Scheme Hub
              </span>
              <span className="block text-[15px] font-semibold tracking-tight text-[#f0f3fa]">
                2026
              </span>
            </div>
          </button>

          <div className="flex items-center gap-1 sm:gap-1.5">
            {showTools && (
              <>
                <button
                  onClick={() =>
                    setActiveView(activeView === 'tools-directory' ? 'gis-survey' : 'tools-directory')
                  }
                  className={`text-[11.5px] font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-200 ${
                    activeView === 'tools-directory'
                      ? 'bg-[#e8b84a]/14 border border-[#e8b84a]/40 text-[#f7df9a] shadow-[0_0_16px_rgba(232,184,74,0.12)]'
                      : 'text-[#8b97b0] hover:text-[#eef2fb] hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Tools
                </button>
                <a
                  href="admin_users.html"
                  className="text-[11.5px] font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-200 bg-[#e8b84a]/10 hover:bg-[#e8b84a]/16 border border-[#e8b84a]/30 text-[#f7df9a]"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Admin
                </a>
              </>
            )}
            <button
              onClick={onOpenAndroidModal}
              className="text-[11.5px] font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-200 text-[#34d399] bg-[#34d399]/08 hover:bg-[#34d399]/14 border border-[#34d399]/20"
              title="Install Android app"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Android</span>
              {isInstallable && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] shadow-[0_0_6px_#34d399]" />
              )}
            </button>
            <button
              onClick={() => void signOut()}
              className="text-[11.5px] font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-200 text-[#7d8ba3] hover:text-[#f7df9a] hover:bg-white/[0.04] border border-transparent"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
