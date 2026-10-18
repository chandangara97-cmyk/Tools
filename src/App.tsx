import React, { useState } from 'react';
import { Search, UserRound, Hash, MapPinned, ReceiptText, Trash2, Droplets, FileText, ChartNoAxesCombined, Settings2, ArrowUpRight, ChevronRight, Building2, Bell, CircleHelp, LogOut, ShieldCheck, Smartphone, Wrench } from 'lucide-react';
import { GisPropertySurvey } from './components/GisPropertySurvey';
import { ToolsDirectory } from './components/ToolsDirectory';
import { WktKmlConverter } from './components/WktKmlConverter';
import { AndroidAppModal } from './components/AndroidAppModal';
import { useAuth } from './services/auth';

type Module = { id: string; title: string; desc: string; icon: React.ElementType; tone: string; group: string };
const modules: Module[] = [
  { id: 'gis-survey', title: 'GIS Property Survey', desc: 'Map buildings and property records', icon: MapPinned, tone: 'blue', group: 'Survey & Mapping' },
  { id: 'property-tax', title: 'Property Tax', desc: 'Assessment, demand and receipts', icon: ReceiptText, tone: 'violet', group: 'Bills & Services' },
  { id: 'garbage', title: 'Garbage Collection', desc: 'Waste charges and collection status', icon: Trash2, tone: 'green', group: 'Bills & Services' },
  { id: 'water', title: 'Water Bills', desc: 'Water charges and payment records', icon: Droplets, tone: 'cyan', group: 'Bills & Services' },
  { id: 'other-bills', title: 'Other Bills & Forms', desc: 'Municipal charges and service forms', icon: FileText, tone: 'amber', group: 'Bills & Services' },
  { id: 'reports', title: 'Reports & Analytics', desc: 'Collections, summaries and exports', icon: ChartNoAxesCombined, tone: 'rose', group: 'Management' },
  { id: 'tools-directory', title: 'Field Tools', desc: 'Utilities, converters and data tools', icon: Settings2, tone: 'slate', group: 'Management' },
];

export function App() {
  const { role, isSuper, displayName, ulb, signOut } = useAuth() as any;
  const showTools = isSuper || role === 'admin';
  const [activeView, setActiveView] = useState('home');
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<'owner' | 'id'>('owner');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [railPaused, setRailPaused] = useState(false);
  const openModule = (id: string) => {
    if (id === 'tools-directory' && !showTools) return;
    setActiveView(id);
    setSearchMessage('');
    try { sessionStorage.setItem('schemeHubModule', id); } catch { /* storage may be disabled */ }
    if (id === 'gis-survey') { try { sessionStorage.setItem('schemeHubSearch', JSON.stringify({ mode: searchMode, query: searchTerm.trim() })); } catch { /* storage may be disabled */ } }
  };
  const runSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) { setSearchMessage(searchMode === 'owner' ? 'Enter an owner or structure name to search.' : 'Enter a property or ID number to search.'); return; }
    try { sessionStorage.setItem('schemeHubSearch', JSON.stringify({ mode: searchMode, query: searchTerm.trim() })); } catch { /* storage may be disabled */ }
    setSearchMessage(`Found your search request for “${searchTerm.trim()}”. Matching property records will open side by side.`);
    setActiveView('gis-survey');
  };
  const activeModule = modules.find(m => m.id === activeView);
  const view = activeView === 'wkt-kml' || activeView === 'tools-directory' ? activeView : 'gis-survey';
  return (
    <div className="hub-app min-h-screen">
      <header className="hub-topbar">
        <button className="hub-brand" onClick={() => setActiveView('home')} aria-label="Scheme Hub home">
          <span className="hub-brand-mark"><Building2 size={22}/></span>
          <span><b>Scheme Hub</b><small>URBAN SERVICES · 2026</small></span>
        </button>
        <div className="hub-top-context"><span className="status-dot"/> Municipal Operations <span className="context-divider">/</span> {ulb || 'Town workspace'}</div>
        <div className="hub-top-actions">
          <button className="icon-action" onClick={() => setIsAndroidModalOpen(true)} aria-label="Install app" title="Install app"><Smartphone size={17}/></button><button className="icon-action" aria-label="Help"><CircleHelp size={18}/></button>
          <button className="icon-action" aria-label="Notifications"><Bell size={18}/><i/></button>
          <div className="hub-user"><span className="user-avatar">{String(displayName || 'U').slice(0,1).toUpperCase()}</span><span className="user-name">{displayName || 'Staff User'}<small>{role || 'Municipal staff'}</small></span></div>
          <button className="signout-button" onClick={() => void signOut()} title="Sign out"><LogOut size={17}/></button>
        </div>
      </header>

      {activeView === 'home' ? <main className="hub-home">
        <div className="hub-welcome-row"><div><div className="eyebrow"><span/> DIGITAL MUNICIPAL WORKSPACE</div><h1>Good day{displayName ? `, ${displayName}` : ''}.</h1><p>Find a property, manage municipal services, and keep every record in one place.</p></div><div className="workspace-chip"><ShieldCheck size={16}/><span><b>Secure workspace</b><small>Access based on your role</small></span></div></div>
        <section className="search-hero">
          <div className="search-hero-copy"><span className="hero-kicker">PROPERTY LOOKUP</span><h2>One search. Every service.</h2><p>Search property records by owner, structure name or a unique ID.</p></div>
          <form className="property-search" onSubmit={runSearch}>
            <div className="search-mode-switch" role="tablist" aria-label="Search type">
              <button type="button" role="tab" aria-selected={searchMode === 'owner'} className={searchMode === 'owner' ? 'selected' : ''} onClick={() => {setSearchMode('owner');setSearchMessage('');}}><UserRound size={16}/> Owner / Structure name</button>
              <button type="button" role="tab" aria-selected={searchMode === 'id'} className={searchMode === 'id' ? 'selected' : ''} onClick={() => {setSearchMode('id');setSearchMessage('');}}><Hash size={16}/> Property ID</button>
            </div>
            <div className="search-input-row"><Search size={21} className="search-input-icon"/><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={searchMode === 'owner' ? 'Enter owner name or structure name…' : 'Enter property ID / assessment number…'} aria-label={searchMode === 'owner' ? 'Owner or structure name' : 'Property ID'} /><button className="search-submit" type="submit">Search records <ArrowUpRight size={17}/></button></div>
            <div className="search-foot"><span><ShieldCheck size={14}/> Search within your authorised town records</span><span>{searchMode === 'owner' ? 'Tip: try a surname or building name' : 'Tip: enter the complete ID if known'}</span></div>
            {searchMessage && <div className="search-message" role="status">{searchMessage}</div>}
          </form>
          <div className="hero-decoration hero-decoration-one"/><div className="hero-decoration hero-decoration-two"/>
        </section>
        <section className="hub-section-head"><div><span className="section-kicker">YOUR WORKSPACE</span><h2>Services & modules</h2><p>Choose a service below or use the quick-access strip at the bottom.</p></div><span className="module-count">{modules.filter(m => m.id !== 'tools-directory' || showTools).length} MODULES</span></section>
        <section className="module-grid">
          {modules.filter(m => m.id !== 'tools-directory' || showTools).map((m, i) => {const Icon = m.icon; return <button key={m.id} className={`module-card tone-${m.tone}`} onClick={() => openModule(m.id)}><span className="module-icon"><Icon size={22}/></span><span className="module-card-copy"><small>{m.group}</small><b>{m.title}</b><span>{m.desc}</span></span><span className="module-arrow"><ChevronRight size={18}/></span></button>;})}
        </section>
        <footer className="hub-footer"><span><span className="footer-mark">H</span> Scheme Hub <span className="footer-muted">· Municipal services platform</span></span><span>Designed for desktop, tablet and mobile</span></footer>
      </main> : <>
        <div className="module-page-head"><button onClick={() => setActiveView('home')} className="back-home">← Home</button><div><span className="section-kicker">WORKSPACE MODULE</span><h1>{activeModule?.title || (activeView === 'wkt-kml' ? 'GIS & Data Tools' : 'Field Tools')}</h1><p>{activeModule?.desc || 'Utilities and administrative tools'}</p></div><span className="workspace-chip"><ShieldCheck size={16}/> Authorised access</span></div>
        {activeView === 'wkt-kml' && <WktKmlConverter/>}
        {activeView === 'tools-directory' && <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><ToolsDirectory onSelectTool={(id) => setActiveView(['lat_long_kml', 'project_to_kml'].includes(id) ? 'wkt-kml' : id === 'gis_property_survey' ? 'gis-survey' : 'tools-directory')} /></div>}
        {activeView !== 'wkt-kml' && activeView !== 'tools-directory' && <GisPropertySurvey key={activeView}/>}
      </>}

      <nav className="quick-rail" aria-label="Quick access modules" onMouseEnter={() => setRailPaused(true)} onMouseLeave={() => setRailPaused(false)}>
        <div className="rail-label"><span className="rail-live-dot"/> QUICK ACCESS <small>MODULES</small></div>
        <div className={`rail-window ${railPaused ? 'paused' : ''}`}><div className="rail-track">
          {[...modules.filter(m => m.id !== 'tools-directory' || showTools), ...modules.filter(m => m.id !== 'tools-directory' || showTools)].map((m, i) => {const Icon = m.icon; return <button key={`${m.id}-${i}`} onClick={() => openModule(m.id)} className={`rail-tile ${activeView === m.id ? 'rail-active' : ''}`}><span className={`rail-icon tone-${m.tone}`}><Icon size={17}/></span><span>{m.title}</span><ArrowUpRight size={13} className="rail-open-icon"/></button>;})}
        </div></div>
        <button className="rail-home" onClick={() => setActiveView('home')} title="Return to home"><Building2 size={17}/><span>Home</span></button>
      </nav>
      <AndroidAppModal isOpen={isAndroidModalOpen} onClose={() => setIsAndroidModalOpen(false)} />
      {showTools && <button className="hidden" onClick={() => setIsAndroidModalOpen(true)}><Smartphone/><Wrench/></button>}
    </div>
  );
}
export default App;
