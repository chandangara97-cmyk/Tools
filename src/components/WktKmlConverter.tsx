import React, { useState } from 'react';
import { triggerFileDownload } from '../utils/gisUtils';
import { Compass, Download, ArrowRight, FileCheck, Layers } from 'lucide-react';

export const WktKmlConverter: React.FC = () => {
  const [wktText, setWktText] = useState<string>(
    `MULTIPOLYGON (((76.12038 31.69682, 76.1222 31.69858, 76.12434 31.7003, 76.12692 31.70216, 76.12038 31.69682)))`
  );
  const [polygonName, setPolygonName] = useState('UFS_Block_Boundary_01');
  const [statusMsg, setStatusMsg] = useState('');

  const handleConvertAndDownload = () => {
    try {
      const trimmed = wktText.trim();
      if (!trimmed) {
        setStatusMsg('Please paste a valid MULTIPOLYGON or POLYGON WKT string.');
        return;
      }

      // Extract coordinates inside parentheses
      const coordMatch = trimmed.match(/\(\(\(([\s\S]+?)\)\)\)/) || trimmed.match(/\(\(([\s\S]+?)\)\)/);
      if (!coordMatch) {
        setStatusMsg('Could not parse WKT coordinates format. Expected MULTIPOLYGON (((lng lat, ...)))');
        return;
      }

      const pairs = coordMatch[1].split(',').map(s => s.trim());
      const kmlCoords = pairs.map(p => {
        const parts = p.split(/\s+/);
        return `${parts[0]},${parts[1]},0`;
      }).join(' ');

      const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${polygonName}</name>
    <Style id="polyStyle">
      <LineStyle>
        <color>ff0e8a7d</color>
        <width>2.5</width>
      </LineStyle>
      <PolyStyle>
        <color>440e8a7d</color>
      </PolyStyle>
    </Style>
    <Placemark>
      <name>${polygonName}</name>
      <styleUrl>#polyStyle</styleUrl>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${kmlCoords}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

      triggerFileDownload(kml, `${polygonName}.kml`, 'application/vnd.google-earth.kml+xml');
      setStatusMsg(`Successfully converted and downloaded ${polygonName}.kml!`);
    } catch (e: any) {
      setStatusMsg(`Error parsing WKT: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#07161d] text-[#edf3fc] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-[#0f242d] border border-[#1d434c] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#7c3aed] to-[#a78bfa] flex items-center justify-center text-white font-black shadow-md">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Bulk WKT &rarr; KML Converter
              </h1>
              <p className="text-xs text-[#9fc7c1]">
                Convert QGIS MULTIPOLYGON (WKT) boundary rows to standard Google Earth KML files
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#9fc7c1] mb-1">
                KML Placemark / File Name:
              </label>
              <input
                type="text"
                value={polygonName}
                onChange={(e) => setPolygonName(e.target.value)}
                className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 focus:border-[#a78bfa] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9fc7c1] mb-1">
                Paste WKT (Well-Known Text) String:
              </label>
              <textarea
                rows={7}
                value={wktText}
                onChange={(e) => setWktText(e.target.value)}
                placeholder="MULTIPOLYGON (((76.12 31.69, ...)))"
                className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-3 font-mono focus:border-[#a78bfa]"
              />
            </div>

            <button
              onClick={handleConvertAndDownload}
              className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 shadow"
            >
              <Download className="w-4 h-4" />
              Convert &amp; Download KML
            </button>

            {statusMsg && (
              <div className="p-3 bg-[#091a1f] border border-[#23534d] text-xs text-[#f7dfae] rounded-lg">
                {statusMsg}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
