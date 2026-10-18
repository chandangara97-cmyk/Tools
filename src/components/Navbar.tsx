import React from 'react';
import { Smartphone, Lock, LogOut, Wrench, MapPinned, Layers3, ChevronDown, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useAuth } from '../services/auth';

interface NavbarProps { activeView: string; setActiveView: (view: string) => void; onOpenAndroidModal: () => void; showTools: boolean; }

export const Navbar: React.FC<NavbarProps> = ({ activeView, setActiveView, onOpenAndroidModal, showTools }) => {
  const { isInstallable } = usePWAInstall();
  const { signOut, role } = useAuth();
  return <aside className="app-sidebar">
    <button onClick={() => setActiveView('gis-survey')} className="brand-lockup" aria-label="Go to Scheme Hub dashboard">
      <span className="brand-mark"><svg width="25" height="25" viewBox="0 0 30 30" fill="none" aria-hidden="true"><path d="M15 4 26 24H4L15 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M15 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="15" cy="21" r="1.2" fill="currentColor"/></svg></span>
      <span className="brand-copy"><b>SCHEME HUB</b><small>NSO · 2026</small></span>
    </button>
    <div className="sidebar-label">WORKSPACE</div>
    <nav className="sidebar-nav" aria-label="Main navigation">
      <button className={`sidebar-link ${activeView === 'gis-survey' ? 'active' : ''}`} onClick={() => setActiveView('gis-survey')}><MapPinned size={18}/><span>Property survey</span><span className="nav-indicator"/></button>
      {showTools && <>
        <button className={`sidebar-link ${activeView === 'tools-directory' ? 'active' : ''}`} onClick={() => setActiveView('tools-directory')}><Layers3 size={18}/><span>Tools & services</span></button>
        <button className={`sidebar-link ${activeView === 'wkt-kml' ? 'active' : ''}`} onClick={() => setActiveView('wkt-kml')}><Wrench size={18}/><span>GIS converters</span></button>
      </>}
    </nav>
    <div className="sidebar-spacer" />
    <div className="sidebar-help"><span className="help-icon"><ShieldCheck size={18}/></span><b>Field workspace</b><p>Tools and records for day-to-day survey work.</p><span className="status-line"><i/> System workspace</span></div>
    {showTools && <a className="sidebar-link admin-link" href="admin_users.html"><Lock size={17}/><span>Administration</span></a>}
    <button className="sidebar-link" onClick={onOpenAndroidModal}><Smartphone size={18}/><span>Android app</span>{isInstallable && <span className="install-dot"/>}</button>
    <button className="sidebar-link signout-link" onClick={() => void signOut()}><LogOut size={18}/><span>Sign out</span><ChevronDown size={14} className="signout-chevron"/></button>
    <div className="sidebar-version">SCHEME HUB <span>v2026.1</span><small>{role || 'Workspace user'}</small></div>
  </aside>;
};
