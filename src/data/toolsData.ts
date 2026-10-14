export interface Category {
  id: string;
  name: string;
  full: string;
  blurb: string;
  color: string;
}

export interface ToolItem {
  id: string;
  file: string;
  cat: string;
  icon: string;
  title: string;
  type: string;
  desc: string;
  use: string;
  keys: string;
  isNew?: boolean;
  featured?: boolean;
  status?: string;
}

export const CATEGORIES: Category[] = [
  { id: 'plfs', name: 'PLFS', full: 'Periodic Labour Force Survey', blurb: 'Data collection & monitoring', color: '#2563eb' },
  { id: 'ufs-ops', name: 'UFS · Progress & Planning', full: 'Urban Frame Survey — field progress', blurb: 'Weekly • Monthly • Action plan', color: '#059669' },
  { id: 'ufs-geo', name: 'UFS · Blocks & Boundaries', full: 'Urban Frame Survey — frame work', blurb: 'Locate • Record • Register • Scrutinise', color: '#0d9488' },
  { id: 'office', name: 'Office & Bills', full: 'Office & Bills', blurb: 'TA/DA • Diary • Tour programme', color: '#b45309' },
  { id: 'property', name: 'Property Survey · GIS', full: 'Urban body property survey', blurb: 'Ward map • Properties • Areas • Export', color: '#be123c' },
  { id: 'tools', name: 'Tools & Converters', full: 'Tools & Converters', blurb: 'KML • Shapefile • Coordinates', color: '#7c3aed' },
];

export const TOOLS: ToolItem[] = [
  /* ---------- PLFS ---------- */
  {
    id: 'plfs_gateway',
    file: 'plfs_gateway.html',
    cat: 'plfs',
    icon: 'dashboard',
    title: 'PLFS Gateway',
    type: 'Dashboard',
    desc: 'Main entry point for PLFS — routes you to monitoring, tracking and field-operations screens.',
    use: 'You are starting PLFS work and are not sure which screen you need.',
    keys: 'plfs gateway dashboard start survey monitoring tracking field operations'
  },
  {
    id: 'plfs',
    file: 'plfs.html',
    cat: 'plfs',
    icon: 'file',
    title: 'PLFS Command Dashboard',
    type: 'Dashboard',
    desc: 'PLFS working dashboard for field visit tracking and review — skips the gateway screen.',
    use: 'You already know you need the PLFS page itself, not the router.',
    keys: 'plfs page direct data entry survey visit tracking'
  },
  {
    id: 'plfs_live',
    file: 'plfs_live_dashboard.html',
    cat: 'plfs',
    icon: 'pulse',
    title: 'PLFS Live Stats',
    type: 'Dashboard',
    status: 'soon',
    desc: 'MoSPI bulletin numbers charted — LFPR / WPR / UR trend plus quarterly employment and industry mix.',
    use: 'You need the national PLFS results visualised, not your own field data.',
    keys: 'plfs live stats dashboard mospi findings lfpr wpr ur charts visualisation'
  },

  /* ---------- UFS: progress & planning ---------- */
  {
    id: 'ufs_weekly',
    file: 'ufs_weekly.html',
    cat: 'ufs-ops',
    icon: 'calendar',
    title: 'UFS Weekly',
    type: 'Progress log',
    desc: 'Log and review weekly field progress and updates.',
    use: 'You are recording this week’s field status.',
    keys: 'ufs weekly progress field updates monitoring log report'
  },
  {
    id: 'ufs_monthly',
    file: 'ufs_monthly.html',
    cat: 'ufs-ops',
    icon: 'chart',
    title: 'UFS Monthly MPR',
    type: 'Summary report',
    desc: 'Monthly progress report that builds from the weekly reports, with room for SRO extras.',
    use: 'You need the month-end summary, not daily detail.',
    keys: 'ufs monthly progress dashboard summary reports'
  },
  {
    id: 'ufs_action',
    file: 'ufs_action.html',
    cat: 'ufs-ops',
    icon: 'target',
    title: 'UFS Progress & Action Plan',
    type: 'Planner',
    desc: 'Set targets, plan tours and track team-wise progress.',
    use: 'You are planning ahead, not logging what already happened.',
    keys: 'ufs action plan targets tours team progress planning'
  },

  /* ---------- UFS: blocks & boundaries ---------- */
  {
    id: 'ufs_block_locator',
    file: 'ufs_block_locator.html',
    cat: 'ufs-geo',
    icon: 'pin',
    title: 'UFS Block Locator',
    type: 'Locator tool',
    desc: 'Match GPS coordinates to a boundary — get town / IV and North-East-South-West plus listing tools.',
    use: 'You have a GPS point in the field and need to know which block it falls in.',
    keys: 'ufs block locator gps boundary match town north east south west listing map'
  },
  {
    id: 'ufs_boundary_register',
    file: 'ufs_boundary_register.html',
    cat: 'ufs-geo',
    icon: 'layers',
    title: 'UFS Boundary Register',
    type: 'Register',
    isNew: true,
    desc: 'Browse FC18 and FC19 frames by Town → IV → Block. Download boundary KML as a password-protected ZIP; collect picks in a tray.',
    use: 'You need the boundary KML of a block, an IV or a whole town.',
    keys: 'ufs boundary register fc18 fc19 frame town iv block kml zip download password tray map'
  },
  {
    id: 'ufs_scrutiny',
    file: 'ufs_scrutiny.html',
    cat: 'ufs-geo',
    icon: 'check',
    title: 'UFS Scrutiny Tool',
    type: 'Validator',
    isNew: true,
    desc: 'Pick a survey folder (several towns at once) and run listing and boundary checks. Results export to Excel. Runs in your browser — no upload.',
    use: 'You have portal exports and QGIS files and want to catch listing or boundary errors before submission.',
    keys: 'ufs scrutiny validate check listing boundary households landmark overlap shapefile dbf xls report excel multi town'
  },
  {
    id: 'block_recorder',
    file: 'block-boundary-recorder.html',
    cat: 'ufs-geo',
    icon: 'mic',
    title: 'Block Description Entry',
    type: 'Data entry',
    desc: 'Enter and review UFS Baddi block descriptions by direction (N / E / S / W).',
    use: 'You need to record or check the boundary description of a block.',
    keys: 'ufs block boundary recorder voice hands-free household owner structure ward iv unit north east south west record'
  },
  {
    id: 'ufs_manual',
    file: 'ufs_block_finder_mannual.html',
    cat: 'ufs-geo',
    icon: 'book',
    title: 'UFS Block Finder Manual',
    type: 'Guide',
    desc: 'Offline step-by-step instructions for the Block Locator workflow.',
    use: 'You are stuck on Block Locator and need the how-to, not the tool itself.',
    keys: 'ufs block finder manual instructions offline guide help'
  },

  /* ---------- Office & Bills ---------- */
  {
    id: 'office_master',
    file: 'office_bills_master.html',
    cat: 'office',
    icon: 'briefcase',
    title: 'Office & Bills Master',
    type: 'Workspace',
    isNew: true,
    featured: true,
    desc: 'TA/DA sheet, Daily Diary and Tentative Program in one workspace. Enter a tour once and it flows to all three, with Hindi entries, named save slots and backup text.',
    use: 'You are preparing the month’s tour bills and want the three documents to stay in sync.',
    keys: 'office bills master ta da tada diary tentative program tour wizard hindi sync save backup voice'
  },
  {
    id: 'ta_da',
    file: 'ta_da.html',
    cat: 'office',
    icon: 'calc',
    title: 'TA / DA Sheet',
    type: 'Calculator',
    desc: 'Calculate travelling and daily allowance, then print or export with one-page A4 landscape fit.',
    use: 'You only need the stand-alone bill sheet.',
    keys: 'ta da tada bill calculation print export travel allowance'
  },
  {
    id: 'daily_diary',
    file: 'daily_diary.html',
    cat: 'office',
    icon: 'book',
    title: 'Daily Diary',
    type: 'Diary',
    desc: 'Calendar diary for tours and daily entries, with a print-ready format.',
    use: 'You only need the stand-alone diary.',
    keys: 'daily diary calendar tours quick clicks print ready'
  },
  {
    id: 'tentative_program',
    file: 'tentative_program.html',
    cat: 'office',
    icon: 'calendar',
    title: 'Tentative Program (PDF print)',
    type: 'Print helper',
    desc: 'Load a tentative tour programme PDF and print it exactly as it is on A4 landscape.',
    use: 'You already have the programme as a PDF and just need a clean print.',
    keys: 'tentative program create edit print a4 tour'
  },

  /* ---------- Property survey ---------- */
  {
    id: 'gis_property_survey',
    file: 'gis_property_survey.html',
    cat: 'property',
    icon: 'building',
    title: 'GIS Property Survey Tool',
    type: 'Survey workspace',
    isNew: true,
    featured: true,
    desc: 'Property-by-property survey & AMRUT-grade GIS ward boundary digitizer for urban bodies. Ward outlines for 67 towns, vertex editing, topology checks, Form-A/E assessment, and Shapefile/KML/GeoJSON export.',
    use: 'You are surveying properties in an urban body or surveying/validating municipal ward boundaries with GIS deliverables.',
    keys: 'gis property survey tax assessment urban body town ward map geo tag area use bye-law records summary export csv json shapefile shp kml amrut'
  },

  /* ---------- Tools ---------- */
  {
    id: 'lat_long_kml',
    file: 'lat_long__KML.html',
    cat: 'tools',
    icon: 'compass',
    title: 'Bulk WKT → KML',
    type: 'Converter',
    desc: 'Paste or upload MULTIPOLYGON (WKT) rows. Block, ward and IV numbers are detected automatically and all KMLs download in one ZIP.',
    use: 'You have WKT polygon rows from QGIS and need named KML files for Google Earth.',
    keys: 'lat long wkt multipolygon kml convert coordinates bulk zip block ward iv boundary'
  },
  {
    id: 'project_to_kml',
    file: 'project_to_kml.html',
    cat: 'tools',
    icon: 'map',
    title: 'Shapefile → Town-wise KML',
    type: 'Converter',
    desc: 'Upload shapefiles directly and export KMLs grouped under town folders.',
    use: 'You have QGIS shapefiles and need town-wise KML folders.',
    keys: 'project shapefile shp dbf kml convert town folders zip'
  }
];
