import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { GisPropertySurvey } from './components/GisPropertySurvey';
import { ToolsDirectory } from './components/ToolsDirectory';
import { WktKmlConverter } from './components/WktKmlConverter';
import { AndroidAppModal } from './components/AndroidAppModal';
import { useAuth } from './services/auth';
import { Bell, Search, ChevronRight } from 'lucide-react';

export function App() {
  const { role, isSuper } = useAuth();
  const showTools = isSuper || role === 'admin';
  const [activeView, setActiveView] = useState<string>('gis-survey');
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);
  const view = showTools ? activeView : 'gis-survey';
  const pageTitle = view === 'gis-survey' ? 'Property survey' : view === 'wkt-kml' ? 'GIS converters' : 'Tools & services';
  const pageSubtitle = view === 'gis-survey' ? 'Field operations / Property data collection' : view === 'wkt-kml' ? 'Spatial data utilities / File conversion' : 'Workspace / Available tools';

  return (
    <div className="app-shell min-h-screen">
      <Navbar activeView={view} setActiveView={setActiveView} onOpenAndroidModal={() => setIsAndroidModalOpen(true)} showTools={showTools} />
      <div className="app-workspace">
        <header className="workspace-topbar">
          <div className="topbar-heading">
            <div className="eyebrow">NSO • FIELD OPERATIONS</div>
            <h1>{pageTitle}</h1>
            <div className="breadcrumbs"><span>Scheme Hub</span><ChevronRight size={13} /><span>{pageSubtitle}</span></div>
          </div>
          <div className="topbar-actions">
            <label className="quick-search"><Search size={16} /><input aria-label="Search workspace" placeholder="Search tools or records" /></label>
            <button className="icon-action" aria-label="Notifications"><Bell size={18} /><i /></button>
            <div className="profile-chip"><span className="profile-avatar">NS</span><span><b>Field workspace</b><small>2026 edition</small></span></div>
          </div>
        </header>
        <main className="workspace-content">
          <AndroidAppModal isOpen={isAndroidModalOpen} onClose={() => setIsAndroidModalOpen(false)} />
          {view === 'gis-survey' && <GisPropertySurvey />}
          {view === 'wkt-kml' && <WktKmlConverter />}
          {view === 'tools-directory' && <div className="tools-content"><ToolsDirectory onSelectTool={(id) => setActiveView(['lat_long_kml', 'project_to_kml'].includes(id) ? 'wkt-kml' : id === 'gis_property_survey' ? 'gis-survey' : 'tools-directory')} /></div>}
          <footer className="workspace-footer"><span>Scheme Hub 2026</span><span>Survey • Data • Reports</span></footer>
        </main>
      </div>
    </div>
  );
}
export default App;
