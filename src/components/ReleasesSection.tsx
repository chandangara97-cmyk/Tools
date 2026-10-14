import React, { useState } from 'react';
import { REPORTS_DATA, ReportItem } from '../data/reportsData';
import { ExternalLink, Calendar, FileText, CheckCircle2 } from 'lucide-react';

export const ReleasesSection: React.FC = () => {
  const [orgFilter, setOrgFilter] = useState<'all' | 'MoSPI' | 'HP Statistics'>('all');

  const filteredItems = REPORTS_DATA.items.filter(
    (item) => orgFilter === 'all' || item.org === orgFilter
  );

  return (
    <section className="space-y-6" id="releases">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Releases &amp; Advance Calendar
            <span className="text-xs font-normal text-[#9fc7c1] bg-[#0f242d] border border-[#1d434c] px-2 py-0.5 rounded-full">
              2026-27 Publications
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-[#9fc7c1] mt-1">
            Tracking releases for GDP, IIP, CPI, PLFS and Himachal Pradesh economic surveys.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Latest Releases */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[#0f242d] border border-[#1d434c] rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#20b5a6]" />
                Latest Publications
              </h3>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={() => setOrgFilter('all')}
                  className={`px-2.5 py-1 rounded font-bold ${
                    orgFilter === 'all' ? 'bg-[#0e8a7d] text-white' : 'bg-[#091a1f] text-[#9fc7c1]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setOrgFilter('MoSPI')}
                  className={`px-2.5 py-1 rounded font-bold ${
                    orgFilter === 'MoSPI' ? 'bg-[#0e8a7d] text-white' : 'bg-[#091a1f] text-[#9fc7c1]'
                  }`}
                >
                  MoSPI (Central)
                </button>
                <button
                  onClick={() => setOrgFilter('HP Statistics')}
                  className={`px-2.5 py-1 rounded font-bold ${
                    orgFilter === 'HP Statistics' ? 'bg-[#0e8a7d] text-white' : 'bg-[#091a1f] text-[#9fc7c1]'
                  }`}
                >
                  HP DES (State)
                </button>
              </div>
            </div>

            <div className="divide-y divide-[#1a3840]">
              {filteredItems.map((item, idx) => (
                <div key={idx} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#9fc7c1]">{item.date || 'Recent'}</span>
                    <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                      item.org === 'MoSPI' ? 'bg-blue-950 text-blue-300' : 'bg-emerald-950 text-emerald-300'
                    }`}>
                      {item.org}
                    </span>
                    {item.isNew && (
                      <span className="bg-[#d6a34b] text-[#07161d] text-[9px] font-black px-1.5 py-0.2 rounded">
                        NEW
                      </span>
                    )}
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-white hover:text-[#20b5a6] transition-colors flex items-center gap-1 leading-snug"
                  >
                    {item.title} <ExternalLink className="w-3 h-3 text-[#7ea19b] flex-none" />
                  </a>
                  {item.note && (
                    <p className="text-[11px] text-[#9fc7c1] leading-relaxed">{item.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Official Pinned Sources */}
          <div className="bg-[#0f242d] border border-[#1d434c] rounded-2xl p-5 shadow-lg space-y-3">
            <h3 className="text-xs font-bold text-[#f7dfae] uppercase tracking-wider">
              Primary Official Portals
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {REPORTS_DATA.pinned.map((pin, i) => (
                <a
                  key={i}
                  href={pin.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-[#091a1f] hover:bg-[#112730] border border-[#1b3d39] rounded-xl transition-all space-y-1 group block"
                >
                  <div className="flex items-center justify-between text-[10px] text-[#7ea19b]">
                    <span>{pin.org}</span>
                    <span className="font-mono">{pin.kind}</span>
                  </div>
                  <div className="font-bold text-white group-hover:text-[#20b5a6] transition-colors leading-snug">
                    {pin.title}
                  </div>
                  {pin.note && <div className="text-[11px] text-[#9fc7c1]">{pin.note}</div>}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Releases Calendar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#0f242d] border border-[#1d434c] rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#f7dfae]" />
              Upcoming Calendar
            </h3>
            <div className="space-y-3">
              {REPORTS_DATA.upcoming.map((u, i) => (
                <div key={i} className="p-3 bg-[#091a1f] border border-[#1b3d39] rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[#f7dfae] font-bold">{u.date}</span>
                    <span className="text-[10px] bg-white/10 text-[#9fc7c1] px-1.5 py-0.5 rounded">
                      {u.org}
                    </span>
                  </div>
                  <div className="font-semibold text-white leading-snug">{u.title}</div>
                </div>
              ))}
            </div>
            <p className="text-[10.5px] text-[#7ea19b] pt-2 border-t border-[#1b3d39]">
              {REPORTS_DATA.upcoming_source}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
