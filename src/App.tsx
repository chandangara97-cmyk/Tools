import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { GisPropertySurvey } from './components/GisPropertySurvey';
import { ToolsDirectory } from './components/ToolsDirectory';
import { WktKmlConverter } from './components/WktKmlConverter';
import { AndroidAppModal } from './components/AndroidAppModal';
import { useAuth } from './services/auth';
import { isSearchOnly } from './services/access';
import { ErrorBoundary } from './components/ErrorBoundary';

export function App() {
  const { role, isSuper } = useAuth();
  // Field tools (KML converters) are for the platform owner and ULB admins only.
  const showTools = isSuper || role === 'admin';
  const minimal = isSearchOnly(role, isSuper);
  const [activeView, setActiveView] = useState<string>('gis-survey');
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);

  const view = showTools ? activeView : 'gis-survey';

  return (
    <div className="scheme-app min-h-screen bg-[#f4f7fb] text-slate-800 font-sans antialiased selection:bg-[#4f46e5] selection:text-white">
      <style>{`
        .scheme-app { --page-ink:#172b4d; --page-muted:#61738b; --page-line:#dce6f1; --page-accent:#2459a9; background:linear-gradient(180deg,#edf4fc 0%,#f8fafc 260px,#f4f7fb 100%); min-height:100vh; }
        .scheme-app main { max-width:1440px; margin-inline:auto; }
        .scheme-app button,.scheme-app a,.scheme-app input,.scheme-app select { transition:background-color .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease; }
        .scheme-app button:focus-visible,.scheme-app a:focus-visible,.scheme-app input:focus-visible,.scheme-app select:focus-visible { outline:3px solid #83b5ff; outline-offset:2px; }
        @media(max-width:640px){ .scheme-app { overflow-x:hidden; } .scheme-app main { padding-inline:12px; } }
      `}</style>
      <Navbar
        activeView={view}
        setActiveView={setActiveView}
        onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
        showTools={showTools}
        minimal={minimal}
      />
      {!minimal && <AndroidAppModal isOpen={isAndroidModalOpen} onClose={() => setIsAndroidModalOpen(false)} />}

      <ErrorBoundary resetKey={view} onBack={() => setActiveView('gis-survey')}>
      {view === 'gis-survey' && <GisPropertySurvey />}
      {view === 'wkt-kml' && <WktKmlConverter />}
      {view === 'tools-directory' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ToolsDirectory onSelectTool={(id) => setActiveView(['lat_long_kml', 'project_to_kml'].includes(id) ? 'wkt-kml' : id === 'gis_property_survey' ? 'gis-survey' : 'tools-directory')} />
        </div>
      )}
      </ErrorBoundary>
    </div>
  );
}
export default App;
