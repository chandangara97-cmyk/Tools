// GIS calculations, projections, topology validation, and export generators

export interface Point2D {
  lng: number; // longitude (x)
  lat: number; // latitude (y)
}

export type CoordinateRing = [number, number][]; // [lng, lat]

export interface WardFeature {
  w: string;
  name?: string;
  rings: CoordinateRing[];
  properties?: Record<string, any>;
}

export interface TownData {
  n: string; // Town Name
  code?: string;
  type?: string;
  district?: string;
  w: WardFeature[];
}

export interface PropertyRecord {
  id: string;
  town: string;
  ward: string;
  sur: string;
  owner: string;
  hno: string;
  addr: string;
  use: 'Residential' | 'Commercial' | 'Mixed use' | 'Industrial' | 'Institutional' | 'Vacant land' | string;
  occ: string;
  str: string;
  yr: string;
  floors: number[];
  bu: number;
  land: number;
  act: string;
  zone: string;
  ncls: string;
  tenant: string;
  upn: string;
  lat: string;
  lng: string;
  acc: string;
  rem: string;
  date: string;
}

// ==========================================
// 1. Point in Polygon (Ray Casting Algorithm)
// ==========================================
export function pointInPolygon(lng: number, lat: number, ring: CoordinateRing): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];

    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function findWardForPoint(lng: number, lat: number, wards: WardFeature[]): string | null {
  for (const ward of wards) {
    if (!ward.rings || ward.rings.length === 0) continue;
    // Test outer ring
    if (pointInPolygon(lng, lat, ward.rings[0])) {
      return ward.w;
    }
  }
  return null;
}

// ==========================================
// 2. Geodesic Polygon Area & Perimeter
// ==========================================
const EARTH_RADIUS = 6378137; // WGS84 equatorial radius in metres

export function calculatePolygonAreaSqMeters(ring: CoordinateRing): number {
  if (ring.length < 3) return 0;
  let total = 0;
  const len = ring.length;

  for (let i = 0; i < len; i++) {
    const j = (i + 1) % len;
    const p1 = ring[i];
    const p2 = ring[j];

    const lambda1 = (p1[0] * Math.PI) / 180;
    const lambda2 = (p2[0] * Math.PI) / 180;
    const phi1 = (p1[1] * Math.PI) / 180;
    const phi2 = (p2[1] * Math.PI) / 180;

    total += (lambda2 - lambda1) * (2 + Math.sin(phi1) + Math.sin(phi2));
  }

  total = (total * EARTH_RADIUS * EARTH_RADIUS) / 4.0;
  return Math.abs(total);
}

export function calculatePerimeterMeters(ring: CoordinateRing): number {
  if (ring.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    perimeter += haversineDistanceMeters(
      ring[i][1], ring[i][0],
      ring[i + 1][1], ring[i + 1][0]
    );
  }
  return perimeter;
}

export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c;
}

// ==========================================
// 3. WGS84 to UTM Zone 43N Projection (Himachal Pradesh)
// ==========================================
export interface UtmCoordinate {
  easting: number;
  northing: number;
  zone: number;
  hemisphere: 'N' | 'S';
}

export function wgs84ToUtmZone43N(lon: number, lat: number): UtmCoordinate {
  const zone = 43; // Standard for Himachal Pradesh (~75°E to ~79°E)
  const a = 6378137.0; // WGS84 semi-major axis
  const f = 1 / 298.257223563; // WGS84 flattening
  const k0 = 0.9996; // scale factor
  const e2 = 2 * f - f * f;
  const ePrime2 = e2 / (1 - e2);

  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const centralLon = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);
  const dLon = lonRad - centralLon;

  const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
  const T = Math.tan(latRad) * Math.tan(latRad);
  const C = ePrime2 * Math.cos(latRad) * Math.cos(latRad);
  const A = Math.cos(latRad) * dLon;

  const M = a * (
    (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * latRad -
    (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * latRad) +
    (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * latRad) -
    (35 * e2 * e2 * e2 / 3072) * Math.sin(6 * latRad)
  );

  const easting = k0 * N * (
    A +
    (1 - T + C) * Math.pow(A, 3) / 6 +
    (5 - 18 * T + T * T + 72 * C - 58 * ePrime2) * Math.pow(A, 5) / 120
  ) + 500000;

  let northing = k0 * (
    M +
    N * Math.tan(latRad) * (
      Math.pow(A, 2) / 2 +
      (5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4) / 24 +
      (61 - 58 * T + T * T + 600 * C - 330 * ePrime2) * Math.pow(A, 6) / 720
    )
  );

  if (lat < 0) northing += 10000000; // False northing for southern hemisphere

  return {
    easting: Math.round(easting * 100) / 100,
    northing: Math.round(northing * 100) / 100,
    zone,
    hemisphere: 'N'
  };
}

// ==========================================
// 4. Topology Checks & Validation
// ==========================================
export interface TopologyCheckResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    vertexCount: number;
    areaSqKm: number;
    areaHectares: number;
    perimeterMeters: number;
    isClosed: boolean;
    selfIntersections: number;
  };
}

function doLinesIntersect(
  p1: [number, number], p2: [number, number],
  p3: [number, number], p4: [number, number]
): boolean {
  const ccw = (a: [number, number], b: [number, number], c: [number, number]) => {
    return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
  };
  return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
}

export function validateWardTopology(ring: CoordinateRing): TopologyCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!ring || ring.length < 3) {
    return {
      isValid: false,
      errors: ['Polygon has fewer than 3 vertices'],
      warnings: [],
      metrics: {
        vertexCount: ring ? ring.length : 0,
        areaSqKm: 0,
        areaHectares: 0,
        perimeterMeters: 0,
        isClosed: false,
        selfIntersections: 0,
      }
    };
  }

  const first = ring[0];
  const last = ring[ring.length - 1];
  const isClosed = Math.abs(first[0] - last[0]) < 1e-7 && Math.abs(first[1] - last[1]) < 1e-7;

  if (!isClosed) {
    warnings.push('Ring is not explicitly closed (first vertex != last vertex). Auto-closing ring for GIS standards.');
  }

  // Self-intersection check on non-adjacent edges
  let selfIntersections = 0;
  const n = ring.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 2; j < n - 1; j++) {
      if (i === 0 && j === n - 2) continue; // adjacent in closed loop
      if (doLinesIntersect(ring[i], ring[i + 1], ring[j], ring[j + 1])) {
        selfIntersections++;
      }
    }
  }

  if (selfIntersections > 0) {
    errors.push(`Polygon has ${selfIntersections} self-intersecting edge(s) (bow-tie geometry detected).`);
  }

  const areaSqM = calculatePolygonAreaSqMeters(ring);
  const areaSqKm = areaSqM / 1000000;
  const areaHectares = areaSqM / 10000;
  const perimeterM = calculatePerimeterMeters(ring);

  if (areaSqM < 100) {
    warnings.push('Warning: Very small polygon area (< 100 m²). Possible sliver polygon or digitized noise.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      vertexCount: ring.length,
      areaSqKm: Math.round(areaSqKm * 10000) / 10000,
      areaHectares: Math.round(areaHectares * 100) / 100,
      perimeterMeters: Math.round(perimeterM * 10) / 10,
      isClosed,
      selfIntersections,
    }
  };
}

// ==========================================
// 5. AMRUT-Standard GeoJSON Export
// ==========================================
export function exportAmrutGeoJson(townKey: string, townData: TownData, properties: PropertyRecord[]): string {
  const features: any[] = [];

  // 1. Boundary Features (Polygon)
  townData.w.forEach((w) => {
    const primaryRing = w.rings[0] || [];
    // Ensure ring is closed
    const closedRing = [...primaryRing];
    if (closedRing.length > 0) {
      const first = closedRing[0];
      const last = closedRing[closedRing.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        closedRing.push([first[0], first[1]]);
      }
    }

    const areaSqM = calculatePolygonAreaSqMeters(closedRing);
    const areaSqKm = areaSqM / 1000000;
    const areaHa = areaSqM / 10000;
    const perimM = calculatePerimeterMeters(closedRing);

    const wardProperties = properties.filter((p) => String(p.ward) === String(w.w));
    const totalBuiltUp = wardProperties.reduce((acc, p) => acc + (p.bu || 0), 0);

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [closedRing]
      },
      properties: {
        LAYER: 'MUNICIPAL_WARD_BOUNDARY',
        SCHEME: 'AMRUT_2.0_GIS_SUB_SCHEME',
        ULB_NAME: townData.n,
        ULB_CODE: townData.code || townKey.toUpperCase(),
        WARD_NO: String(w.w),
        WARD_NAME: w.name || `Ward ${w.w}`,
        SUB_CLASS: 'Ward Boundary',
        AREA_SQM: Math.round(areaSqM),
        AREA_SQKM: Number(areaSqKm.toFixed(4)),
        AREA_HA: Number(areaHa.toFixed(2)),
        PERIM_M: Math.round(perimM),
        PROP_COUNT: wardProperties.length,
        TOT_BUILTUP_SQM: Math.round(totalBuiltUp),
        PROJECTION: 'EPSG:4326 / UTM Zone 43N',
        SURVEY_DATE: new Date().toISOString().slice(0, 10),
      }
    });
  });

  // 2. Property Point Features (Point)
  properties.forEach((p) => {
    if (!p.lat || !p.lng) return;
    const lat = parseFloat(p.lat);
    const lng = parseFloat(p.lng);
    if (isNaN(lat) || isNaN(lng)) return;

    const utm = wgs84ToUtmZone43N(lng, lat);

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      properties: {
        LAYER: 'PROPERTY_PARCEL_SURVEY',
        PROPERTY_ID: p.id,
        UPN_NO: p.upn || '',
        WARD_NO: p.ward,
        OWNER_NAME: p.owner,
        HOUSE_PLOT_NO: p.hno,
        ADDRESS: p.addr,
        USE_TYPE: p.use,
        OCCUPANCY: p.occ,
        STRUCTURE: p.str,
        YEAR_BUILT: p.yr || '',
        TOTAL_BUILTUP_SQM: p.bu,
        LAND_AREA_SQM: p.land,
        ZONE: p.zone,
        SURVEYOR: p.sur,
        SURVEY_DATE: p.date,
        UTM_EASTING: utm.easting,
        UTM_NORTHING: utm.northing,
        GPS_ACCURACY_M: p.acc || 'N/A'
      }
    });
  });

  return JSON.stringify({
    type: 'FeatureCollection',
    name: `${townData.n}_AMRUT_GIS_Ward_and_Property_Survey`,
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
    },
    metadata: {
      generatedBy: 'Scheme Hub 2026 GIS Property Survey Suite',
      standard: 'AMRUT / Municipal GIS Design & Standards',
      datum: 'WGS84',
      projectedCrs: 'EPSG:32643 (UTM Zone 43N)',
      town: townData.n,
      date: new Date().toISOString()
    },
    features
  }, null, 2);
}

// ==========================================
// 6. AMRUT-Standard KML Export
// ==========================================
export function exportAmrutKml(townData: TownData, properties: PropertyRecord[]): string {
  const escapeXml = (str: any) => String(str ?? '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });

  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(townData.n)} - AMRUT Ward Boundaries &amp; Property Survey</name>
    <description>Official GIS Layer for ${escapeXml(townData.n)}, Himachal Pradesh conforming to AMRUT GIS specifications.</description>

    <Style id="wardPoly">
      <LineStyle>
        <color>ff0e8a7d</color>
        <width>2.5</width>
      </LineStyle>
      <PolyStyle>
        <color>330e8a7d</color>
      </PolyStyle>
    </Style>

    <Style id="propertyPoint">
      <IconStyle>
        <color>ff20b5a6</color>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>
        </Icon>
      </IconStyle>
    </Style>

    <Folder>
      <name>Ward Boundaries</name>
`;

  townData.w.forEach((w) => {
    const ring = w.rings[0] || [];
    if (!ring.length) return;
    const closedRing = [...ring];
    const first = closedRing[0];
    const last = closedRing[closedRing.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      closedRing.push([first[0], first[1]]);
    }

    const areaSqM = calculatePolygonAreaSqMeters(closedRing);
    const perimM = calculatePerimeterMeters(closedRing);
    const coordsStr = closedRing.map(p => `${p[0]},${p[1]},0`).join(' ');

    kml += `      <Placemark>
        <name>Ward ${escapeXml(w.w)} - ${escapeXml(w.name || townData.n)}</name>
        <styleUrl>#wardPoly</styleUrl>
        <ExtendedData>
          <Data name="ULB_NAME"><value>${escapeXml(townData.n)}</value></Data>
          <Data name="WARD_NO"><value>${escapeXml(w.w)}</value></Data>
          <Data name="SUB_CLASS"><value>Municipal Ward Boundary</value></Data>
          <Data name="AREA_SQ_KM"><value>${(areaSqM / 1e6).toFixed(4)}</value></Data>
          <Data name="AREA_HA"><value>${(areaSqM / 1e4).toFixed(2)}</value></Data>
          <Data name="PERIMETER_M"><value>${Math.round(perimM)}</value></Data>
        </ExtendedData>
        <Polygon>
          <extrude>1</extrude>
          <altitudeMode>clampToGround</altitudeMode>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsStr}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>
`;
  });

  kml += `    </Folder>

    <Folder>
      <name>Surveyed Properties</name>
`;

  properties.forEach((p) => {
    if (!p.lat || !p.lng) return;
    const lat = parseFloat(p.lat);
    const lng = parseFloat(p.lng);
    if (isNaN(lat) || isNaN(lng)) return;

    kml += `      <Placemark>
        <name>${escapeXml(p.id)} - ${escapeXml(p.owner)}</name>
        <styleUrl>#propertyPoint</styleUrl>
        <description><![CDATA[
          <b>Property ID:</b> ${escapeXml(p.id)}<br/>
          <b>Owner:</b> ${escapeXml(p.owner)}<br/>
          <b>House/Plot No:</b> ${escapeXml(p.hno)}<br/>
          <b>Ward:</b> ${escapeXml(p.ward)}<br/>
          <b>Use:</b> ${escapeXml(p.use)}<br/>
          <b>Built-up Area:</b> ${escapeXml(p.bu)} sq m<br/>
          <b>Land Area:</b> ${escapeXml(p.land)} sq m<br/>
          <b>Date:</b> ${escapeXml(p.date)}
        ]]></description>
        <Point>
          <coordinates>${lng},${lat},0</coordinates>
        </Point>
      </Placemark>
`;
  });

  kml += `    </Folder>
  </Document>
</kml>`;

  return kml;
}

// ==========================================
// 7. ESRI Shapefile Generator (.shp, .shx, .dbf, .prj)
// Pure TypeScript Implementation of ESRI Shapefile Technical Specification
// ==========================================
export interface ShapefilePackage {
  shp: Uint8Array;
  shx: Uint8Array;
  dbf: Uint8Array;
  prj: string;
}

// Projection string for WGS 84 / UTM Zone 43N
export const PRJ_WGS84_UTM_ZONE_43N =
  'PROJCS["WGS_1984_UTM_Zone_43N",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",75.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]';

export const PRJ_WGS84_GEOGRAPHIC =
  'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';

export function generateWardShapefiles(townData: TownData): ShapefilePackage {
  const wards = townData.w;

  // Pre-calculate bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const polyRecords: { ring: CoordinateRing; box: [number, number, number, number] }[] = [];

  wards.forEach((w) => {
    const rawRing = w.rings[0] || [];
    if (rawRing.length < 3) return;
    const ring = [...rawRing];
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]]);
    }

    let bMinX = Infinity, bMinY = Infinity, bMaxX = -Infinity, bMaxY = -Infinity;
    ring.forEach(([x, y]) => {
      if (x < bMinX) bMinX = x;
      if (y < bMinY) bMinY = y;
      if (x > bMaxX) bMaxX = x;
      if (y > bMaxY) bMaxY = y;
    });

    if (bMinX < minX) minX = bMinX;
    if (bMinY < minY) minY = bMinY;
    if (bMaxX > maxX) maxX = bMaxX;
    if (bMaxY > maxY) maxY = bMaxY;

    polyRecords.push({ ring, box: [bMinX, bMinY, bMaxX, bMaxY] });
  });

  if (minX === Infinity) {
    minX = 0; minY = 0; maxX = 0; maxY = 0;
  }

  // Calculate file sizes
  // Header: 100 bytes
  // Record header: 8 bytes
  // Polygon record: 4 + 32 + 4 + 4 + (numParts * 4) + (numPoints * 16) = 44 + 4 + numPoints * 16 = 48 + numPoints * 16 bytes
  let shpContentLengthWords = 50; // 100 bytes / 2
  const recordHeaders: { offsetWords: number; contentLenWords: number }[] = [];

  polyRecords.forEach((rec) => {
    const contentSizeBytes = 48 + rec.ring.length * 16;
    const contentLenWords = contentSizeBytes / 2;
    recordHeaders.push({
      offsetWords: shpContentLengthWords,
      contentLenWords,
    });
    shpContentLengthWords += 4 + contentLenWords; // 8 bytes header = 4 words
  });

  // --- 1. BUILD .SHP BUFFER ---
  const shpBuffer = new ArrayBuffer(shpContentLengthWords * 2);
  const shpView = new DataView(shpBuffer);

  // File code 9994 (Big Endian)
  shpView.setInt32(0, 9994, false);
  // File length in 16-bit words (Big Endian)
  shpView.setInt32(24, shpContentLengthWords, false);
  // Version 1000 (Little Endian)
  shpView.setInt32(28, 1000, true);
  // Shape Type 5 = Polygon (Little Endian)
  shpView.setInt32(32, 5, true);

  // Bounding Box (Little Endian)
  shpView.setFloat64(36, minX, true);
  shpView.setFloat64(44, minY, true);
  shpView.setFloat64(52, maxX, true);
  shpView.setFloat64(60, maxY, true);

  // Write Records
  let offsetBytes = 100;
  polyRecords.forEach((rec, idx) => {
    const recordNum = idx + 1;
    const contentSizeBytes = 48 + rec.ring.length * 16;
    const contentLenWords = contentSizeBytes / 2;

    // Record header
    shpView.setInt32(offsetBytes, recordNum, false);
    shpView.setInt32(offsetBytes + 4, contentLenWords, false);

    // Record content
    const cOffset = offsetBytes + 8;
    shpView.setInt32(cOffset, 5, true); // Shape type: Polygon (5)
    // Box
    shpView.setFloat64(cOffset + 4, rec.box[0], true);
    shpView.setFloat64(cOffset + 12, rec.box[1], true);
    shpView.setFloat64(cOffset + 20, rec.box[2], true);
    shpView.setFloat64(cOffset + 28, rec.box[3], true);
    // NumParts = 1
    shpView.setInt32(cOffset + 36, 1, true);
    // NumPoints
    shpView.setInt32(cOffset + 40, rec.ring.length, true);
    // Parts array (Part 0 starts at point index 0)
    shpView.setInt32(cOffset + 44, 0, true);

    // Points array
    let ptOffset = cOffset + 48;
    rec.ring.forEach(([px, py]) => {
      shpView.setFloat64(ptOffset, px, true);
      shpView.setFloat64(ptOffset + 8, py, true);
      ptOffset += 16;
    });

    offsetBytes += 8 + contentSizeBytes;
  });

  // --- 2. BUILD .SHX BUFFER (Index file) ---
  const shxContentLengthWords = 50 + polyRecords.length * 4;
  const shxBuffer = new ArrayBuffer(shxContentLengthWords * 2);
  const shxView = new DataView(shxBuffer);

  shxView.setInt32(0, 9994, false);
  shxView.setInt32(24, shxContentLengthWords, false);
  shxView.setInt32(28, 1000, true);
  shxView.setInt32(32, 5, true);
  shxView.setFloat64(36, minX, true);
  shxView.setFloat64(44, minY, true);
  shxView.setFloat64(52, maxX, true);
  shxView.setFloat64(60, maxY, true);

  recordHeaders.forEach((hdr, i) => {
    const recOffset = 100 + i * 8;
    shxView.setInt32(recOffset, hdr.offsetWords, false);
    shxView.setInt32(recOffset + 4, hdr.contentLenWords, false);
  });

  // --- 3. BUILD .DBF BUFFER (dBase III table) ---
  // AMRUT Schema:
  // WARD_NO (C, 10)
  // WARD_NAME (C, 30)
  // ULB_NAME (C, 30)
  // SUB_CLASS (C, 25)
  // AREA_SQKM (N, 12, 4)
  // AREA_HA (N, 12, 2)
  // PERIM_M (N, 12, 1)
  const fields = [
    { name: 'WARD_NO', type: 'C', len: 10, dec: 0 },
    { name: 'WARD_NAME', type: 'C', len: 30, dec: 0 },
    { name: 'ULB_NAME', type: 'C', len: 30, dec: 0 },
    { name: 'SUB_CLASS', type: 'C', len: 25, dec: 0 },
    { name: 'AREA_SQKM', type: 'N', len: 12, dec: 4 },
    { name: 'AREA_HA', type: 'N', len: 12, dec: 2 },
    { name: 'PERIM_M', type: 'N', len: 12, dec: 1 },
  ];

  const recordLength = 1 + fields.reduce((acc, f) => acc + f.len, 0); // 1 byte delete flag
  const headerLength = 32 + fields.length * 32 + 1; // +1 for terminator 0x0D
  const dbfLength = headerLength + polyRecords.length * recordLength + 1; // +1 for 0x1A EOF

  const dbfBuffer = new ArrayBuffer(dbfLength);
  const dbfView = new DataView(dbfBuffer);
  const dbfBytes = new Uint8Array(dbfBuffer);

  // DBF Header
  dbfView.setUint8(0, 0x03); // dBASE III without memo
  const now = new Date();
  dbfView.setUint8(1, now.getFullYear() - 1900);
  dbfView.setUint8(2, now.getMonth() + 1);
  dbfView.setUint8(3, now.getDate());
  dbfView.setUint32(4, polyRecords.length, true); // number of records
  dbfView.setUint16(8, headerLength, true); // header size
  dbfView.setUint16(10, recordLength, true); // record size

  // Write Field Descriptors
  fields.forEach((f, idx) => {
    const fOffset = 32 + idx * 32;
    // Field name (up to 11 bytes null-padded)
    for (let c = 0; c < 11; c++) {
      dbfView.setUint8(fOffset + c, c < f.name.length ? f.name.charCodeAt(c) : 0);
    }
    dbfView.setUint8(fOffset + 11, f.type.charCodeAt(0));
    dbfView.setUint8(fOffset + 16, f.len);
    dbfView.setUint8(fOffset + 17, f.dec);
  });
  dbfView.setUint8(32 + fields.length * 32, 0x0D); // Header terminator

  // Write Records
  let rOffset = headerLength;
  polyRecords.forEach((rec, idx) => {
    const wardObj = wards[idx];
    const areaSqM = calculatePolygonAreaSqMeters(rec.ring);
    const areaSqKm = (areaSqM / 1e6).toFixed(4);
    const areaHa = (areaSqM / 1e4).toFixed(2);
    const perimM = calculatePerimeterMeters(rec.ring).toFixed(1);

    dbfView.setUint8(rOffset, 0x20); // space = not deleted
    let colOffset = rOffset + 1;

    const writeCol = (val: string, len: number) => {
      const padded = val.padEnd(len, ' ').slice(0, len);
      for (let c = 0; c < len; c++) {
        dbfBytes[colOffset + c] = padded.charCodeAt(c);
      }
      colOffset += len;
    };

    writeCol(String(wardObj.w || ''), 10);
    writeCol(wardObj.name || `Ward ${wardObj.w}`, 30);
    writeCol(townData.n, 30);
    writeCol('Ward Boundary', 25);
    writeCol(areaSqKm, 12);
    writeCol(areaHa, 12);
    writeCol(perimM, 12);

    rOffset += recordLength;
  });

  dbfView.setUint8(rOffset, 0x1A); // EOF

  return {
    shp: new Uint8Array(shpBuffer),
    shx: new Uint8Array(shxBuffer),
    dbf: new Uint8Array(dbfBuffer),
    prj: PRJ_WGS84_GEOGRAPHIC,
  };
}

// Download helper: browser download on the web, Save/Share sheet inside the Android app
// (Android WebView ignores <a download>, so native builds write to cache and open the share sheet).
let nativeQueue: Promise<void> = Promise.resolve();

async function nativeSave(content: Blob | string | Uint8Array, fileName: string, mimeType: string) {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  let bytes: Uint8Array;
  if (typeof content === 'string') bytes = new TextEncoder().encode(content);
  else if (content instanceof Uint8Array) bytes = content;
  else bytes = new Uint8Array(await content.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  const written = await Filesystem.writeFile({
    path: fileName,
    data: btoa(bin),
    directory: Directory.Cache,
  });
  try {
    await Share.share({ title: fileName, url: written.uri, dialogTitle: `Save or share ${fileName}` });
  } catch {
    /* user closed the share sheet */
  }
}

export function triggerFileDownload(content: Blob | string | Uint8Array, fileName: string, mimeType = 'application/octet-stream') {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) {
    // queue so multi-file exports (e.g. .shp/.shx/.dbf/.prj) open one share sheet at a time
    nativeQueue = nativeQueue
      .then(() => nativeSave(content, fileName, mimeType))
      .catch((e) => alert(`Could not save ${fileName}: ${e?.message ?? e}`));
    return;
  }

  let blob: Blob;
  if (typeof content === 'string') {
    blob = new Blob([content], { type: mimeType });
  } else if (content instanceof Uint8Array) {
    blob = new Blob([content], { type: mimeType });
  } else {
    blob = content;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}
