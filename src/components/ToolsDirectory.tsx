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
            <span className="text-xs font-normal text-[#aab4dc] bg-[#181f3d] border border-[#28325c] px-2 py-0.5 rounded-full">
              {TOOLS.length} Total Tools
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-[#aab4dc] mt-1">
            GIS property survey and KML / Shapefile converters for QGIS.
          </p>
        </div>
      </div>

      {/* Search Bar & Category Chips */}
      <div className="bg-[#181f3d] border border-[#28325c] rounded-2xl p-4 shadow-lg space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8790bd] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search tool by job, e.g. bill, KML, boundary, scrutiny, TA/DA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs sm:text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#9aa8ff]"
          />
        </div>

        {/* Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-[#2a3464] text-[#9aa8ff] border border-[#9aa8ff]'
                : 'bg-[#121830] text-[#aab4dc] border border-[#252e56] hover:bg-white/5'
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
                    ? 'bg-[#2a3464] text-white border border-[#9aa8ff]'
                    : 'bg-[#121830] text-[#aab4dc] border border-[#252e56] hover:bg-white/5'
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
              className={`bg-[#181f3d] border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-2xl ${
                isFeatured ? 'border-[#9aa8ff]/60 bg-gradient-to-b from-[#11313a] to-[#181f3d]' : 'border-[#28325c]'
              }`}
            >
              <div>
                {/* Card Top */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md flex-none"
                      style={{ backgroundColor: `${cat?.color || '#4f46e5'}25`, color: cat?.color || '#9aa8ff' }}
                    >
                      {getToolIcon(tool.icon)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight leading-snug">
                        {tool.title}
                      </h3>
                      <span className="text-[10px] text-[#aab4dc] uppercase font-mono font-semibold">
                        {tool.type} · {cat?.name}
                      </span>
                    </div>
                  </div>

                  {tool.isNew && (
                    <span className="bg-[#f2b233] text-[#0d1224] text-[9.5px] font-black px-2 py-0.5 rounded tracking-wider uppercase">
                      NEW
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-[#d6dcf5] mt-3 leading-relaxed">
                  {tool.desc}
                </p>

                {/* Use When Callout */}
                <div className="mt-3 p-2.5 rounded-lg bg-[#121830] border border-[#252e56] text-[11px] text-[#aab4dc] leading-snug">
                  <b className="text-[#ffe3a3]">Use when:</b> {tool.use}
                </div>
              </div>

              {/* Action Link / Button */}
              <div className="pt-4 mt-4 border-t border-[#232c52] flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#8790bd]">
                  {tool.status === 'soon' ? 'Coming Soon' : 'Runs in Browser'}
                </span>

                <button
                  onClick={() => onSelectTool(tool.id)}
                  disabled={tool.status === 'soon'}
                  className="bg-[#4f46e5] hover:bg-[#6259f0] disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow transition-transform active:scale-95"
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
        <div className="text-center py-12 border border-dashed border-[#28325c] rounded-2xl bg-[#181f3d] text-[#aab4dc] text-xs">
          No tools match &ldquo;{searchQuery}&rdquo;. Try another search term or click &ldquo;All Areas&rdquo;.
        </div>
      )}
    </section>
  );
};
