# Scheme Hub 2026 | Field Operations & GIS Suite

An unofficial, independent React & TypeScript application built for field survey operations, urban property assessments, and AMRUT-grade GIS ward boundary surveying in Himachal Pradesh.

## Features

### 1. GIS Property Survey & AMRUT Boundary Suite
- **Town & Ward Database**: Pre-loaded with official ward boundary outlines for 67 urban bodies across Himachal Pradesh (572 wards).
- **Ward Boundary Digitizer**: Interactive canvas digitizer to draw new ward polygons, inspect and drag vertex nodes, and auto-close boundary rings.
- **AMRUT Standards & Topology Validation**: Real-time topology checking for self-intersections (bow-tie geometries), ring closure, sliver polygon warnings, and geodesic area/perimeter calculation.
- **Geodetic Spatial Reference**: Dual WGS84 (EPSG:4326) and Transverse Mercator UTM Zone 43N (EPSG:32643) projection calculations with Ground Control Points (GCP) reference table.
- **Multi-Format GIS Exports**:
  - **ESRI Shapefiles (.shp, .shx, .dbf, .prj)**: Standards-compliant binary shapefile package with AMRUT attribute schema (`WARD_NO`, `ULB_NAME`, `AREA_SQKM`, `PERIM_M`).
  - **OGC KML**: Layered KML with styled polygons and property inspection placemarks.
  - **AMRUT GeoJSON**: RFC 7946 FeatureCollection with CRS urn metadata.
- **Property Parcel Enumeration & Geo-Tagging**: Mobile-ready field form for recording owner, house no., land/plinth areas, occupancy, use, and GPS geo-tags with automatic point-in-polygon ward determination.
- **Municipal Tax Assessment**: Form-A (Assessment Roll) and Form-E (Rateable Value Factors F1 to F5) CSV generators.

### 2. Office & Bills Master
- **TA/DA Calculation Sheet**: Full tour claim preparation with designation rates (ENUM / SUP / SSO), multiple tour ranges, 100%/70%/30% slabs, hotel toggle, and single-page A4 landscape print layout.
- **Daily Tour Diary**: Activity and journey tracking in sync with monthly tour bills.
- **Tentative Tour Programme**: Annexure-III replica for advance tour scheduling.

### 3. Field Tools Directory & Survey Indices
- Directory of 14 field utilities covering PLFS monitoring, Urban Frame Survey (UFS) progress, block locator, boundary register, and scrutiny validators.
- Real-time survey indices dashboard for Central (MoSPI) and HP State (DES) indicators (PLFS, CPI, IIP, WPI, GDP, ASUSE, HCES, ASI, HP GSDP).
- Advance Release Calendar and official publication tracker.

## Development

- Built with React 19, TypeScript, Vite, and Tailwind CSS.
- Dev server runs on port 3000: `npm run dev`.
- Production build: `npm run build`.
