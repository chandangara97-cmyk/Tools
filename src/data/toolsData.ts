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
  { id: 'property', name: 'Property Survey · GIS', full: 'Urban body property survey', blurb: 'Ward map • Properties • Areas • Export', color: '#be123c' },
  { id: 'tools', name: 'Tools & Converters', full: 'Tools & Converters', blurb: 'KML • Shapefile • Coordinates', color: '#7c3aed' },
];

export const TOOLS: ToolItem[] = [

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
