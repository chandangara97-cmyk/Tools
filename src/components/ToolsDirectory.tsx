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
    <section className="space-y-6" id="tools">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Field Tools Directory
            <span className="text-xs font-normal text-[#9fc7c1] bg-[#0f242d] border border-[#1d434c] px-2 py-0.5 rounded-full">
              {TOOLS.length} Total Tools
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-[#9fc7c1] mt-1">
            Organized by operational area: PLFS tracking, Urban Frame Survey, Office &amp; TA/DA bills, and GIS property survey.
          </p>
        </div>
      </div>

      {/* Search Bar & Category Chips */}
      <div className="bg-[#0f242d] border border-[#1d434c] rounded-2xl p-4 shadow-lg space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#7ea19b] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search tool by job, e.g. bill, KML, boundary, scrutiny, TA/DA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs sm:text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#20b5a6]"
          />
        </div>

        {/* Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-[#1b433e] text-[#20b5a6] border border-[#20b5a6]'
                : 'bg-[#091a1f] text-[#9fc7c1] border border-[#1b3d39] hover:bg-white/5'
            }`}
          >
            All Areas ({TOOLS.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = TOOLS.filter(t => t.cat === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#1b433e] text-white border border-[#20b5a6]'
                    : 'bg-[#091a1f] text-[#9fc7c1] border border-[#1b3d39] hover:bg-white/5'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Tool Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTools.map((tool) => {
          const cat = CATEGORIES.find(c => c.id === tool.cat);
          const isFeatured = tool.featured || tool.id === 'gis_property_survey';

          return (
            <div
              key={tool.id}
              className={`bg-[#0f242d] border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-2xl ${
                isFeatured ? 'border-[#20b5a6]/60 bg-gradient-to-b from-[#11313a] to-[#0f242d]' : 'border-[#1d434c]'
              }`}
            >
              <div>
                {/* Card Top */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md flex-none"
                      style={{ backgroundColor: `${cat?.color || '#0e8a7d'}25`, color: cat?.color || '#20b5a6' }}
                    >
                      {getToolIcon(tool.icon)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight leading-snug">
                        {tool.title}
                      </h3>
                      <span className="text-[10px] text-[#9fc7c1] uppercase font-mono font-semibold">
                        {tool.type} · {cat?.name}
                      </span>
                    </div>
                  </div>

                  {tool.isNew && (
                    <span className="bg-[#d6a34b] text-[#07161d] text-[9.5px] font-black px-2 py-0.5 rounded tracking-wider uppercase">
                      NEW
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-[#c5d8df] mt-3 leading-relaxed">
                  {tool.desc}
                </p>

                {/* Use When Callout */}
                <div className="mt-3 p-2.5 rounded-lg bg-[#091a1f] border border-[#1b3d39] text-[11px] text-[#9fc7c1] leading-snug">
                  <b className="text-[#f7dfae]">Use when:</b> {tool.use}
                </div>
              </div>

              {/* Action Link / Button */}
              <div className="pt-4 mt-4 border-t border-[#1a3840] flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#7ea19b]">
                  {tool.status === 'soon' ? 'Coming Soon' : 'Runs in Browser'}
                </span>

                <button
                  onClick={() => onSelectTool(tool.id)}
                  disabled={tool.status === 'soon'}
                  className="bg-[#0e8a7d] hover:bg-[#11a394] disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow transition-transform active:scale-95"
                >
                  Open Tool
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-12 border border-dashed border-[#1d434c] rounded-2xl bg-[#0f242d] text-[#9fc7c1] text-xs">
          No tools match &ldquo;{searchQuery}&rdquo;. Try another search term or click &ldquo;All Areas&rdquo;.
        </div>
      )}
    </section>
  );
};
