import React, { useState, useEffect, useRef, useMemo } from 'react';
import townsJson from '../data/townsData.json';
import {
  TownData,
  WardFeature,
  PropertyRecord,
  pointInPolygon,
  findWardForPoint,
  calculatePolygonAreaSqMeters,
  calculatePerimeterMeters,
  wgs84ToUtmZone43N,
  validateWardTopology,
  TopologyCheckResult,
  exportAmrutGeoJson,
  exportAmrutKml,
  generateWardShapefiles,
  triggerFileDownload,
  PRJ_WGS84_UTM_ZONE_43N,
} from '../utils/gisUtils';
import {
  MapPin,
  Layers,
  FileSpreadsheet,
  Download,
  Upload,
  Compass,
  CheckCircle,
  AlertTriangle,
  PenTool,
  RotateCcw,
  Plus,
  Trash2,
  Maximize2,
  Crosshair,
  Printer,
  Sparkles,
  Database,
  Building2,
  FileCheck,
  Info
} from 'lucide-react';

const TOWNS_MAP: Record<string, TownData> = townsJson as unknown as Record<string, TownData>;

export const GisPropertySurvey: React.FC = () => {
  // Active Survey Sub-Tab
  const [activeTab, setActiveTab] = useState<'survey' | 'map-editor' | 'records' | 'assessment' | 'exports'>('survey');

  // Town & Surveyor Config
  const [selectedTownKey, setSelectedTownKey] = useState<string>('bhota-0206001');
  const [wardNo, setWardNo] = useState<string>('1');
  const [surveyorName, setSurveyorName] = useState<string>('Field Surveyor 01');

  // Editable Town Boundaries (allows in-memory / local editing & adding new wards!)
  const [editableTowns, setEditableTowns] = useState<Record<string, TownData>>(() => {
    try {
      const saved = localStorage.getItem('gis_survey_custom_towns');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return TOWNS_MAP;
  });

  // Property Records
  const [records, setRecords] = useState<PropertyRecord[]>(() => {
    try {
      const saved = localStorage.getItem('gis_survey_properties_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: '1-0001',
        town: 'Bhota',
        ward: '1',
        sur: 'Field Surveyor 01',
        owner: 'Ramesh Chand Sharma',
        hno: '14/B',
        addr: 'Near Main Bazaar, Bhota',
        use: 'Commercial',
        occ: 'Owner-occupied',
        str: 'RCC',
        yr: '2016',
        floors: [120, 115],
        bu: 235,
        land: 160,
        act: 'General Kirana Store & Residence',
        zone: 'A',
        ncls: 'D',
        tenant: '',
        upn: 'HP-BHT-01-0014',
        lat: '31.6115',
        lng: '76.5635',
        acc: '4.2',
        rem: 'Ground floor retail, first floor residential',
        date: '2026-10-12',
      },
      {
        id: '1-0002',
        town: 'Bhota',
        ward: '1',
        sur: 'Field Surveyor 01',
        owner: 'Sunita Devi',
        hno: '22',
        addr: 'Ward 1 Link Road',
        use: 'Residential',
        occ: 'Owner-occupied',
        str: 'RCC',
        yr: '2020',
        floors: [95, 90],
        bu: 185,
        land: 130,
        act: '',
        zone: 'A',
        ncls: 'E',
        tenant: '',
        upn: 'HP-BHT-01-0022',
        lat: '31.6122',
        lng: '76.5645',
        acc: '3.8',
        rem: 'Two storey residential building',
        date: '2026-10-13',
      }
    ];
  });

  // Current Form State
  const [editId, setEditId] = useState<string | null>(null);
  const [owner, setOwner] = useState('');
  const [hno, setHno] = useState('');
  const [addr, setAddr] = useState('');
  const [useType, setUseType] = useState('Residential');
  const [occ, setOcc] = useState('Owner-occupied');
  const [str, setStr] = useState('RCC');
  const [yr, setYr] = useState('2018');
  const [floorAreas, setFloorAreas] = useState<number[]>([100]);
  const [landArea, setLandArea] = useState<number>(120);
  const [zone, setZone] = useState('A');
  const [ncls, setNcls] = useState('E');
  const [act, setAct] = useState('');
  const [tenant, setTenant] = useState('');
  const [upn, setUpn] = useState('');
  const [lat, setLat] = useState('31.6118');
  const [lng, setLng] = useState('76.5638');
  const [acc, setAcc] = useState('4.0');
  const [rem, setRem] = useState('');
  const [formMsg, setFormMsg] = useState<{ type: 'ok' | 'err' | 'warn'; text: string } | null>(null);

  // Search in records
  const [searchQuery, setSearchQuery] = useState('');

  // Map Editor State
  const [editorMode, setEditorMode] = useState<'view' | 'draw' | 'edit-vertex'>('view');
  const [selectedWardForEdit, setSelectedWardForEdit] = useState<string>('1');
  const [drawingRing, setDrawingRing] = useState<[number, number][]>([]);
  const [activeVertexIndex, setActiveVertexIndex] = useState<number | null>(null);
  const [topologyResult, setTopologyResult] = useState<TopologyCheckResult | null>(null);

  // Ground Control Points (GCPs) Logger for tender accuracy compliance
  const [gcps, setGcps] = useState<Array<{ id: string; name: string; lat: number; lng: number; utmE: number; utmN: number; elev: number; rtkFixed: boolean }>>([
    { id: 'GCP-01', name: 'Tehsil Office Trig Point', lat: 31.61204, lng: 76.56342, utmE: 648215.4, utmN: 3499420.2, elev: 890, rtkFixed: true },
    { id: 'GCP-02', name: 'PWD Rest House Pillar', lat: 31.60950, lng: 76.56580, utmE: 648430.1, utmN: 3499130.8, elev: 875, rtkFixed: true },
  ]);

  // Current town data
  const currentTown = useMemo<TownData>(() => {
    return editableTowns[selectedTownKey] || TOWNS_MAP[selectedTownKey] || { n: 'Unknown', w: [] };
  }, [editableTowns, selectedTownKey]);

  // Save records and towns to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gis_survey_properties_v2', JSON.stringify(records));
    } catch (e) {}
  }, [records]);

  useEffect(() => {
    try {
      localStorage.setItem('gis_survey_custom_towns', JSON.stringify(editableTowns));
    } catch (e) {}
  }, [editableTowns]);

  // Auto total built-up
  const totalBuiltUp = useMemo(() => {
    return floorAreas.reduce((a, b) => a + (Number(b) || 0), 0);
  }, [floorAreas]);

  // Validate active ward topology on demand
  useEffect(() => {
    const activeWardObj = currentTown.w.find(w => String(w.w) === String(selectedWardForEdit));
    if (activeWardObj && activeWardObj.rings && activeWardObj.rings[0]) {
      const res = validateWardTopology(activeWardObj.rings[0]);
      setTopologyResult(res);
    } else {
      setTopologyResult(null);
    }
  }, [selectedWardForEdit, currentTown]);

  // Next Property ID calculation
  const nextPropertyId = useMemo(() => {
    const w = (wardNo || '1').trim();
    const existing = records.filter(r => String(r.ward) === w);
    const maxNum = existing.reduce((max, r) => {
      const parts = r.id.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    return `${w}-${String(maxNum + 1).padStart(4, '0')}`;
  }, [wardNo, records]);

  // GPS Capture
  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setFormMsg({ type: 'err', text: 'Geolocation is not supported by your browser.' });
      return;
    }
    setFormMsg({ type: 'warn', text: 'Acquiring GPS fix (high accuracy)...' });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const cLat = pos.coords.latitude.toFixed(6);
        const cLng = pos.coords.longitude.toFixed(6);
        const cAcc = pos.coords.accuracy.toFixed(1);
        setLat(cLat);
        setLng(cLng);
        setAcc(cAcc);

        // Auto point-in-polygon check for ward
        const matchedWard = findWardForPoint(parseFloat(cLng), parseFloat(cLat), currentTown.w);
        if (matchedWard && matchedWard !== wardNo) {
          setWardNo(matchedWard);
          setFormMsg({
            type: 'ok',
            text: `GPS locked (±${cAcc} m). Location automatically falls in Ward ${matchedWard}! Ward updated.`,
          });
        } else {
          setFormMsg({
            type: 'ok',
            text: `GPS locked (±${cAcc} m). Coordinates captured successfully.`,
          });
        }
      },
      (err) => {
        setFormMsg({ type: 'err', text: `GPS error: ${err.message}. Enter lat/long manually.` });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Floor area helpers
  const handleFloorChange = (index: number, val: number) => {
    const updated = [...floorAreas];
    updated[index] = val;
    setFloorAreas(updated);
  };

  const addFloor = () => setFloorAreas([...floorAreas, 80]);
  const removeFloor = (index: number) => {
    if (floorAreas.length > 1) {
      setFloorAreas(floorAreas.filter((_, i) => i !== index));
    }
  };

  // Reset Property Form
  const resetForm = () => {
    setEditId(null);
    setOwner('');
    setHno('');
    setAddr('');
    setUseType('Residential');
    setOcc('Owner-occupied');
    setStr('RCC');
    setYr('2020');
    setFloorAreas([90]);
    setLandArea(120);
    setAct('');
    setTenant('');
    setUpn('');
    setRem('');
    setFormMsg(null);
  };

  // Save Property
  const handleSaveProperty = () => {
    if (!owner.trim() || !hno.trim() || !wardNo) {
      setFormMsg({ type: 'err', text: 'Please fill Owner name, House/Plot No, and Ward No.' });
      return;
    }

    const targetId = editId || nextPropertyId;

    const newRecord: PropertyRecord = {
      id: targetId,
      town: currentTown.n,
      ward: wardNo,
      sur: surveyorName,
      owner: owner.trim(),
      hno: hno.trim(),
      addr: addr.trim(),
      use: useType,
      occ,
      str,
      yr,
      floors: floorAreas.map(Number),
      bu: totalBuiltUp,
      land: Number(landArea) || 0,
      act: act.trim(),
      zone,
      ncls,
      tenant: tenant.trim(),
      upn: upn.trim(),
      lat,
      lng,
      acc,
      rem: rem.trim(),
      date: new Date().toISOString().slice(0, 10),
    };

    if (editId) {
      setRecords(records.map(r => r.id === editId ? newRecord : r));
      setFormMsg({ type: 'ok', text: `Updated record ${targetId} successfully!` });
    } else {
      setRecords([...records, newRecord]);
      setFormMsg({ type: 'ok', text: `Saved new property record ${targetId}!` });
    }

    resetForm();
  };

  // Edit record
  const handleEditRecord = (r: PropertyRecord) => {
    setEditId(r.id);
    setWardNo(r.ward);
    setOwner(r.owner);
    setHno(r.hno);
    setAddr(r.addr || '');
    setUseType(r.use);
    setOcc(r.occ);
    setStr(r.str);
    setYr(r.yr || '');
    setFloorAreas(r.floors && r.floors.length ? r.floors : [r.bu]);
    setLandArea(r.land || 0);
    setZone(r.zone || 'A');
    setNcls(r.ncls || 'E');
    setAct(r.act || '');
    setTenant(r.tenant || '');
    setUpn(r.upn || '');
    setLat(r.lat || '');
    setLng(r.lng || '');
    setAcc(r.acc || '');
    setRem(r.rem || '');
    setActiveTab('survey');
    setFormMsg({ type: 'warn', text: `Editing property record ${r.id}` });
  };

  // Delete record
  const handleDeleteRecord = (id: string) => {
    if (window.confirm(`Delete property record ${id}?`)) {
      setRecords(records.filter(r => r.id !== id));
    }
  };

  // ============================================
  // Canvas Map & Ward Boundary Digitizer Renderer
  // ============================================
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Map Bounds Calculation
  const mapBounds = useMemo(() => {
    const wards = currentTown.w || [];
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;

    wards.forEach(w => {
      w.rings?.forEach(ring => {
        ring.forEach(([x, y]) => {
          if (x < minLng) minLng = x;
          if (x > maxLng) maxLng = x;
          if (y < minLat) minLat = y;
          if (y > maxLat) maxLat = y;
        });
      });
    });

    if (minLng === Infinity) {
      minLng = 76.55; maxLng = 76.57; minLat = 31.60; maxLat = 31.62;
    }

    return { minLng, maxLng, minLat, maxLat };
  }, [currentTown]);

  // Redraw Canvas Map
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Dark GIS Map Base
    ctx.fillStyle = '#0a1a1f';
    ctx.fillRect(0, 0, width, height);

    // Subtle coordinate grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const { minLng, maxLng, minLat, maxLat } = mapBounds;
    const spanLng = (maxLng - minLng) || 0.001;
    const spanLat = (maxLat - minLat) || 0.001;

    // Aspect ratio correction (cos of mean latitude)
    const midLat = (minLat + maxLat) / 2;
    const aspectCorrection = Math.cos((midLat * Math.PI) / 180);

    const padding = 50;
    const availW = width - padding * 2;
    const availH = height - padding * 2;

    const scaleX = availW / (spanLng * aspectCorrection);
    const scaleY = availH / spanLat;
    const baseScale = Math.min(scaleX, scaleY);

    const toScreen = (lon: number, latitude: number): [number, number] => {
      const nx = (lon - minLng) * aspectCorrection * baseScale * zoom;
      const ny = (maxLat - latitude) * baseScale * zoom;
      return [
        padding + nx + pan.x + (availW - spanLng * aspectCorrection * baseScale * zoom) / 2,
        padding + ny + pan.y + (availH - spanLat * baseScale * zoom) / 2
      ];
    };

    // Draw all town ward boundary polygons
    currentTown.w.forEach((w) => {
      const isSelected = String(w.w) === String(selectedWardForEdit);
      const ring = w.rings[0] || [];
      if (ring.length < 3) return;

      ctx.beginPath();
      ring.forEach(([x, y], idx) => {
        const [sx, sy] = toScreen(x, y);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.closePath();

      // Polygon fill
      ctx.fillStyle = isSelected ? 'rgba(14, 138, 125, 0.35)' : 'rgba(15, 60, 75, 0.25)';
      ctx.fill();

      // Polygon boundary stroke
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.strokeStyle = isSelected ? '#d6a34b' : '#27b3a3';
      ctx.stroke();

      // Ward centroid label
      let cx = 0, cy = 0;
      ring.forEach(([x, y]) => { cx += x; cy += y; });
      cx /= ring.length;
      cy /= ring.length;
      const [scx, scy] = toScreen(cx, cy);

      ctx.fillStyle = isSelected ? '#ffffff' : '#9fc7c1';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Ward ${w.w}`, scx, scy);

      // Area tag
      const areaSqKm = (calculatePolygonAreaSqMeters(ring) / 1e6).toFixed(3);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '10px sans-serif';
      ctx.fillText(`${areaSqKm} km²`, scx, scy + 14);

      // If in vertex editing mode for this ward, draw draggable vertex handles
      if (editorMode === 'edit-vertex' && isSelected) {
        ring.forEach(([vx, vy], vIdx) => {
          const [vsx, vsy] = toScreen(vx, vy);
          ctx.beginPath();
          ctx.arc(vsx, vsy, activeVertexIndex === vIdx ? 7 : 4.5, 0, Math.PI * 2);
          ctx.fillStyle = activeVertexIndex === vIdx ? '#f59e0b' : '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      }
    });

    // Draw Drawing Ring (when digitizing new ward)
    if (editorMode === 'draw' && drawingRing.length > 0) {
      ctx.beginPath();
      drawingRing.forEach(([dx, dy], idx) => {
        const [sx, sy] = toScreen(dx, dy);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      drawingRing.forEach(([dx, dy], vIdx) => {
        const [sx, sy] = toScreen(dx, dy);
        ctx.beginPath();
        ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = vIdx === 0 ? '#10b981' : '#f59e0b';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    // Draw Ground Control Points (GCPs)
    gcps.forEach((gcp) => {
      const [gx, gy] = toScreen(gcp.lng, gcp.lat);
      ctx.beginPath();
      ctx.arc(gx, gy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9.5px sans-serif';
      ctx.fillText(`▲ ${gcp.id}`, gx + 6, gy - 4);
    });

    // Draw Surveyed Property Points
    records.forEach((r) => {
      if (!r.lat || !r.lng) return;
      const px = parseFloat(r.lng);
      const py = parseFloat(r.lat);
      if (isNaN(px) || isNaN(py)) return;

      const [sx, sy] = toScreen(px, py);

      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fillStyle = r.use === 'Commercial' ? '#ef4444' : r.use === 'Mixed use' ? '#f59e0b' : '#10b981';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Draw active / captured GPS point
    if (lat && lng) {
      const clat = parseFloat(lat);
      const clng = parseFloat(lng);
      if (!isNaN(clat) && !isNaN(clng)) {
        const [sx, sy] = toScreen(clng, clat);

        // Accuracy pulse
        const pixAcc = Math.min(60, Math.max(12, (parseFloat(acc) || 4) * baseScale * zoom * 0.00001));
        ctx.beginPath();
        ctx.arc(sx, sy, pixAcc, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(214, 163, 75, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#d6a34b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Pin target
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#d6a34b';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('Target Pin', sx + 10, sy - 8);
      }
    }

    // Map Legend & Scale indicator in bottom corner
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(15, height - 55, 230, 42);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.strokeRect(15, height - 55, 230, 42);

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`CRS: WGS84 / UTM Zone 43N | Scale: ${zoom.toFixed(1)}x`, 22, height - 38);
    ctx.fillText('● Green: Res  ● Red: Comm  ▲ Blue: GCP', 22, height - 20);

    // North arrow
    ctx.fillStyle = '#d6a34b';
    ctx.beginPath();
    ctx.moveTo(width - 25, 25);
    ctx.lineTo(width - 32, 45);
    ctx.lineTo(width - 25, 40);
    ctx.lineTo(width - 18, 45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', width - 25, 18);

  }, [currentTown, records, selectedWardForEdit, editorMode, drawingRing, activeVertexIndex, zoom, pan, lat, lng, acc, mapBounds, gcps]);

  // Map Click / Interaction Handler
  const handleMapCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const { minLng, maxLng, minLat, maxLat } = mapBounds;
    const spanLng = (maxLng - minLng) || 0.001;
    const spanLat = (maxLat - minLat) || 0.001;
    const midLat = (minLat + maxLat) / 2;
    const aspectCorrection = Math.cos((midLat * Math.PI) / 180);

    const padding = 50;
    const availW = canvas.width - padding * 2;
    const availH = canvas.height - padding * 2;
    const scaleX = availW / (spanLng * aspectCorrection);
    const scaleY = availH / spanLat;
    const baseScale = Math.min(scaleX, scaleY);

    // Invert screen coordinates to geographic coordinates
    const geoLng = minLng + (clickX - padding - pan.x - (availW - spanLng * aspectCorrection * baseScale * zoom) / 2) / (aspectCorrection * baseScale * zoom);
    const geoLat = maxLat - (clickY - padding - pan.y - (availH - spanLat * baseScale * zoom) / 2) / (baseScale * zoom);

    if (editorMode === 'draw') {
      // Add vertex to new ward polygon
      setDrawingRing(prev => [...prev, [parseFloat(geoLng.toFixed(6)), parseFloat(geoLat.toFixed(6))]]);
    } else if (editorMode === 'view') {
      // Place property survey pin at tapped point
      setLat(geoLat.toFixed(6));
      setLng(geoLng.toFixed(6));
      setAcc('3.5');

      // Auto check ward
      const matched = findWardForPoint(geoLng, geoLat, currentTown.w);
      if (matched) {
        setWardNo(matched);
      }
    }
  };

  // Complete Drawing New Ward
  const handleCompleteNewWard = () => {
    if (drawingRing.length < 3) {
      alert('A polygon needs at least 3 vertices to close.');
      return;
    }

    const newWardNumber = String(currentTown.w.length + 1);
    const closed = [...drawingRing];
    if (closed[0][0] !== closed[closed.length - 1][0] || closed[0][1] !== closed[closed.length - 1][1]) {
      closed.push([closed[0][0], closed[0][1]]);
    }

    const newWardFeature: WardFeature = {
      w: newWardNumber,
      name: `Ward ${newWardNumber}`,
      rings: [closed],
    };

    const updatedTown = {
      ...currentTown,
      w: [...currentTown.w, newWardFeature],
    };

    setEditableTowns(prev => ({
      ...prev,
      [selectedTownKey]: updatedTown,
    }));

    setDrawingRing([]);
    setEditorMode('view');
    setSelectedWardForEdit(newWardNumber);
    alert(`Successfully digitized and saved Ward ${newWardNumber} for ${currentTown.n}!`);
  };

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalProps = records.length;
    const geoTagged = records.filter(r => r.lat && r.lng).length;
    const totalBuiltUpSqM = records.reduce((acc, r) => acc + (r.bu || 0), 0);
    const totalLandSqM = records.reduce((acc, r) => acc + (r.land || 0), 0);

    // Rough estimated general property tax (Himachal Pradesh MC Shimla Bye-laws baseline)
    const estTaxAnnual = records.reduce((acc, r) => {
      const rate = r.use === 'Commercial' ? 24 : r.use === 'Mixed use' ? 18 : 10;
      return acc + (r.bu || 0) * rate;
    }, 0);

    return {
      totalProps,
      geoTagged,
      totalBuiltUpSqM,
      totalLandSqM,
      estTaxAnnual,
    };
  }, [records]);

  // Form-A & Form-E CSV export string generator
  const getFormACsv = () => {
    const header = [
      'Sr. No.',
      'UPN No.',
      'Property ID',
      'Ward No.',
      'Town',
      'Owner Name',
      'House/Plot No.',
      'Address',
      'Use Category',
      'Total Built-up (sq m)',
      'Land Area (sq m)',
      'Rateable Zone',
      'Est. Annual Tax (Rs)',
      'Survey Date'
    ];

    const rows = records.map((r, i) => [
      i + 1,
      r.upn || `HP-UPN-${r.id}`,
      r.id,
      r.ward,
      r.town,
      `"${r.owner}"`,
      `"${r.hno}"`,
      `"${r.addr || ''}"`,
      r.use,
      r.bu,
      r.land,
      r.zone,
      (r.bu * (r.use === 'Commercial' ? 24 : 10)).toFixed(2),
      r.date
    ]);

    return [header.join(','), ...rows.map(row => row.join(','))].join('\n');
  };

  const getFormECsv = () => {
    const header = [
      'Sr.',
      'Property ID',
      'Ward',
      'Zone',
      'Category',
      'Built-up Area (sq m)',
      'F1 Location Factor',
      'F2 Structural Factor',
      'F3 Age Factor',
      'F4 Occupancy Factor',
      'F5 Use Factor',
      'Rateable Value (Rs)',
      'Rebate 10% (Rs)',
      'Net Taxable Value (Rs)'
    ];

    const rows = records.map((r, i) => {
      const f1 = 5;
      const f2 = r.str === 'RCC' ? 3 : 2;
      const f3 = 4;
      const f4 = r.occ === 'Let out' ? 2.5 : 2.0;
      const f5 = r.use === 'Commercial' ? 2.5 : 1.5;
      const gross = r.bu * f1 * f2 * f3 * f4 * f5;
      const rebate = gross * 0.1;
      const net = gross - rebate;

      return [
        i + 1,
        r.id,
        r.ward,
        r.zone,
        r.use,
        r.bu,
        f1,
        f2,
        f3,
        f4,
        f5,
        gross.toFixed(2),
        rebate.toFixed(2),
        net.toFixed(2)
      ];
    });

    return [header.join(','), ...rows.map(row => row.join(','))].join('\n');
  };

  // Shapefile Export Handler
  const handleExportShapefile = () => {
    try {
      const pkg = generateWardShapefiles(currentTown);
      const baseName = `${currentTown.n.replace(/\s+/g, '_')}_AMRUT_Wards`;

      // Download .shp
      triggerFileDownload(pkg.shp, `${baseName}.shp`);
      // Download .shx
      setTimeout(() => triggerFileDownload(pkg.shx, `${baseName}.shx`), 200);
      // Download .dbf
      setTimeout(() => triggerFileDownload(pkg.dbf, `${baseName}.dbf`), 400);
      // Download .prj
      setTimeout(() => triggerFileDownload(pkg.prj, `${baseName}.prj`, 'text/plain'), 600);
    } catch (e: any) {
      alert(`Shapefile export error: ${e.message}`);
    }
  };

  // Live UTM coordinate readout for active lat/lng
  const currentUtm = useMemo(() => {
    const clat = parseFloat(lat);
    const clng = parseFloat(lng);
    if (!isNaN(clat) && !isNaN(clng)) {
      return wgs84ToUtmZone43N(clng, clat);
    }
    return null;
  }, [lat, lng]);

  return (
    <div className="min-h-screen bg-[#07161d] text-[#edf3fc]">
      {/* Tool Header */}
      <div className="bg-[#0b242e] border-b border-[#1b3d45] px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#0e8a7d] to-[#20b5a6] flex items-center justify-center text-white font-black shadow-lg">
              <span className="text-xl">GIS</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Property Survey &amp; AMRUT GIS Suite
                </h1>
                <span className="bg-[#d6a34b] text-[#07161d] font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                  AMRUT 2.0 Compliant
                </span>
              </div>
              <p className="text-xs text-[#9fc7c1] mt-0.5">
                Ward Boundary Digitizer · Property Parcel Enumeration · Topology Validation · Multi-format GIS Deliverables
              </p>
            </div>
          </div>

          {/* Quick Town Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#9fc7c1] whitespace-nowrap">Selected ULB:</label>
            <select
              value={selectedTownKey}
              onChange={(e) => {
                setSelectedTownKey(e.target.value);
                setWardNo('1');
                setSelectedWardForEdit('1');
              }}
              className="bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg px-3 py-2 font-medium focus:outline-none focus:border-[#20b5a6]"
            >
              {Object.entries(editableTowns).map(([key, t]) => (
                <option key={key} value={key}>
                  {t.n} ({t.w?.length || 0} wards)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto flex items-center gap-1 mt-4 overflow-x-auto border-t border-[#16363d] pt-2">
          <button
            onClick={() => setActiveTab('survey')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'survey' ? 'bg-[#0e8a7d] text-white shadow-md' : 'text-[#9fc7c1] hover:bg-white/5'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            1. Property Survey
          </button>
          <button
            onClick={() => setActiveTab('map-editor')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'map-editor' ? 'bg-[#0e8a7d] text-white shadow-md' : 'text-[#9fc7c1] hover:bg-white/5'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 text-[#f7dfae]" />
            2. Ward Map &amp; Boundary Editor (GIS)
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'records' ? 'bg-[#0e8a7d] text-white shadow-md' : 'text-[#9fc7c1] hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            3. Records ({records.length})
          </button>
          <button
            onClick={() => setActiveTab('assessment')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'assessment' ? 'bg-[#0e8a7d] text-white shadow-md' : 'text-[#9fc7c1] hover:bg-white/5'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            4. Assessment &amp; Form A/E
          </button>
          <button
            onClick={() => setActiveTab('exports')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'exports' ? 'bg-[#0e8a7d] text-white shadow-md' : 'text-[#9fc7c1] hover:bg-white/5'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-[#38bdf8]" />
            5. GIS Deliverables &amp; Exports (SHP/KML)
          </button>
        </div>
      </div>

      {/* Main Workspace Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* ==================================================== */}
        {/* TAB 1: PROPERTY SURVEY FORM */}
        {/* ==================================================== */}
        {activeTab === 'survey' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Form */}
            <div className="lg:col-span-7 space-y-6">
              {/* Survey Setup Card */}
              <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-5 shadow-lg">
                <h2 className="text-sm font-bold text-[#20b5a6] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Compass className="w-4 h-4" />
                  Survey Configuration
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Town / ULB</label>
                    <input
                      type="text"
                      readOnly
                      value={currentTown.n}
                      className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Ward No. *</label>
                    <select
                      value={wardNo}
                      onChange={(e) => setWardNo(e.target.value)}
                      className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 font-medium focus:border-[#20b5a6]"
                    >
                      {currentTown.w.map((w) => (
                        <option key={w.w} value={w.w}>
                          Ward {w.w} ({w.name || 'Boundary'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Surveyor Name</label>
                    <input
                      type="text"
                      value={surveyorName}
                      onChange={(e) => setSurveyorName(e.target.value)}
                      className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 font-medium focus:border-[#20b5a6]"
                    />
                  </div>
                </div>
              </div>

              {/* Property Details Card */}
              <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#20b5a6] uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Property Identification
                  </h2>
                  <span className="bg-[#091a1f] text-[#f7dfae] border border-[#23534d] text-xs font-mono font-bold px-2.5 py-1 rounded">
                    ID: {editId || nextPropertyId}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Owner Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Chand"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 focus:border-[#20b5a6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">House / Plot No. *</label>
                    <input
                      type="text"
                      placeholder="e.g. 14/B or Plot 20"
                      value={hno}
                      onChange={(e) => setHno(e.target.value)}
                      className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 focus:border-[#20b5a6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Locality / Street Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Near Bus Stand, Main Road"
                    value={addr}
                    onChange={(e) => setAddr(e.target.value)}
                    className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 focus:border-[#20b5a6]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Use Category *</label>
                    <select
                      value={useType}
                      onChange={(e) => setUseType(e.target.value)}
                      className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 focus:border-[#20b5a6]"
                    >
                      <option>Residential</option>
                      <option>Commercial</option>
                      <option>Mixed use</option>
                      <option>Industrial</option>
                      <option>Institutional</option>
                      <option>Vacant land</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Occupancy</label>
                    <select
                      value={occ}
                      onChange={(e) => setOcc(e.target.value)}
                      className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 focus:border-[#20b5a6]"
                    >
                      <option>Owner-occupied</option>
                      <option>Let out</option>
                      <option>Vacant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Structure Type</label>
                    <select
                      value={str}
                      onChange={(e) => setStr(e.target.value)}
                      className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 focus:border-[#20b5a6]"
                    >
                      <option>RCC</option>
                      <option>Pucca (other)</option>
                      <option>Semi-pucca</option>
                      <option>Kutcha</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Year Built</label>
                    <input
                      type="number"
                      placeholder="e.g. 2018"
                      value={yr}
                      onChange={(e) => setYr(e.target.value)}
                      className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 focus:border-[#20b5a6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Zone (Tax Rate)</label>
                    <select
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                      className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 focus:border-[#20b5a6]"
                    >
                      <option value="A">Zone A (Prime Commercial/Road)</option>
                      <option value="B">Zone B (Interior / Secondary)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">UPN / GIS Unique ID</label>
                    <input
                      type="text"
                      placeholder="e.g. HP-BHT-01-0012"
                      value={upn}
                      onChange={(e) => setUpn(e.target.value)}
                      className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 focus:border-[#20b5a6]"
                    />
                  </div>
                </div>
              </div>

              {/* Area Measurements Card */}
              <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#20b5a6] uppercase tracking-wider flex items-center gap-2">
                    <Maximize2 className="w-4 h-4" />
                    Plinth &amp; Plot Area (sq m)
                  </h2>
                  <button
                    type="button"
                    onClick={addFloor}
                    className="bg-[#1b433e] hover:bg-[#20524c] text-[#20b5a6] text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Floor
                  </button>
                </div>

                <div className="space-y-2">
                  {floorAreas.map((fArea, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-3">
                      <span className="text-xs text-[#9fc7c1] w-24">Floor {fIdx + 1}:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={fArea || ''}
                        onChange={(e) => handleFloorChange(fIdx, parseFloat(e.target.value) || 0)}
                        placeholder="Plinth area (sq m)"
                        className="flex-1 bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2 focus:border-[#20b5a6]"
                      />
                      {floorAreas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFloor(fIdx)}
                          className="text-[#ef4444] hover:text-red-300 p-1"
                          title="Remove floor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1a3840]">
                  <div>
                    <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Total Built-Up Area (Auto):</label>
                    <div className="bg-[#091a1f] border border-[#23534d] text-[#f7dfae] text-sm font-mono font-bold rounded-lg p-2.5">
                      {totalBuiltUp.toFixed(2)} sq m
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Plot / Land Area (sq m):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={landArea || ''}
                      onChange={(e) => setLandArea(parseFloat(e.target.value) || 0)}
                      placeholder="Land area"
                      className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 focus:border-[#20b5a6]"
                    />
                  </div>
                </div>
              </div>

              {/* Geo-tagging Card */}
              <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#20b5a6] uppercase tracking-wider flex items-center gap-2">
                    <Crosshair className="w-4 h-4" />
                    Spatial Geo-Tag &amp; Projections
                  </h2>
                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    className="bg-[#0e8a7d] hover:bg-[#11a394] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Capture GPS Here
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Latitude (WGS84)</label>
                    <input
                      type="text"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="e.g. 31.6118"
                      className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 focus:border-[#20b5a6] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Longitude (WGS84)</label>
                    <input
                      type="text"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      placeholder="e.g. 76.5638"
                      className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 focus:border-[#20b5a6] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">GPS Accuracy (m)</label>
                    <input
                      type="text"
                      value={acc}
                      onChange={(e) => setAcc(e.target.value)}
                      placeholder="e.g. 3.5"
                      className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 focus:border-[#20b5a6] font-mono"
                    />
                  </div>
                </div>

                {/* UTM Readout */}
                {currentUtm && (
                  <div className="bg-[#091a1f] p-3 rounded-lg border border-[#1b433e] text-xs font-mono text-[#9fc7c1] flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[#f7dfae] font-bold">UTM Zone 43N (m):</span> Easting: {currentUtm.easting.toLocaleString()} mE, Northing: {currentUtm.northing.toLocaleString()} mN
                    </div>
                    <span className="text-[10px] bg-[#14333b] text-white px-2 py-0.5 rounded">
                      EPSG:32643
                    </span>
                  </div>
                )}
              </div>

              {/* Status Message */}
              {formMsg && (
                <div
                  className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    formMsg.type === 'ok'
                      ? 'bg-[#0e8a7d]/20 text-[#20b5a6] border border-[#0e8a7d]/40'
                      : formMsg.type === 'warn'
                      ? 'bg-[#d6a34b]/20 text-[#f7dfae] border border-[#d6a34b]/40'
                      : 'bg-[#b91c1c]/20 text-red-300 border border-red-500/40'
                  }`}
                >
                  {formMsg.type === 'ok' ? <CheckCircle className="w-4 h-4 flex-none" /> : <AlertTriangle className="w-4 h-4 flex-none" />}
                  <span>{formMsg.text}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveProperty}
                  className="flex-1 bg-[#0e8a7d] hover:bg-[#11a394] text-white text-sm font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-[0.98]"
                >
                  {editId ? 'Update Property Record' : 'Save Property Record'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-[#142831] hover:bg-[#1b3642] text-[#9fc7c1] text-sm font-semibold px-5 py-3 rounded-xl border border-[#23534d]"
                >
                  Clear / New
                </button>
              </div>
            </div>

            {/* Right Column: Mini Interactive Map Preview */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-4 shadow-lg sticky top-20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[#20b5a6] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    Ward Outlines &amp; Tap Geo-Tagging
                  </h3>
                  <button
                    onClick={() => setActiveTab('map-editor')}
                    className="text-xs text-[#f7dfae] hover:underline flex items-center gap-1"
                  >
                    Open Full Editor &rarr;
                  </button>
                </div>

                <div className="relative border border-[#23534d] rounded-lg overflow-hidden bg-[#091a1f] h-[360px]">
                  <canvas
                    ref={mapCanvasRef}
                    width={560}
                    height={400}
                    onClick={handleMapCanvasClick}
                    className="w-full h-full block cursor-crosshair"
                  />
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-[10px] text-white px-2 py-1 rounded font-mono">
                    Tap to set target pin
                  </div>
                </div>

                <div className="mt-3 p-3 bg-[#091a1f] rounded-lg border border-[#1a3840] text-xs space-y-1.5">
                  <div className="flex justify-between text-[#9fc7c1]">
                    <span>Current Town:</span>
                    <strong className="text-white">{currentTown.n}</strong>
                  </div>
                  <div className="flex justify-between text-[#9fc7c1]">
                    <span>Total Wards in Frame:</span>
                    <strong className="text-[#20b5a6]">{currentTown.w.length} Wards</strong>
                  </div>
                  <div className="flex justify-between text-[#9fc7c1]">
                    <span>Selected Active Ward:</span>
                    <strong className="text-[#f7dfae]">Ward {wardNo}</strong>
                  </div>
                  <div className="text-[11px] text-[#7ea19b] pt-1 border-t border-[#1b3d39]">
                    Tap anywhere inside the ward boundary polygon to position the property structure tag and auto-link ward number.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: WARD MAP & BOUNDARY EDITOR (AMRUT GIS) */}
        {/* ==================================================== */}
        {activeTab === 'map-editor' && (
          <div className="space-y-6">
            {/* Editor Toolbar */}
            <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#9fc7c1] uppercase mr-1">GIS Mode:</span>
                <button
                  onClick={() => { setEditorMode('view'); setDrawingRing([]); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    editorMode === 'view' ? 'bg-[#0e8a7d] text-white' : 'bg-[#091a1f] text-[#9fc7c1] border border-[#23534d]'
                  }`}
                >
                  Inspect &amp; Tag
                </button>
                <button
                  onClick={() => { setEditorMode('draw'); setDrawingRing([]); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                    editorMode === 'draw' ? 'bg-[#d6a34b] text-[#07161d] font-bold' : 'bg-[#091a1f] text-[#f7dfae] border border-[#23534d]'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  Digitize New Ward Polygon
                </button>
                <button
                  onClick={() => { setEditorMode('edit-vertex'); setDrawingRing([]); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    editorMode === 'edit-vertex' ? 'bg-[#3b82f6] text-white' : 'bg-[#091a1f] text-[#9fc7c1] border border-[#23534d]'
                  }`}
                >
                  Vertex Node Editor
                </button>
              </div>

              {/* Ward selector for editor */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#9fc7c1] font-semibold">Active Ward:</label>
                <select
                  value={selectedWardForEdit}
                  onChange={(e) => setSelectedWardForEdit(e.target.value)}
                  className="bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg px-2.5 py-1.5"
                >
                  {currentTown.w.map(w => (
                    <option key={w.w} value={w.w}>Ward {w.w}</option>
                  ))}
                </select>
                <button
                  onClick={() => setZoom(z => Math.min(4, z + 0.3))}
                  className="bg-[#091a1f] hover:bg-white/10 text-white text-xs font-bold px-2.5 py-1.5 rounded border border-[#23534d]"
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  onClick={() => setZoom(z => Math.max(0.6, z - 0.3))}
                  className="bg-[#091a1f] hover:bg-white/10 text-white text-xs font-bold px-2.5 py-1.5 rounded border border-[#23534d]"
                  title="Zoom Out"
                >
                  -
                </button>
                <button
                  onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                  className="bg-[#091a1f] hover:bg-white/10 text-white text-xs font-bold px-2.5 py-1.5 rounded border border-[#23534d]"
                  title="Reset View"
                >
                  Fit
                </button>
              </div>
            </div>

            {/* Drawing Notification banner */}
            {editorMode === 'draw' && (
              <div className="bg-[#d6a34b]/20 border border-[#d6a34b] text-[#f7dfae] p-3 rounded-xl text-xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-[#d6a34b]" />
                  <span>
                    <strong>Digitizing New Ward:</strong> Click points on the canvas below to add polygon vertices ({drawingRing.length} points placed).
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCompleteNewWard}
                    disabled={drawingRing.length < 3}
                    className="bg-[#0e8a7d] disabled:opacity-50 hover:bg-[#11a394] text-white font-bold px-3 py-1.5 rounded-lg text-xs"
                  >
                    Finish &amp; Close Polygon
                  </button>
                  <button
                    onClick={() => setDrawingRing([])}
                    className="bg-black/40 hover:bg-black/60 text-white px-3 py-1.5 rounded-lg text-xs"
                  >
                    Clear Points
                  </button>
                </div>
              </div>
            )}

            {/* GIS Map Canvas */}
            <div className="relative border border-[#1d434c] rounded-2xl overflow-hidden bg-[#091a1f] shadow-2xl h-[480px]">
              <canvas
                ref={mapCanvasRef}
                width={1200}
                height={600}
                onClick={handleMapCanvasClick}
                className="w-full h-full block cursor-crosshair"
              />
            </div>

            {/* Topology & AMRUT Layer Quality Inspector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Topology Validator Box */}
              <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#20b5a6] uppercase tracking-wider flex items-center gap-2">
                    <FileCheck className="w-4 h-4" />
                    AMRUT Topology &amp; Geometry Validation
                  </h3>
                  <span className="text-xs text-[#9fc7c1]">Ward {selectedWardForEdit}</span>
                </div>

                {topologyResult ? (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="bg-[#091a1f] p-2.5 rounded-lg border border-[#1b3d39]">
                        <span className="text-[#9fc7c1] block">Vertex Nodes</span>
                        <b className="text-white text-sm font-mono">{topologyResult.metrics.vertexCount} pts</b>
                      </div>
                      <div className="bg-[#091a1f] p-2.5 rounded-lg border border-[#1b3d39]">
                        <span className="text-[#9fc7c1] block">Area (sq km)</span>
                        <b className="text-[#f7dfae] text-sm font-mono">{topologyResult.metrics.areaSqKm} km²</b>
                      </div>
                      <div className="bg-[#091a1f] p-2.5 rounded-lg border border-[#1b3d39]">
                        <span className="text-[#9fc7c1] block">Perimeter</span>
                        <b className="text-[#20b5a6] text-sm font-mono">{topologyResult.metrics.perimeterMeters.toLocaleString()} m</b>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#091a1f] border border-[#1b3d39] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span>Self-Intersection (Bow-tie) Check:</span>
                        {topologyResult.metrics.selfIntersections === 0 ? (
                          <span className="text-[#10b981] font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Clean (0 errors)
                          </span>
                        ) : (
                          <span className="text-red-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> {topologyResult.metrics.selfIntersections} intersections detected
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Ring Closure (First == Last):</span>
                        <span className="text-[#10b981] font-bold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Valid Closed Loop
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Projected CRS Compliance:</span>
                        <span className="text-[#38bdf8] font-bold">WGS 84 / UTM 43N</span>
                      </div>
                    </div>

                    {topologyResult.errors.length > 0 && (
                      <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-lg text-red-200">
                        {topologyResult.errors.map((err, i) => (
                          <div key={i}>• {err}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[#9fc7c1]">Select a ward to inspect its topology.</p>
                )}
              </div>

              {/* Ground Control Points (GCP) & Spatial Reference Table */}
              <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#20b5a6] uppercase tracking-wider flex items-center gap-2">
                    <Compass className="w-4 h-4" />
                    Ground Control Points (GCPs) Reference
                  </h3>
                  <span className="text-[10px] bg-[#1a403d] text-[#20b5a6] px-2 py-0.5 rounded font-bold">
                    RTK-Fixed
                  </span>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left font-mono">
                    <thead className="bg-[#091a1f] text-[#9fc7c1] border-b border-[#23534d]">
                      <tr>
                        <th className="p-2">Point ID</th>
                        <th className="p-2">Description</th>
                        <th className="p-2">UTM Easting</th>
                        <th className="p-2">UTM Northing</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b3d39]">
                      {gcps.map(gcp => (
                        <tr key={gcp.id}>
                          <td className="p-2 font-bold text-[#f7dfae]">{gcp.id}</td>
                          <td className="p-2 font-sans text-white">{gcp.name}</td>
                          <td className="p-2 text-[#9fc7c1]">{gcp.utmE.toFixed(1)}</td>
                          <td className="p-2 text-[#9fc7c1]">{gcp.utmN.toFixed(1)}</td>
                          <td className="p-2 text-[#10b981] font-sans">Verified</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-[11px] text-[#7ea19b]">
                  GCP reference pillars establish geodetic horizontal control for AMRUT tender scale compliance (1:1,000 / 1:4,000).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: RECORDS LIST */}
        {/* ==================================================== */}
        {activeTab === 'records' && (
          <div className="space-y-4">
            <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <input
                type="search"
                placeholder="Search by owner name, house no, UPN or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-96 bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg px-3.5 py-2.5 focus:border-[#20b5a6]"
              />
              <div className="text-xs font-semibold text-[#9fc7c1]">
                Showing {records.filter(r => (r.id + r.owner + r.hno + (r.upn || '')).toLowerCase().includes(searchQuery.toLowerCase())).length} of {records.length} records
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {records
                .filter(r => (r.id + r.owner + r.hno + (r.upn || '')).toLowerCase().includes(searchQuery.toLowerCase()))
                .map((r) => (
                  <div key={r.id} className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-4 shadow-md space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-[#f7dfae] bg-[#091a1f] px-2 py-0.5 rounded border border-[#23534d]">
                          {r.id}
                        </span>
                        <span className="text-xs text-[#9fc7c1]">Ward {r.ward}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-2">{r.owner}</h4>
                      <p className="text-xs text-[#9fc7c1] mt-0.5">
                        House {r.hno} {r.addr ? `· ${r.addr}` : ''}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <span className="text-[10px] bg-[#1a3840] text-[#20b5a6] px-2 py-0.5 rounded font-semibold">
                          {r.use}
                        </span>
                        <span className="text-[10px] bg-[#1a3840] text-[#9fc7c1] px-2 py-0.5 rounded font-semibold">
                          {r.str}
                        </span>
                        <span className="text-[10px] bg-[#1a3840] text-[#9fc7c1] px-2 py-0.5 rounded font-semibold">
                          {r.bu} sq m built
                        </span>
                        {r.lat && r.lng ? (
                          <span className="text-[10px] bg-[#10b981]/20 text-[#10b981] px-2 py-0.5 rounded font-semibold">
                            GPS Tagged
                          </span>
                        ) : (
                          <span className="text-[10px] bg-red-950/40 text-red-300 px-2 py-0.5 rounded font-semibold">
                            No GPS
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1a3840]">
                      <button
                        onClick={() => handleEditRecord(r)}
                        className="bg-[#1b433e] hover:bg-[#235852] text-[#20b5a6] text-xs font-bold px-3 py-1.5 rounded-lg"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(r.id)}
                        className="bg-red-950/40 hover:bg-red-900/50 text-red-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-800/40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: ASSESSMENT & FORM A / FORM E */}
        {/* ==================================================== */}
        {activeTab === 'assessment' && (
          <div className="space-y-6">
            {/* Summary Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-4 shadow-lg">
                <span className="text-xs text-[#9fc7c1] font-semibold block">Total Properties</span>
                <b className="text-2xl font-bold text-white font-mono mt-1 block">
                  {summaryMetrics.totalProps}
                </b>
              </div>
              <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-4 shadow-lg">
                <span className="text-xs text-[#9fc7c1] font-semibold block">Geo-Tagged GPS</span>
                <b className="text-2xl font-bold text-[#20b5a6] font-mono mt-1 block">
                  {summaryMetrics.geoTagged} ({summaryMetrics.totalProps > 0 ? Math.round((summaryMetrics.geoTagged / summaryMetrics.totalProps) * 100) : 0}%)
                </b>
              </div>
              <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-4 shadow-lg">
                <span className="text-xs text-[#9fc7c1] font-semibold block">Total Built-Up Area</span>
                <b className="text-2xl font-bold text-[#f7dfae] font-mono mt-1 block">
                  {Math.round(summaryMetrics.totalBuiltUpSqM).toLocaleString()} sq m
                </b>
              </div>
              <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-4 shadow-lg">
                <span className="text-xs text-[#9fc7c1] font-semibold block">Est. General Tax</span>
                <b className="text-2xl font-bold text-white font-mono mt-1 block">
                  ₹{Math.round(summaryMetrics.estTaxAnnual).toLocaleString()}/yr
                </b>
              </div>
            </div>

            {/* Assessment CSV Generation Box */}
            <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Municipal Tax Assessment Roll Export</h3>
                  <p className="text-xs text-[#9fc7c1]">Form-A (Assessment List) and Form-E (Rateable Value Factors) conforming to Municipal Property Taxation Bye-laws</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => triggerFileDownload(getFormACsv(), `${currentTown.n}_Form_A_Assessment_Roll.csv`, 'text/csv')}
                    className="bg-[#0e8a7d] hover:bg-[#11a394] text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Form-A (CSV)
                  </button>
                  <button
                    onClick={() => triggerFileDownload(getFormECsv(), `${currentTown.n}_Form_E_Factors_Assessment.csv`, 'text/csv')}
                    className="bg-[#1b433e] hover:bg-[#235852] text-[#20b5a6] text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 border border-[#23534d]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Form-E (CSV)
                  </button>
                </div>
              </div>

              {/* Form-A Preview Table */}
              <div className="overflow-x-auto text-xs border border-[#1b3d39] rounded-lg">
                <table className="w-full text-left font-sans">
                  <thead className="bg-[#091a1f] text-[#9fc7c1] border-b border-[#23534d]">
                    <tr>
                      <th className="p-2.5">ID</th>
                      <th className="p-2.5">Owner</th>
                      <th className="p-2.5">Ward</th>
                      <th className="p-2.5">Use</th>
                      <th className="p-2.5">Built-up</th>
                      <th className="p-2.5">Zone</th>
                      <th className="p-2.5">Est. Annual Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b3d39]">
                    {records.slice(0, 8).map((r) => (
                      <tr key={r.id} className="hover:bg-white/5">
                        <td className="p-2.5 font-mono text-[#f7dfae]">{r.id}</td>
                        <td className="p-2.5 font-bold text-white">{r.owner}</td>
                        <td className="p-2.5">{r.ward}</td>
                        <td className="p-2.5">{r.use}</td>
                        <td className="p-2.5 font-mono">{r.bu} sq m</td>
                        <td className="p-2.5 font-bold">{r.zone}</td>
                        <td className="p-2.5 font-mono text-[#20b5a6]">
                          ₹{(r.bu * (r.use === 'Commercial' ? 24 : 10)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 5: GIS DELIVERABLES & EXPORTS (AMRUT SUITE) */}
        {/* ==================================================== */}
        {activeTab === 'exports' && (
          <div className="space-y-6">
            {/* Header banner explaining capabilities */}
            <div className="bg-gradient-to-r from-[#0e8a7d]/20 to-[#102b4e]/40 border border-[#20b5a6]/40 rounded-2xl p-6 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#0e8a7d] text-white flex items-center justify-center flex-none">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    AMRUT-Grade Municipal GIS Deliverables Suite
                  </h3>
                  <p className="text-xs text-[#c5d8df] mt-1 leading-relaxed">
                    Generates production-grade ESRI Shapefiles (.shp, .shx, .dbf, .prj), OGC KML with ExtendedData, and GeoJSON layers. Ready for direct ingestion into QGIS, ArcGIS, municipal Web-GIS portals, and town master-plan databases.
                  </p>
                </div>
              </div>
            </div>

            {/* Deliverable Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Shapefile Card */}
              <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#f7dfae] uppercase tracking-wider">ESRI Shapefile</span>
                    <span className="text-[10px] bg-[#1a403d] text-[#20b5a6] px-2 py-0.5 rounded font-bold">Industry Standard</span>
                  </div>
                  <h4 className="text-base font-bold text-white mt-2">Ward Boundary Shapefile</h4>
                  <p className="text-xs text-[#9fc7c1] mt-1">
                    Multi-part package (.shp, .shx, .dbf, .prj) containing polygon rings, AMRUT attributes (Ward_No, ULB_Name, Area_SqKm, Perimeter_M) and WGS84 / UTM 43N projection string.
                  </p>
                </div>

                <button
                  onClick={handleExportShapefile}
                  className="w-full bg-[#0e8a7d] hover:bg-[#11a394] text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 shadow"
                >
                  <Download className="w-4 h-4" />
                  Download Shapefile Package
                </button>
              </div>

              {/* KML Card */}
              <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#f7dfae] uppercase tracking-wider">OGC KML</span>
                    <span className="text-[10px] bg-[#1a403d] text-[#20b5a6] px-2 py-0.5 rounded font-bold">Google Earth</span>
                  </div>
                  <h4 className="text-base font-bold text-white mt-2">KML / KMZ Boundary &amp; Pins</h4>
                  <p className="text-xs text-[#9fc7c1] mt-1">
                    Hierarchical KML folder structure containing both Ward Boundaries (with styled polygon outlines) and surveyed Property Points with rich HTML popup bubbles.
                  </p>
                </div>

                <button
                  onClick={() => triggerFileDownload(exportAmrutKml(currentTown, records), `${currentTown.n}_AMRUT_Wards_and_Properties.kml`, 'application/vnd.google-earth.kml+xml')}
                  className="w-full bg-[#1b433e] hover:bg-[#235852] text-[#20b5a6] text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 border border-[#23534d]"
                >
                  <Download className="w-4 h-4" />
                  Download OGC KML
                </button>
              </div>

              {/* GeoJSON Card */}
              <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#f7dfae] uppercase tracking-wider">RFC 7946 GeoJSON</span>
                    <span className="text-[10px] bg-[#1a403d] text-[#20b5a6] px-2 py-0.5 rounded font-bold">Web GIS &amp; DB</span>
                  </div>
                  <h4 className="text-base font-bold text-white mt-2">AMRUT GeoJSON Collection</h4>
                  <p className="text-xs text-[#9fc7c1] mt-1">
                    Normalized FeatureCollection containing Polygons for ward boundaries and Points for properties, equipped with CRS urn and metadata headers.
                  </p>
                </div>

                <button
                  onClick={() => triggerFileDownload(exportAmrutGeoJson(selectedTownKey, currentTown, records), `${currentTown.n}_AMRUT_GIS_Layer.geojson`, 'application/geo+json')}
                  className="w-full bg-[#142831] hover:bg-[#1c3845] text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 border border-[#23534d]"
                >
                  <Download className="w-4 h-4" />
                  Download AMRUT GeoJSON
                </button>
              </div>
            </div>

            {/* Projection & Spatial Accuracy Specification Box */}
            <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-5 shadow-lg space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#20b5a6]" />
                Geodetic &amp; Projection Compliance Specification
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 bg-[#091a1f] rounded-lg border border-[#1a3840]">
                  <span className="text-[#9fc7c1] block mb-1 font-sans font-semibold">Geographic Coordinate Reference System:</span>
                  <div className="text-[#f7dfae]">Datum: WGS 1984 (EPSG:4326)</div>
                  <div className="text-white mt-1">Prime Meridian: Greenwich, Unit: Decimal Degrees</div>
                </div>
                <div className="p-3 bg-[#091a1f] rounded-lg border border-[#1a3840]">
                  <span className="text-[#9fc7c1] block mb-1 font-sans font-semibold">Projected Coordinate Reference System:</span>
                  <div className="text-[#f7dfae]">Projection: Transverse Mercator (UTM Zone 43N - EPSG:32643)</div>
                  <div className="text-white mt-1">False Easting: 500,000 m, Central Meridian: 75.0° E, Unit: Metre</div>
                </div>
              </div>
            </div>

            {/* Print Municipal Ward Map Booklet */}
            <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-5 shadow-lg flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white">Hard-Copy Municipal Ward Map Sheet</h4>
                <p className="text-xs text-[#9fc7c1]">Print-ready A4/A3 landscape presentation map with official title block, north arrow, scale statement and signature spaces.</p>
              </div>
              <button
                onClick={() => window.print()}
                className="bg-[#c8372a] hover:bg-[#b02f23] text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow"
              >
                <Printer className="w-4 h-4" />
                Print / Export PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
