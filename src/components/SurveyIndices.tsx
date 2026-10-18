import React, { useState } from 'react';
import { SURVEY_INDICES, SurveyIndex } from '../data/indicesData';
import { TrendingUp, Search, ExternalLink } from 'lucide-react';

export const SurveyIndices: React.FC = () => {
  const [levelFilter, setLevelFilter] = useState<'all' | 'central' | 'state'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSurveys = SURVEY_INDICES.surveys.filter((s) => {
    const matchesLevel = levelFilter === 'all' || s.level === levelFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      s.name.toLowerCase().includes(q) ||
      s.body.toLowerCase().includes(q) ||
      s.indicators.some(i => i.label.toLowerCase().includes(q));
    return matchesLevel && matchesSearch;
  });

  return (
    <section className="space-y-6" id="indices">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Survey Indices &amp; Public Statistics
            <span className="text-xs font-normal text-[#aab4dc] bg-[#181f3d] border border-[#28325c] px-2 py-0.5 rounded-full">
              Central &amp; HP State
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-[#aab4dc] mt-1">
            Figures extracted from official releases by MoSPI and HP Department of Economics &amp; Statistics.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#181f3d] border border-[#28325c] rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8790bd] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search survey, index or publisher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-xl pl-9 pr-3 py-2 focus:border-[#9aa8ff]"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
          <button
            onClick={() => setLevelFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              levelFilter === 'all' ? 'bg-[#4f46e5] text-white' : 'bg-[#121830] text-[#aab4dc] border border-[#2f3a6b]'
            }`}
          >
            All Surveys
          </button>
          <button
            onClick={() => setLevelFilter('central')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              levelFilter === 'central' ? 'bg-[#4f46e5] text-white' : 'bg-[#121830] text-[#aab4dc] border border-[#2f3a6b]'
            }`}
          >
            Central (MoSPI)
          </button>
          <button
            onClick={() => setLevelFilter('state')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              levelFilter === 'state' ? 'bg-[#4f46e5] text-white' : 'bg-[#121830] text-[#aab4dc] border border-[#2f3a6b]'
            }`}
          >
            State (HP DES)
          </button>
        </div>
      </div>

      {/* Survey Index Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSurveys.map((survey) => (
          <div
            key={survey.id}
            className="bg-[#181f3d] border border-[#28325c] rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  survey.level === 'central' ? 'bg-blue-950/60 text-blue-300 border border-blue-800/40' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                }`}>
                  {survey.level === 'central' ? 'Central' : 'HP State'}
                </span>
                <span className="text-[11px] text-[#aab4dc]">{survey.frequency}</span>
              </div>

              <h3 className="text-sm font-bold text-white mt-2 leading-snug">
                {survey.name}
              </h3>
              <p className="text-xs text-[#aab4dc] mt-0.5">
                {survey.body}
              </p>

              {/* Indicators List */}
              <div className="mt-4 space-y-2 border-t border-[#232c52] pt-3">
                {survey.indicators.map((ind) => {
                  const obs = survey.observations.find(o => o.key === ind.key);
                  return (
                    <div key={ind.key} className="p-2.5 rounded-lg bg-[#121830] border border-[#252e56] text-xs space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[#d6dcf5]">{ind.label}:</span>
                        <b className="text-white font-mono text-sm">
                          {obs ? `${obs.value} ${ind.unit === 'index' || ind.unit === 'count' ? '' : ind.unit}` : 'N/A'}
                        </b>
                      </div>
                      {obs && (
                        <div className="text-[10px] text-[#8790bd] flex justify-between items-center pt-1 border-t border-[#162f33]">
                          <span>{obs.period}</span>
                          {obs.source_url && (
                            <a
                              href={obs.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#9aa8ff] hover:underline flex items-center gap-0.5"
                            >
                              Source <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
