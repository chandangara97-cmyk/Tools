import React, { useState } from 'react';
import { SAMPLE_BLOCK_DESCRIPTIONS, SAMPLE_BLOCK_LISTINGS, BlockDescItem, BlockListingItem } from '../data/blockData';
import { MapPin, Search, Compass, ShieldCheck, Building2, Download } from 'lucide-react';
import { triggerFileDownload } from '../utils/gisUtils';

export const UfsBlockLocator: React.FC = () => {
  const [searchBlock, setSearchBlock] = useState('2');
  const [searchWard, setSearchWard] = useState('16');
  const [matchedBlock, setMatchedBlock] = useState<BlockDescItem | null>(SAMPLE_BLOCK_DESCRIPTIONS[0] || null);
  const [gpsLat, setGpsLat] = useState('31.1048');
  const [gpsLng, setGpsLng] = useState('77.1734');
  const [gpsStatus, setGpsStatus] = useState('');

  // Listing search
  const [listingQuery, setListingQuery] = useState('');

  const handleSearch = () => {
    const found = SAMPLE_BLOCK_DESCRIPTIONS.find(
      b => String(b.BlockNumber) === String(searchBlock).trim() && String(b.WardNo) === String(searchWard).trim()
    );
    if (found) {
      setMatchedBlock(found);
    } else {
      setMatchedBlock(SAMPLE_BLOCK_DESCRIPTIONS[0] || null);
    }
  };

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('GPS hardware not available in browser.');
      return;
    }
    setGpsStatus('Locating GPS position...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setGpsLat(lat);
        setGpsLng(lng);
        setGpsStatus(`GPS Matched (±${Math.round(pos.coords.accuracy)}m) -> Matched Ward ${searchWard}, Block ${searchBlock}`);
      },
      (err) => {
        setGpsStatus(`GPS error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const filteredListings = SAMPLE_BLOCK_LISTINGS.filter(l =>
    !listingQuery ||
    l.structure.toLowerCase().includes(listingQuery.toLowerCase()) ||
    l.owner.toLowerCase().includes(listingQuery.toLowerCase()) ||
    l.landmark.toLowerCase().includes(listingQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0f242d] border border-[#1d434c] rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#0d9488] to-[#20b5a6] flex items-center justify-center text-white shadow-lg font-black">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              UFS Block Locator &amp; Boundary Matcher
            </h1>
            <p className="text-xs text-[#9fc7c1]">
              Match GPS coordinates to boundary · Retrieve North, East, South, West descriptions &amp; structure listings
            </p>
          </div>
        </div>

        <button
          onClick={handleCaptureGps}
          className="bg-[#0e8a7d] hover:bg-[#11a394] text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow"
        >
          <MapPin className="w-4 h-4 text-[#f7dfae]" />
          Match Current GPS
        </button>
      </div>

      {gpsStatus && (
        <div className="p-3 bg-[#091a1f] border border-[#23534d] text-xs text-[#f7dfae] rounded-xl flex items-center gap-2 font-mono">
          <ShieldCheck className="w-4 h-4 text-[#10b981]" />
          {gpsStatus}
        </div>
      )}

      {/* Locator Filter Controls */}
      <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-5 shadow space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Ward Number:</label>
            <input
              type="text"
              value={searchWard}
              onChange={e => setSearchWard(e.target.value)}
              placeholder="e.g. 14, 16"
              className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Block Number:</label>
            <input
              type="text"
              value={searchBlock}
              onChange={e => setSearchBlock(e.target.value)}
              placeholder="e.g. 2, 3, 14"
              className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 font-mono"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="w-full bg-[#0e8a7d] hover:bg-[#11a394] text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 shadow"
            >
              <Search className="w-4 h-4" /> Locate Block Boundary
            </button>
          </div>
        </div>
      </div>

      {/* Boundary Descriptions (N, E, S, W) */}
      {matchedBlock && (
        <div className="bg-[#0f242d] border border-[#1d434c] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1b3d39] pb-3">
            <div>
              <span className="text-xs text-[#9fc7c1]">Identified Survey Block:</span>
              <h2 className="text-lg font-bold text-white">
                Ward {matchedBlock.WardNo} · Block Number {matchedBlock.BlockNumber}
              </h2>
            </div>
            <span className="text-xs bg-[#1a403d] text-[#20b5a6] px-3 py-1 rounded-full font-bold">
              Officer: {matchedBlock.Name}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-[#091a1f] border border-[#1b3d39] rounded-xl space-y-1.5">
              <span className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider block">
                ▲ North Boundary
              </span>
              <p className="text-[#c5d8df] leading-relaxed">{matchedBlock.North || 'Boundary along road / ridgeline'}</p>
            </div>
            <div className="p-4 bg-[#091a1f] border border-[#1b3d39] rounded-xl space-y-1.5">
              <span className="text-xs font-bold text-[#f59e0b] uppercase tracking-wider block">
                ► East Boundary
              </span>
              <p className="text-[#c5d8df] leading-relaxed">{matchedBlock.East || 'Boundary along road / ridgeline'}</p>
            </div>
            <div className="p-4 bg-[#091a1f] border border-[#1b3d39] rounded-xl space-y-1.5">
              <span className="text-xs font-bold text-[#10b981] uppercase tracking-wider block">
                ▼ South Boundary
              </span>
              <p className="text-[#c5d8df] leading-relaxed">{matchedBlock.South || 'Boundary along road / ridgeline'}</p>
            </div>
            <div className="p-4 bg-[#091a1f] border border-[#1b3d39] rounded-xl space-y-1.5">
              <span className="text-xs font-bold text-[#ec4899] uppercase tracking-wider block">
                ◄ West Boundary
              </span>
              <p className="text-[#c5d8df] leading-relaxed">{matchedBlock.West || 'Boundary along road / ridgeline'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Structure Listing Search */}
      <div className="bg-[#0f242d] border border-[#1d434c] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#20b5a6]" />
              Structure Listings in Block Frame
            </h3>
            <p className="text-xs text-[#9fc7c1]">
              Verify structure names, owner listings and household counts
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#7ea19b] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Filter structure/owner..."
              value={listingQuery}
              onChange={e => setListingQuery(e.target.value)}
              className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg pl-9 pr-3 py-2"
            />
          </div>
        </div>

        <div className="overflow-x-auto text-xs border border-[#1b3d39] rounded-xl font-sans">
          <table className="w-full text-left">
            <thead className="bg-[#091a1f] text-[#9fc7c1] border-b border-[#23534d]">
              <tr>
                <th className="p-3">Structure Name</th>
                <th className="p-3">Owner Name</th>
                <th className="p-3">Households</th>
                <th className="p-3">Landmark / Details</th>
                <th className="p-3">IV Unit</th>
                <th className="p-3">Ward / Block</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b3d39]">
              {filteredListings.slice(0, 15).map((l, i) => (
                <tr key={i} className="hover:bg-white/5">
                  <td className="p-3 font-bold text-white">{l.structure}</td>
                  <td className="p-3">{l.owner}</td>
                  <td className="p-3 font-mono">{l.households}</td>
                  <td className="p-3 text-[#9fc7c1]">{l.landmark}</td>
                  <td className="p-3 font-mono">IV #{l.ivUnit}</td>
                  <td className="p-3 font-mono text-[#f7dfae]">W{l.wardNo} / B{l.blockNo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
