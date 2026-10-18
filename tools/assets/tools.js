/* Single source of truth for every page in the tools hub.
   The hub (index.html) and the floating quick-nav (hub-nav.js) both read this list.
   To add a new tool: copy its .html file into the project root and add ONE entry below. */
window.NSO_CATEGORIES = [
  { id: 'property',name: 'Property Survey · GIS',      full: 'Urban body property survey',        blurb: 'Ward map • Properties • Areas • Export', color: '#be123c' },
  { id: 'tools',  name: 'Tools & Converters',         full: 'Tools & Converters',                blurb: 'KML • Shapefile • Coordinates',    color: '#7c3aed' }
];

window.NSO_TOOLS = [

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
