/*
 * Copyright (c) 2026 Chandan Panwar. All rights reserved.
 * GIS Property Tax Survey & Billing System. Proprietary and confidential;
 * see COPYRIGHT.md. Unauthorised copying or distribution is prohibited.
 */
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { GisPropertySurvey } from './components/GisPropertySurvey';
import { ToolsDirectory } from './components/ToolsDirectory';
import { WktKmlConverter } from './components/WktKmlConverter';
import { AndroidAppModal } from './components/AndroidAppModal';
import { useAuth } from './services/auth';
import { isSearchOnly } from './services/access';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DemoSwitcher } from './components/DemoSwitcher';
import { useHistoryBack } from './hooks/useHistoryBack';
import { CopyrightFooter } from './components/CopyrightFooter';

export function App() {
  const { role, isSuper } = useAuth();
  const showTools = isSuper || role === 'admin';
  const minimal = isSearchOnly(role, isSuper);
  const [activeView, setActiveView] = useState<string>('gis-survey');
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);
  const [exitHint, setExitHint] = useState(false);

  const view = showTools ? activeView : 'gis-survey';
  const { go, back } = useHistoryBack(activeView, setActiveView, 'gis-survey');

  // Soft toast when user presses Back at the root view
  useEffect(() => {
    const onRoot = () => {
      setExitHint(true);
      const t = setTimeout(() => setExitHint(false), 1800);
      return () => clearTimeout(t);
    };
    window.addEventListener('app-back-at-root', onRoot);
    return () => window.removeEventListener('app-back-at-root', onRoot);
  }, []);

  return (
    <div className="scheme-app min-h-screen font-sans antialiased selection:bg-blue-500/30 selection:text-white">
      <Navbar
        activeView={view}
        setActiveView={go}
        onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
        showTools={showTools}
        minimal={minimal}
      />
      {!minimal && (
        <AndroidAppModal
          isOpen={isAndroidModalOpen}
          onClose={() => setIsAndroidModalOpen(false)}
        />
      )}
      <ErrorBoundary resetKey={view} onBack={back}>
        {view === 'gis-survey' && <GisPropertySurvey />}
        {view === 'wkt-kml' && <WktKmlConverter />}
        {view === 'tools-directory' && (
          <div className="page-shell page-enter py-6 sm:py-8">
            <ToolsDirectory
              onSelectTool={(id) =>
                go(
                  ['lat_long_kml', 'project_to_kml'].includes(id)
                    ? 'wkt-kml'
                    : id === 'gis_property_survey'
                      ? 'gis-survey'
                      : 'tools-directory',
                )
              }
            />
          </div>
        )}
      </ErrorBoundary>

      <CopyrightFooter />

      <DemoSwitcher />

      {exitHint && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200]
            px-4 py-2.5 rounded-xl text-sm font-semibold text-white
            bg-slate-900/90 border border-white/10 shadow-lg backdrop-blur-md"
        >
          Press Back again to leave
        </div>
      )}
    </div>
  );
}

export default App;
