/* Single source of truth for every page in the tools hub.
   The hub (index.html) and the floating quick-nav (hub-nav.js) both read this list.
   To add a new tool: copy its .html file into the project root and add ONE entry below. */
window.NSO_CATEGORIES = [
  { id: 'plfs',   name: 'PLFS',                       full: 'Periodic Labour Force Survey',      blurb: 'Data collection & monitoring', color: '#2563eb' },
  { id: 'ufs-ops',name: 'UFS · Progress & Planning',  full: 'Urban Frame Survey — field progress', blurb: 'Weekly • Monthly • Action plan',   color: '#059669' },
  { id: 'ufs-geo',name: 'UFS · Blocks & Boundaries',  full: 'Urban Frame Survey — frame work',   blurb: 'Locate • Record • Register • Scrutinise', color: '#0d9488' },
  { id: 'office', name: 'Office & Bills',             full: 'Office & Bills',                    blurb: 'TA/DA • Diary • Tour programme',   color: '#b45309' },
  { id: 'property',name: 'Property Survey · GIS',      full: 'Urban body property survey',        blurb: 'Ward map • Properties • Areas • Export', color: '#be123c' },
  { id: 'tools',  name: 'Tools & Converters',         full: 'Tools & Converters',                blurb: 'KML • Shapefile • Coordinates',    color: '#7c3aed' }
];

window.NSO_TOOLS = [
  /* ---------- PLFS ---------- */
  { id:'plfs_gateway', file:'plfs_gateway.html', cat:'plfs', icon:'dashboard', title:'PLFS Gateway', type:'Dashboard',
    desc:'Main entry point for PLFS — routes you to monitoring, tracking and field-operations screens.',
    use:'You are starting PLFS work and are not sure which screen you need.',
    keys:'plfs gateway dashboard start survey monitoring tracking field operations' },
  { id:'plfs', file:'plfs.html', cat:'plfs', icon:'file', title:'PLFS Command Dashboard', type:'Dashboard',
    desc:'PLFS working dashboard for field visit tracking and review — skips the gateway screen.',
    use:'You already know you need the PLFS page itself, not the router.',
    keys:'plfs page direct data entry survey visit tracking' },
  { id:'plfs_live', file:'plfs_live_dashboard.html', cat:'plfs', icon:'pulse', title:'PLFS Live Stats', type:'Dashboard', status:'soon',
    desc:'MoSPI bulletin numbers charted — LFPR / WPR / UR trend plus quarterly employment and industry mix.',
    use:'You need the national PLFS results visualised, not your own field data.',
    keys:'plfs live stats dashboard mospi findings lfpr wpr ur charts visualisation' },

  /* ---------- UFS: progress & planning ---------- */
  { id:'ufs_weekly', file:'ufs_weekly.html', cat:'ufs-ops', icon:'calendar', title:'UFS Weekly', type:'Progress log',
    desc:'Log and review weekly field progress and updates.',
    use:'You are recording this week’s field status.',
    keys:'ufs weekly progress field updates monitoring log report' },
  { id:'ufs_monthly', file:'ufs_monthly.html', cat:'ufs-ops', icon:'chart', title:'UFS Monthly MPR', type:'Summary report',
    desc:'Monthly progress report that builds from the weekly reports, with room for SRO extras.',
    use:'You need the month-end summary, not daily detail.',
    keys:'ufs monthly progress dashboard summary reports' },
  { id:'ufs_action', file:'ufs_action.html', cat:'ufs-ops', icon:'target', title:'UFS Progress & Action Plan', type:'Planner',
    desc:'Set targets, plan tours and track team-wise progress.',
    use:'You are planning ahead, not logging what already happened.',
    keys:'ufs action plan targets tours team progress planning' },

  /* ---------- UFS: blocks & boundaries ---------- */
  { id:'ufs_block_locator', file:'ufs_block_locator.html', cat:'ufs-geo', icon:'pin', title:'UFS Block Locator', type:'Locator tool',
    desc:'Match GPS coordinates to a boundary — get town / IV and North-East-South-West plus listing tools.',
    use:'You have a GPS point in the field and need to know which block it falls in.',
    keys:'ufs block locator gps boundary match town north east south west listing map' },
  { id:'ufs_boundary_register', file:'ufs_boundary_register.html', cat:'ufs-geo', icon:'layers', title:'UFS Boundary Register', type:'Register', isNew:true,
    desc:'Browse FC18 and FC19 frames by Town → IV → Block. Download boundary KML as a password-protected ZIP; collect picks in a tray.',
    use:'You need the boundary KML of a block, an IV or a whole town.',
    keys:'ufs boundary register fc18 fc19 frame town iv block kml zip download password tray map' },
  { id:'ufs_scrutiny', file:'ufs_scrutiny.html', cat:'ufs-geo', icon:'check', title:'UFS Scrutiny Tool', type:'Validator', isNew:true,
    desc:'Pick a survey folder (several towns at once) and run listing and boundary checks. Results export to Excel. Runs in your browser — no upload.',
    use:'You have portal exports and QGIS files and want to catch listing or boundary errors before submission.',
    keys:'ufs scrutiny validate check listing boundary households landmark overlap shapefile dbf xls report excel multi town' },
  { id:'block_recorder', file:'block-boundary-recorder.html', cat:'ufs-geo', icon:'mic', title:'Block Description Entry', type:'Data entry',
    desc:'Enter and review UFS Baddi block descriptions by direction (N / E / S / W).',
    use:'You need to record or check the boundary description of a block.',
    keys:'ufs block boundary recorder voice hands-free household owner structure ward iv unit north east south west record' },
  { id:'ufs_manual', file:'ufs_block_finder_mannual.html', cat:'ufs-geo', icon:'book', title:'UFS Block Finder Manual', type:'Guide',
    desc:'Offline step-by-step instructions for the Block Locator workflow.',
    use:'You are stuck on Block Locator and need the how-to, not the tool itself.',
    keys:'ufs block finder manual instructions offline guide help' },

  /* ---------- Office & Bills ---------- */
  { id:'office_master', file:'office_bills_master.html', cat:'office', icon:'briefcase', title:'Office & Bills Master', type:'Workspace', isNew:true, featured:true,
    desc:'TA/DA sheet, Daily Diary and Tentative Program in one workspace. Enter a tour once and it flows to all three, with Hindi entries, named save slots and backup text.',
    use:'You are preparing the month’s tour bills and want the three documents to stay in sync.',
    keys:'office bills master ta da tada diary tentative program tour wizard hindi sync save backup voice' },
  { id:'ta_da', file:'ta_da.html', cat:'office', icon:'calc', title:'TA / DA Sheet', type:'Calculator',
    desc:'Calculate travelling and daily allowance, then print or export.',
    use:'You only need the stand-alone bill sheet.',
    keys:'ta da tada bill calculation print export travel allowance' },
  { id:'daily_diary', file:'daily_diary.html', cat:'office', icon:'book', title:'Daily Diary', type:'Diary',
    desc:'Calendar diary for tours and daily entries, with a print-ready format.',
    use:'You only need the stand-alone diary.',
    keys:'daily diary calendar tours quick clicks print ready' },
  { id:'tentative_program', file:'tentative_program.html', cat:'office', icon:'calendar', title:'Tentative Program (PDF print)', type:'Print helper',
    desc:'Load a tentative tour programme PDF and print it exactly as it is on A4 landscape.',
    use:'You already have the programme as a PDF and just need a clean print.',
    keys:'tentative program create edit print a4 tour' },

  /* ---------- Property survey ---------- */
  { id:'gis_property_survey', file:'gis_property_survey.html', cat:'property', icon:'building', title:'GIS Property Survey Tool', type:'Survey workspace', isNew:true, featured:true,
    desc:'Property-by-property survey for an urban body. Ward boundaries are built in; record each property, its use and areas, geo-tag it on the ward map and export to JSON or CSV.',
    use:'You are surveying properties in an urban body and need records, area totals and a ward-wise progress view.',
    keys:'gis property survey tax assessment urban body town ward map geo tag area use bye-law records summary export csv json firebase sync' },

  /* ---------- Tools ---------- */
  { id:'lat_long_kml', file:'lat_long__KML.html', cat:'tools', icon:'compass', title:'Bulk WKT → KML', type:'Converter',
    desc:'Paste or upload MULTIPOLYGON (WKT) rows. Block, ward and IV numbers are detected automatically and all KMLs download in one ZIP.',
    use:'You have WKT polygon rows from QGIS and need named KML files for Google Earth.',
    keys:'lat long wkt multipolygon kml convert coordinates bulk zip block ward iv boundary' },
  { id:'project_to_kml', file:'project_to_kml.html', cat:'tools', icon:'map', title:'Shapefile → Town-wise KML', type:'Converter',
    desc:'Upload shapefiles directly and export KMLs grouped under town folders.',
    use:'You have QGIS shapefiles and need town-wise KML folders.',
    keys:'project shapefile shp dbf kml convert town folders zip' }
];

window.NSO_ICONS = {
  dashboard:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/>',
  pulse:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  chart:'<path d="M3 3v18h18"/><path d="M7 15v3M12 9v9M17 5v13"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  layers:'<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  check:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/>',
  book:'<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  calc:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01"/>',
  compass:'<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z"/>',
  map:'<path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4z"/><path d="M8 2v16M16 6v16"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  building:'<path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6M9 11h.01M15 11h.01"/>',
  home:'<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/>'
};
window.NSO_icon = function(name, size){
  return '<svg width="'+(size||20)+'" height="'+(size||20)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(window.NSO_ICONS[name]||window.NSO_ICONS.file)+'</svg>';
};
