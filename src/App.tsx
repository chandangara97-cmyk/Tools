import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroTerrain } from './components/HeroTerrain';
import { GisPropertySurvey } from './components/GisPropertySurvey';
import { OfficeBillsMaster } from './components/OfficeBillsMaster';
import { ToolsDirectory } from './components/ToolsDirectory';
import { SurveyIndices } from './components/SurveyIndices';
import { ReleasesSection } from './components/ReleasesSection';
import { WktKmlConverter } from './components/WktKmlConverter';
import { PlfsWorkspace } from './components/PlfsWorkspace';
import { UfsOperationsWorkspace } from './components/UfsOperationsWorkspace';
import { UfsBlockLocator } from './components/UfsBlockLocator';
import { BlockBoundaryRecorder } from './components/BlockBoundaryRecorder';
import { AndroidAppModal } from './components/AndroidAppModal';
import { TOOLS, CATEGORIES } from './data/toolsData';
import {
  MapPin,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Briefcase,
  Layers,
  Sparkles,
  ExternalLink,
  Building2,
  FileSpreadsheet,
  Globe,
  Smartphone,
  ArrowLeft
} from 'lucide-react';

export function App() {
  const [activeView, setActiveView] = useState<string>('hub');
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);

  const handleToolSelect = (toolId: string) => {
    if (toolId === 'gis_property_survey') {
      setActiveView('gis-survey');
    } else if (['office_master', 'ta_da', 'daily_diary', 'tentative_program'].includes(toolId)) {
      setActiveView('office-master');
    } else if (['plfs', 'plfs_gateway', 'plfs_live'].includes(toolId)) {
      setActiveView('plfs');
    } else if (['ufs_weekly', 'ufs_monthly', 'ufs_action'].includes(toolId)) {
      setActiveView('ufs-ops');
    } else if (['ufs_block_locator', 'ufs_boundary_register', 'ufs_scrutiny', 'ufs_manual'].includes(toolId)) {
      setActiveView('ufs-locator');
    } else if (toolId === 'block_recorder') {
      setActiveView('block-recorder');
    } else if (['lat_long_kml', 'project_to_kml'].includes(toolId)) {
      setActiveView('wkt-kml');
    } else {
      setActiveView('tools-directory');
    }
  };

  return (
    <div className="min-h-screen bg-[#07161d] text-[#edf3fc] font-sans antialiased selection:bg-[#0e8a7d] selection:text-white">
      {/* Universal Topbar */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
      />

      {/* Android App Modal */}
      <AndroidAppModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
      />

      {/* Sub-view Header with Return Button when inside a tool */}
      {activeView !== 'hub' && activeView !== 'tools-directory' && (
        <div className="bg-[#0b1e25] border-b border-[#1b3d39] px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={() => setActiveView('hub')}
              className="text-xs font-bold text-[#9fc7c1] hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Hub Overview
            </button>
            <button
              onClick={() => setActiveView('tools-directory')}
              className="text-xs text-[#20b5a6] hover:underline flex items-center gap-1"
            >
              All Tools Catalog &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Main View Router */}
      {activeView === 'gis-survey' && (
        <GisPropertySurvey />
      )}

      {activeView === 'office-master' && (
        <OfficeBillsMaster />
      )}

      {activeView === 'plfs' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PlfsWorkspace />
        </div>
      )}

      {activeView === 'ufs-ops' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <UfsOperationsWorkspace />
        </div>
      )}

      {activeView === 'ufs-locator' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <UfsBlockLocator />
        </div>
      )}

      {activeView === 'block-recorder' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BlockBoundaryRecorder />
        </div>
      )}

      {activeView === 'wkt-kml' && (
        <WktKmlConverter />
      )}

      {activeView === 'tools-directory' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <ToolsDirectory onSelectTool={handleToolSelect} />
        </div>
      )}

      {activeView === 'hub' && (
        <main className="space-y-16 pb-20">
          {/* ========================================= */}
          {/* 1. HERO SECTION */}
          {/* ========================================= */}
          <section className="relative overflow-hidden bg-gradient-to-b from-[#0e2827] via-[#091f1e] to-[#07161d] pt-8 pb-14 border-b border-[#1b433e]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Hero Text */}
                <div className="lg:col-span-6 space-y-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b433e]/60 border border-[#23534d] text-xs font-semibold text-[#20b5a6]">
                      <span className="w-2 h-2 rounded-full bg-[#20b5a6] animate-pulse" />
                      Himachal Pradesh Field Survey Hub 2026
                    </span>

                    <button
                      onClick={() => setIsAndroidModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10b981]/20 border border-[#10b981]/50 text-xs font-bold text-[#10b981] hover:bg-[#10b981]/30 transition-colors"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      Get Android App
                    </button>
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                    Field survey work, <br />
                    <span className="text-[#20b5a6]">from boundary</span> <br />
                    <span className="text-[#f7dfae]">to bill.</span>
                  </h1>

                  <p className="text-sm sm:text-base text-[#c5d8df] leading-relaxed max-w-xl">
                    Locate blocks, check listings, log weekly progress, prepare tour bills and survey urban properties. Made for field operations in Himachal Pradesh with offline browser storage, AMRUT-grade GIS ward boundary digitizing, and Shapefile exports.
                  </p>

                  {/* Hero CTAs */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => setActiveView('gis-survey')}
                      className="bg-[#0e8a7d] hover:bg-[#11a394] text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-transform active:scale-95"
                    >
                      <Building2 className="w-4 h-4 text-[#f7dfae]" />
                      Open Property Survey Tool
                      <span className="bg-[#d6a34b] text-[#142238] font-black text-[9px] px-1.5 py-0.5 rounded uppercase">
                        AMRUT GIS
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveView('tools-directory')}
                      className="bg-[#142831] hover:bg-[#1b3642] text-white text-xs sm:text-sm font-semibold px-4 py-3 rounded-xl border border-[#23534d] flex items-center gap-2 transition-colors"
                    >
                      Explore All 14 Field Tools
                      <ArrowRight className="w-3.5 h-3.5 text-[#9fc7c1]" />
                    </button>
                  </div>

                  {/* Facts Tagline */}
                  <div className="pt-2 text-xs text-[#9fc7c1] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#20b5a6] flex-none" />
                    <span>
                      {TOOLS.length} tools across {CATEGORIES.length} work areas · Pre-loaded with ward outlines for 67 Himachal Pradesh urban bodies.
                    </span>
                  </div>
                </div>

                {/* Hero Interactive Terrain Map Canvas */}
                <div className="lg:col-span-6">
                  <HeroTerrain />
                </div>
              </div>
            </div>
          </section>

          {/* ========================================= */}
          {/* 2. PROPERTY SURVEY SHOWCASE SECTION */}
          {/* ========================================= */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" id="property">
            <div className="bg-gradient-to-tr from-[#0d222b] via-[#0f2832] to-[#12313d] border border-[#1d434c] rounded-3xl p-6 sm:p-10 shadow-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-5">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#0e8a7d]/20 border border-[#0e8a7d] text-[#20b5a6] text-xs font-bold uppercase tracking-wider">
                    Full AMRUT 2.0 Compliance
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                    Survey every property in an urban body, ward by ward.
                  </h2>

                  <p className="text-xs sm:text-sm text-[#c5d8df] leading-relaxed">
                    Pick your town and the ward map is already there. Record each property, measure plinth areas per floor, drop a high-accuracy geo-tag, digitize ward boundaries, and export production-ready ESRI Shapefiles.
                  </p>

                  <div className="space-y-3 text-xs sm:text-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-[#0e8a7d]/30 text-[#20b5a6] flex items-center justify-center font-bold flex-none mt-0.5">
                        ✓
                      </div>
                      <div>
                        <strong className="text-white block">Pre-loaded Ward Boundaries</strong>
                        <span className="text-[#9fc7c1]">Outlines for 67 urban bodies and 572 wards built directly into the application.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-[#0e8a7d]/30 text-[#20b5a6] flex items-center justify-center font-bold flex-none mt-0.5">
                        ✓
                      </div>
                      <div>
                        <strong className="text-white block">Digitize &amp; Edit Ward Polygons</strong>
                        <span className="text-[#9fc7c1]">Add, edit vertices, split boundaries, and validate topology (no self-intersections or bow-ties).</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-[#0e8a7d]/30 text-[#20b5a6] flex items-center justify-center font-bold flex-none mt-0.5">
                        ✓
                      </div>
                      <div>
                        <strong className="text-white block">Full AMRUT Schema &amp; Shapefile Export</strong>
                        <span className="text-[#9fc7c1]">Generates .shp, .shx, .dbf, .prj with area calculations, perimeter, and UTM Zone 43N CRS.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-[#0e8a7d]/30 text-[#20b5a6] flex items-center justify-center font-bold flex-none mt-0.5">
                        ✓
                      </div>
                      <div>
                        <strong className="text-white block">Municipal Tax Assessment Form-A &amp; Form-E</strong>
                        <span className="text-[#9fc7c1]">Automatic rateable value factors (F1 to F5) and annual property tax estimation.</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setActiveView('gis-survey')}
                      className="bg-[#0e8a7d] hover:bg-[#11a394] text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2"
                    >
                      Launch GIS Survey Suite
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveView('tools-directory')}
                      className="text-xs text-[#9fc7c1] hover:text-white underline font-semibold"
                    >
                      See All 14 Field Tools
                    </button>
                  </div>
                </div>

                {/* Interactive Preview Canvas / Card */}
                <div className="lg:col-span-6 bg-[#091a1f] border border-[#23534d] rounded-2xl p-5 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1b3d39] pb-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#20b5a6]" />
                      <strong className="text-white font-mono">Bhota Municipal Council · Wards 1 to 7</strong>
                    </div>
                    <span className="text-[#f7dfae] font-mono text-[11px]">CRS: WGS84 / UTM 43N</span>
                  </div>

                  {/* Bhota 7-Ward Vector Diagram */}
                  <div className="relative bg-[#07161d] rounded-xl p-3 border border-[#18393f] flex items-center justify-center">
                    <svg className="w-full h-64 max-w-sm" viewBox="0 0 274 420" role="img" aria-label="Bhota Wards">
                      <path className="fill-[#0e8a7d]/30 stroke-[#20b5a6] stroke-2 hover:fill-[#0e8a7d]/50 transition-colors" d="M137 97L132 84L131 72L132 60L135 49L148 25L159 10L199 12L211 16L222 19L226 25L233 45L245 66L244 71L240 77L228 92L229 101L233 112L242 116L249 117L254 121L258 131L258 136L242 144L236 145L206 146L197 151L193 146L185 153L180 155L169 156L159 152L153 153L150 150L151 144L151 134L148 123L149 121L148 111L142 105L137 97Z">
                        <title>Bhota Ward 1</title>
                      </path>
                      <path className="fill-[#0e8a7d]/20 stroke-[#20b5a6] stroke-2" d="M122 94L134 90L137 97L142 105L148 111L149 121L148 123L151 134L151 144L150 150L148 152L145 150L134 150L130 148L117 132L99 132L102 116L108 107L122 94Z" />
                      <path className="fill-[#0e8a7d]/25 stroke-[#20b5a6] stroke-2" d="M173 159L164 160L148 170L139 180L129 188L125 190L95 190L84 194L81 197L79 201L80 215L86 226L93 236L93 240L91 242L89 242L83 230L73 214L69 205L68 202L71 197L80 194L82 166L80 160L79 142L83 133L99 132L117 132L124 139L126 144L134 150L145 150L148 152L150 150L153 153L159 152L169 156L180 155L178 159L173 159Z" />
                      <path className="fill-[#0e8a7d]/15 stroke-[#20b5a6] stroke-2" d="M14 171L41 156L62 153L80 160L82 166L80 194L71 197L68 202L69 205L73 214L83 230L95 252L103 272L121 308L116 338L109 359L107 372L101 387L93 397L84 406L58 410L47 407L31 387L34 349L41 326L42 308L24 282L19 268L10 265L13 256L20 246L19 237L22 229L19 222L13 172L14 171Z" />
                      <path className="fill-[#0e8a7d]/20 stroke-[#20b5a6] stroke-2" d="M79 201L84 194L95 190L125 190L129 188L139 180L147 171L148 174L144 183L142 191L146 196L150 222L154 229L152 231L144 229L140 234L134 234L122 238L110 233L104 233L93 236L86 226L80 215L79 201Z" />
                      <path className="fill-[#0e8a7d]/30 stroke-[#20b5a6] stroke-2" d="M141 307L121 308L89 242L93 240L93 236L104 233L110 233L122 238L134 234L140 234L144 229L152 231L154 229L150 222L146 196L142 191L144 183L148 174L147 171L164 160L178 159L181 162L182 165L179 175L173 190L174 201L176 210L175 213L170 218L168 218L162 216L162 220L154 234L157 241L164 247L165 249L162 258L164 267L166 291L163 296L155 303L141 307Z" />
                      <path className="fill-[#0e8a7d]/20 stroke-[#20b5a6] stroke-2" d="M165 217L168 218L170 218L175 213L176 210L174 201L173 190L179 175L182 165L181 162L178 159L180 155L185 153L193 146L197 151L206 146L236 145L242 144L256 137L261 151L263 165L262 177L264 187L262 195L257 200L249 206L240 215L239 226L236 244L229 260L217 273L193 284L181 292L163 296L166 291L164 267L162 258L165 249L164 247L157 241L154 234L162 220L162 216L165 217Z" />

                      {/* Ward Labels */}
                      <text x="191" y="106" fill="#fff" fontSize="13" fontWeight="bold">W1</text>
                      <text x="134" y="129" fill="#fff" fontSize="13" fontWeight="bold">W2</text>
                      <text x="114" y="184" fill="#fff" fontSize="13" fontWeight="bold">W3</text>
                      <text x="58" y="274" fill="#fff" fontSize="13" fontWeight="bold">W4</text>
                      <text x="122" y="214" fill="#fff" fontSize="13" fontWeight="bold">W5</text>
                      <text x="150" y="232" fill="#fff" fontSize="13" fontWeight="bold">W6</text>
                      <text x="199" y="212" fill="#fff" fontSize="13" fontWeight="bold">W7</text>

                      {/* Sample Geo-tagged Property Structure Pins */}
                      <circle cx="205" cy="87" r="5" fill="#d6a34b" stroke="#fff" strokeWidth="1.5" />
                      <circle cx="98" cy="191" r="5" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
                      <circle cx="68" cy="287" r="5" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
                      <circle cx="142" cy="211" r="5" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
                      <circle cx="211" cy="217" r="5" fill="#d6a34b" stroke="#fff" strokeWidth="1.5" />
                    </svg>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#9fc7c1] pt-1">
                    <span>Export Formats:</span>
                    <span className="font-mono text-white font-bold">SHP · KML · GeoJSON · CSV · PDF</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================= */}
          {/* 3. FIELD TOOLS DIRECTORY */}
          {/* ========================================= */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ToolsDirectory onSelectTool={handleToolSelect} />
          </div>

          {/* ========================================= */}
          {/* 4. SURVEY INDICES */}
          {/* ========================================= */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SurveyIndices />
          </div>

          {/* ========================================= */}
          {/* 5. RELEASES & ADVANCE CALENDAR */}
          {/* ========================================= */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ReleasesSection />
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-[#1b3d39] bg-[#051117] text-[#9fc7c1] py-10 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#c8372a] flex items-center justify-center font-bold text-white text-xs">
                FO
              </div>
              <span className="font-bold text-white text-sm">Scheme Hub 2026</span>
              <span>· Field Operations &amp; GIS Suite</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAndroidModalOpen(true)}
                className="text-[#10b981] font-bold hover:underline flex items-center gap-1"
              >
                <Smartphone className="w-3.5 h-3.5" /> Android App Install
              </button>
              <span className="text-[11px] text-[#7ea19b]">
                Updated for HP Field Operations &amp; Municipal Surveys · 2026
              </span>
            </div>
          </div>

          <p className="leading-relaxed text-[11px] text-[#7ea19b]">
            <strong>Disclaimer:</strong> This is an independent tool suite, not an official government portal. Publisher names (e.g. MoSPI, Department of Economics &amp; Statistics Himachal Pradesh) appear only to credit public data sources. All survey parameters and bye-laws should be verified with your respective Urban Local Body prior to final submission.
          </p>
        </div>
      </footer>
    </div>
  );
}
export default App;
