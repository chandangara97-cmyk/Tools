import React, { useState, useEffect } from 'react';
import { MapPin, Compass, Briefcase, FileText, CheckCircle2, Layers, Smartphone, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface NavbarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenAndroidModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeView, setActiveView, onOpenAndroidModal }) => {
  const [shimlaTime, setShimlaTime] = useState<string>('--:--');
  const [greeting, setGreeting] = useState<string>('Welcome');
  const { isInstallable } = usePWAInstall();

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const timeStr = new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Kolkata',
        }).format(now);
        setShimlaTime(timeStr);

        const hour = parseInt(timeStr.slice(0, 2), 10);
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 17) setGreeting('Good afternoon');
        else setGreeting('Good evening');
      } catch (e) {
        const d = new Date();
        const fallback = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        setShimlaTime(fallback);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Unofficial Banner */}
      <div className="bg-[#0b1d28] text-[#9fc7c1] text-xs py-1.5 px-4 text-center border-b border-[#1b3d39] font-medium" role="note">
        <strong className="text-white">Unofficial.</strong> Independent field survey workspace for Himachal Pradesh. Not run by or affiliated with any government body.
      </div>

      {/* Main Top Header */}
      <header className="sticky top-0 z-40 bg-[#0e2827]/95 backdrop-blur-md border-b border-[#1b433e] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('hub')}
              className="flex items-center gap-3 text-left focus:outline-none group"
              title="Return to Scheme Hub 2026 Home"
            >
              <div className="w-9 h-9 rounded-xl bg-[#c8372a] shadow-md flex items-center justify-center font-bold text-white text-base transition-transform group-hover:scale-105">
                <svg width="22" height="22" viewBox="0 0 30 30" fill="none" aria-hidden="true">
                  <path d="M15 6 24 22H6z" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
                  <circle cx="15" cy="17" r="2.2" fill="#fff" />
                </svg>
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight block leading-tight text-white group-hover:text-[#f7dfae] transition-colors">
                  Scheme Hub 2026
                </span>
                <span className="text-[11px] text-[#9fc7c1] block tracking-wide">
                  HP Field Survey &amp; GIS Suite
                </span>
              </div>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="hidden lg:flex items-center gap-1.5" aria-label="Main Navigation">
            <button
              onClick={() => setActiveView('hub')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === 'hub'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-[#c5d8df] hover:text-white hover:bg-white/10'
              }`}
            >
              Hub Overview
            </button>

            <button
              onClick={() => setActiveView('gis-survey')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeView === 'gis-survey'
                  ? 'bg-[#0e8a7d] text-white shadow-md'
                  : 'text-[#20b5a6] bg-[#073631] hover:bg-[#094741] border border-[#1b5e56]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-[#f7dfae]" />
              Property Survey &amp; GIS
              <span className="bg-[#d6a34b] text-[#142238] font-bold text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider">
                AMRUT
              </span>
            </button>

            <button
              onClick={() => setActiveView('office-master')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeView === 'office-master'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-[#c5d8df] hover:text-white hover:bg-white/10'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-[#d6a34b]" />
              Office &amp; TA/DA Master
            </button>

            <button
              onClick={() => setActiveView('tools-directory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeView === 'tools-directory'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-[#c5d8df] hover:text-white hover:bg-white/10'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              All Tools (14)
            </button>
          </nav>

          {/* Action CTAs: Android App button + Clock */}
          <div className="flex items-center gap-2.5">
            {/* Prominent Android App Button */}
            <button
              onClick={onOpenAndroidModal}
              className="bg-gradient-to-r from-[#10b981] to-[#0e8a7d] hover:from-[#059669] hover:to-[#0d796e] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg flex items-center gap-1.5 transition-transform active:scale-95 border border-[#20b5a6]/40"
              title="Install or export Android App"
            >
              <Smartphone className="w-4 h-4 text-[#f7dfae]" />
              <span>Android App</span>
              {isInstallable && (
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              )}
            </button>

            {/* Shimla Clock */}
            <div className="hidden sm:flex flex-col items-end text-right pl-2 border-l border-[#1b433e]">
              <span className="text-[10.5px] text-[#9fc7c1] font-medium leading-none">
                {greeting}
              </span>
              <span className="text-xs font-bold tracking-wider font-mono text-white leading-tight">
                {shimlaTime}
              </span>
            </div>

            <button
              onClick={() => setActiveView(activeView === 'gis-survey' ? 'hub' : 'gis-survey')}
              className="bg-[#c8372a] hover:bg-[#b02f23] text-white text-xs font-bold px-3 py-2 rounded-lg shadow transition-transform active:scale-95 hidden sm:block"
            >
              {activeView === 'gis-survey' ? 'Exit GIS Tool' : 'Launch GIS Survey'}
            </button>
          </div>
        </div>

        {/* Mobile Submenu Bar */}
        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto px-4 py-2 border-t border-[#1b433e] bg-[#091e1d] text-xs">
          <button
            onClick={() => setActiveView('hub')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeView === 'hub' ? 'bg-white/20 text-white font-bold' : 'text-[#9fc7c1]'}`}
          >
            Hub
          </button>
          <button
            onClick={() => setActiveView('gis-survey')}
            className={`px-2.5 py-1 rounded whitespace-nowrap font-bold ${activeView === 'gis-survey' ? 'bg-[#0e8a7d] text-white' : 'text-[#27b3a3]'}`}
          >
            GIS Property &amp; AMRUT
          </button>
          <button
            onClick={() => setActiveView('office-master')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeView === 'office-master' ? 'bg-white/20 text-white font-bold' : 'text-[#9fc7c1]'}`}
          >
            Office &amp; TA/DA
          </button>
          <button
            onClick={() => setActiveView('tools-directory')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeView === 'tools-directory' ? 'bg-white/20 text-white font-bold' : 'text-[#9fc7c1]'}`}
          >
            All Tools (14)
          </button>
          <button
            onClick={onOpenAndroidModal}
            className="px-2.5 py-1 rounded whitespace-nowrap font-bold text-[#10b981] bg-[#10b981]/20 flex items-center gap-1"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Android App
          </button>
        </div>
      </header>
    </>
  );
};
