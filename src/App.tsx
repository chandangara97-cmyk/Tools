import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { GisPropertySurvey } from './components/GisPropertySurvey';
import { ToolsDirectory } from './components/ToolsDirectory';
import { WktKmlConverter } from './components/WktKmlConverter';
import { AndroidAppModal } from './components/AndroidAppModal';
import { useAuth } from './services/auth';

export function App() {
  const { role, isSuper } = useAuth();
  // Field tools (KML converters) are for the platform owner and ULB admins only.
  const showTools = isSuper || role === 'admin';
  const [activeView, setActiveView] = useState<string>('gis-survey');
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);

  const view = showTools ? activeView : 'gis-survey';

  return (
    <div className="min-h-screen bg-[#0d1224] text-[#eef0fb] font-sans antialiased selection:bg-[#4f46e5] selection:text-white">
      <Navbar
        activeView={view}
        setActiveView={setActiveView}
        onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
        showTools={showTools}
      />
      <AndroidAppModal isOpen={isAndroidModalOpen} onClose={() => setIsAndroidModalOpen(false)} />

      {view === 'gis-survey' && <GisPropertySurvey />}
      {view === 'wkt-kml' && <WktKmlConverter />}
      {view === 'tools-directory' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ToolsDirectory onSelectTool={(id) => setActiveView(['lat_long_kml', 'project_to_kml'].includes(id) ? 'wkt-kml' : id === 'gis_property_survey' ? 'gis-survey' : 'tools-directory')} />
        </div>
      )}
    </div>
  );
}
export default App;
