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
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800 font-sans antialiased selection:bg-[#4f46e5] selection:text-white">
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
