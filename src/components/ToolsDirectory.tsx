import React, { useState } from 'react';
import { CATEGORIES, TOOLS, ToolItem } from '../data/toolsData';
import { Search, ArrowRight, Sparkles, Layers, ShieldCheck, Map, Calculator, FileText, Calendar, Building2 } from 'lucide-react';

interface ToolsDirectoryProps {
  onSelectTool: (toolId: string) => void;
}

export const ToolsDirectory: React.FC<ToolsDirectoryProps> = ({ onSelectTool }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter tools
  const filteredTools = TOOLS.filter((tool) => {
    const matchesCat = selectedCategory === 'all' || tool.cat === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      tool.title.toLowerCase().includes(q) ||
      tool.desc.toLowerCase().includes(q) ||
      tool.use.toLowerCase().includes(q) ||
      tool.keys.toLowerCase().includes(q) ||
      tool.type.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const getToolIcon = (iconName: string) => {
    switch (iconName) {
      case 'dashboard': return <Layers className="w-5 h-5" />;
      case 'file': return <FileText className="w-5 h-5" />;
      case 'calendar': return <Calendar className="w-5 h-5" />;
      case 'chart': return <Layers className="w-5 h-5" />;
      case 'pin': return <Map className="w-5 h-5" />;
      case 'check': return <ShieldCheck className="w-5 h-5" />;
      case 'briefcase': return <Calculator className="w-5 h-5" />;
      case 'calc': return <Calculator className="w-5 h-5" />;
      case 'building': return <Building2 className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <section className="tools-directory-page page-enter space-y-6" id="tools">
      {/* Professional page header */}
      <header className="page-header">
        <div>
          <span className="page-kicker">Field operations</span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2.5 flex-wrap">
            Tools Directory
            <span className="badge badge-info text-xs font-semibold normal-case tracking-normal">
              {TOOLS.length} tools
            </span>
          </h2>
          <p className="page-sub">
            GIS property survey and KML / Shapefile converters for QGIS and field work.
          </p>
        </div>
      </header>

      {/* Search & category toolbar */}
      <div className="toolbar flex-col items-stretch !gap-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            placeholder="Search by job, e.g. bill, KML, boundary, scrutiny…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full font-bold transition-all whitespace-nowrap border ${
              selectedCategory === 'all'
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            All ({TOOLS.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = TOOLS.filter(t => t.cat === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                type="button"
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Tool Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredTools.map((tool) => {
          const cat = CATEGORIES.find(c => c.id === tool.cat);
          const isFeatured = tool.featured || tool.id === 'gis_property_survey';

          return (
            <div
              key={tool.id}
              className={`content-card flex flex-col justify-between p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(20,44,83,0.12)] hover:border-blue-200 ${
                isFeatured ? 'ring-1 ring-blue-200/80 border-blue-100' : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-none ring-1 ring-black/5"
                      style={{ backgroundColor: `${cat?.color || '#4f46e5'}18`, color: cat?.color || '#477dff' }}
                    >
                      {getToolIcon(tool.icon)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-800 tracking-tight leading-snug truncate">
                        {tool.title}
                      </h3>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">
                        {tool.type} · {cat?.name}
                      </span>
                    </div>
                  </div>

                  {tool.isNew && (
                    <span className="badge badge-warn shrink-0">New</span>
                  )}
                </div>

                <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                  {tool.desc}
                </p>

                <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 leading-snug">
                  <span className="font-bold text-amber-700">Use when:</span> {tool.use}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-slate-400">
                  {tool.status === 'soon' ? 'Coming soon' : 'Runs in browser'}
                </span>

                <button
                  type="button"
                  onClick={() => onSelectTool(tool.id)}
                  disabled={tool.status === 'soon'}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 disabled:opacity-40 text-white text-xs font-bold px-3.5 py-2 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-[0.98]"
                >
                  Open tool
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="empty-state border border-dashed border-slate-200 rounded-2xl bg-white">
          <div className="empty-icon">
            <Search className="w-5 h-5" />
          </div>
          <h3>No matching tools</h3>
          <p>
            Nothing matches &ldquo;{searchQuery}&rdquo;. Try another term or select All.
          </p>
        </div>
      )}
    </section>
  );
};
