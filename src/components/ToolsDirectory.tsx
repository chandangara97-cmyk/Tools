import React, { useState } from 'react';
import { CATEGORIES, TOOLS } from '../data/toolsData';
import { Search, ArrowRight, Layers, ShieldCheck, Map, Calculator, FileText, Calendar, Building2 } from 'lucide-react';

interface ToolsDirectoryProps {
  onSelectTool: (toolId: string) => void;
}

export const ToolsDirectory: React.FC<ToolsDirectoryProps> = ({ onSelectTool }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTools = TOOLS.filter((tool) => {
    const matchesCat = selectedCategory === 'all' || tool.cat === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      tool.title.toLowerCase().includes(q) ||
      tool.desc.toLowerCase().includes(q) ||
      tool.use.toLowerCase().includes(q) ||
      tool.keys.toLowerCase().includes(q) ||
      tool.type.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const getToolIcon = (iconName: string) => {
    switch (iconName) {
      case 'dashboard':
        return <Layers className="w-5 h-5" />;
      case 'file':
        return <FileText className="w-5 h-5" />;
      case 'calendar':
        return <Calendar className="w-5 h-5" />;
      case 'chart':
        return <Layers className="w-5 h-5" />;
      case 'pin':
        return <Map className="w-5 h-5" />;
      case 'check':
        return <ShieldCheck className="w-5 h-5" />;
      case 'briefcase':
        return <Calculator className="w-5 h-5" />;
      case 'calc':
        return <Calculator className="w-5 h-5" />;
      case 'building':
        return <Building2 className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <section className="space-y-8" id="tools">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-semibold tracking-[0.22em] uppercase text-[#e8b84a] mb-2">
            Scheme Hub 2026
          </p>
          <h2 className="font-serif text-[1.75rem] sm:text-[2.1rem] tracking-tight text-white leading-none">
            Field <em className="italic text-[#f7df9a]">Tools</em>
          </h2>
          <p className="text-[13.5px] text-[#7d8ba3] mt-2.5 max-w-md leading-relaxed">
            Precision GIS survey workspace and converters for urban local bodies.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#7d8ba3]">
          <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] font-medium">
            {TOOLS.length} tools
          </span>
          <span className="px-2.5 py-1 rounded-full bg-[#e8b84a]/10 border border-[#e8b84a]/25 text-[#f7df9a] font-medium">
            AMRUT ready
          </span>
        </div>
      </div>

      <div className="glass p-4 sm:p-5 space-y-3.5">
        <div className="relative">
          <Search className="w-4 h-4 text-[#5c6a84] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            placeholder="Search tools by name, job, or keyword…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a101c]/90 border border-white/[0.07] text-[#eef2fb] text-[13.5px] rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#e8b84a]/45 focus:ring-[3px] focus:ring-[#e8b84a]/12 placeholder:text-[#5c6a84] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 text-[12px]">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-[#e8b84a]/14 text-[#f7df9a] border border-[#e8b84a]/40 shadow-[0_0_12px_rgba(232,184,74,0.1)]'
                : 'bg-white/[0.025] text-[#7d8ba3] border border-white/[0.07] hover:border-white/[0.12] hover:text-[#eef2fb]'
            }`}
          >
            All ({TOOLS.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = TOOLS.filter((t) => t.cat === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#e8b84a]/14 text-[#f7df9a] border border-[#e8b84a]/40 shadow-[0_0_12px_rgba(232,184,74,0.1)]'
                    : 'bg-white/[0.025] text-[#7d8ba3] border border-white/[0.07] hover:border-white/[0.12] hover:text-[#eef2fb]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full shadow-[0_0_4px_currentColor]" style={{ backgroundColor: cat.color }} />
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTools.map((tool) => {
          const cat = CATEGORIES.find((c) => c.id === tool.cat);
          const isFeatured = tool.featured || tool.id === 'gis_property_survey';

          return (
            <div
              key={tool.id}
              className={`group relative overflow-hidden rounded-[18px] p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 ${
                isFeatured
                  ? 'bg-gradient-to-b from-[#e8b84a]/[0.09] via-[#0e1524]/95 to-[#0e1524] border border-[#e8b84a]/28 shadow-[0_8px_40px_rgba(0,0,0,0.35),0_0_0_1px_rgba(232,184,74,0.06)]'
                  : 'bg-[#0e1524]/85 border border-white/[0.07] shadow-[0_4px_24px_rgba(0,0,0,0.28)] hover:border-white/[0.12] hover:shadow-[0_16px_48px_rgba(0,0,0,0.4)]'
              }`}
            >
              <div
                className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent ${
                  isFeatured ? 'via-[#e8b84a]/80' : 'via-white/0 group-hover:via-white/20'
                } transition-all`}
              />

              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-11 h-11 rounded-[13px] flex items-center justify-center flex-none border shadow-inner"
                      style={{
                        backgroundColor: `${cat?.color || '#e8b84a'}14`,
                        color: cat?.color || '#f7df9a',
                        borderColor: `${cat?.color || '#e8b84a'}28`,
                      }}
                    >
                      {getToolIcon(tool.icon)}
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-semibold text-white tracking-tight leading-snug">
                        {tool.title}
                      </h3>
                      <span className="text-[10px] text-[#7d8ba3] uppercase tracking-[0.08em] font-semibold mt-0.5 block">
                        {tool.type}
                      </span>
                    </div>
                  </div>

                  {tool.isNew && (
                    <span className="bg-[#e8b84a]/15 text-[#f7df9a] border border-[#e8b84a]/35 text-[9px] font-bold px-2 py-0.5 rounded-full tracking-[0.06em] uppercase shadow-[0_0_10px_rgba(232,184,74,0.15)]">
                      New
                    </span>
                  )}
                </div>

                <p className="text-[13px] text-[#9aa6bd] mt-4 leading-relaxed">{tool.desc}</p>

                <div className="mt-4 p-3 rounded-xl bg-black/25 border border-white/[0.05] text-[12px] text-[#7d8ba3] leading-snug">
                  <span className="text-[#f7df9a] font-semibold">Use when:</span> {tool.use}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/[0.05] flex items-center justify-between">
                <span className="text-[11px] text-[#5c6a84] font-medium">
                  {tool.status === 'soon' ? 'Coming soon' : 'Runs in browser'}
                </span>

                <button
                  onClick={() => onSelectTool(tool.id)}
                  disabled={tool.status === 'soon'}
                  className="btn-gold text-[12px] px-3.5 py-1.5 flex items-center gap-1.5 disabled:opacity-40"
                >
                  Open
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-16 border border-dashed border-white/[0.08] rounded-[18px] bg-[#0e1524]/50 text-[#7d8ba3] text-[13.5px]">
          No tools match &ldquo;{searchQuery}&rdquo;. Try another term or select All.
        </div>
      )}
    </section>
  );
};
