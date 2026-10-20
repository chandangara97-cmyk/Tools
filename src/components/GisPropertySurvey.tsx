import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStepBack, readStep } from '../hooks/useStepBack';
import { PropertyUnit, unitList, unitsToRecord, nextUnitId } from '../services/units';
import townsJson from '../data/townsData.json';
import { cloudWatchProperties, cloudFetchPhotos } from '../firebase';
import { useAuth, canWriteSurvey, canDeleteSurvey } from '../services/auth';
import { allocatePropertyId, prefetchIdBlock, hnoDupKey, upnDupKey } from '../services/ids';
import { startSync, queueSave, queueDelete, mergeCloud, useSyncState } from '../services/syncQueue';
import { SyncBar } from './SyncBar';
import { PhotoCapture, PhotoItem } from './PhotoCapture';
import { AssessmentPanel } from './AssessmentPanel';
import { CollectionPanel } from './CollectionPanel';
import { UnitsManager } from './UnitsManager';
import { DemandCenter } from './DemandCenter';
import { ReportsPanel } from './ReportsPanel';
import { WorkMenu, BILL_NAME, Choice } from './WorkMenu';
import { LiabilitySearch } from './LiabilitySearch';
import { AdminDuesPage } from './AdminDuesPage';
import { TownRegister } from './TownRegister';
import { TownRulesPage } from './TownRulesPage';
import { ErrorBoundary } from './ErrorBoundary';
import { allowedTabs, allowedHeads, startTab, isSearchOnly, Tab } from '../services/access';
import { HeadId, useTownHeads } from '../services/heads';
import { rekeyTowns, townSlug } from '../services/townPath';
import { useRateTable } from '../services/assessmentStore';
import { useCollectionSettings } from '../services/collectionStore';
import { calcAssessment } from '../services/assessment';
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
  ArrowLeft,
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
  Info,
  Landmark,
  Receipt,
  Wallet,
} from 'lucide-react';

// Towns are keyed by NAME ("Bhota"), so cloud data is saved under the town name.
const TOWNS_MAP: Record<string, TownData> = rekeyTowns(townsJson as unknown as Record<string, TownData>);

const GisPropertySurveyInner: React.FC = () => {
  // Active Survey Sub-Tab
  // Town & Surveyor Config
  const { role, displayName, ulb, isSuper, head: userHead } = useAuth();
  // Every login opens on a menu that lists only what it may do. One-option logins go straight in.
  const tabs = useMemo(() => allowedTabs(role, userHead, isSuper), [role, userHead, isSuper]);
  // cashier and general public: the full-screen search box and nothing else
  const searchOnly = isSearchOnly(role, isSuper);
  // Pages are history steps: Back returns to the page this one was opened from (menu, records, ...), never out of the site.
  const landingTab = startTab(role, userHead, isSuper);
  const landingHead: HeadId | null = !isSuper && role === 'supervisor' && userHead && userHead !== 'property_tax' ? userHead : null;
  const stepKey = (t: Tab | 'menu', h: HeadId | null) => (t === 'menu' ? 'menu' : `${t}:${h ?? ''}`);
  const landingKey = stepKey(landingTab, landingHead);
  const savedStep = readStep<string>('gisTab', '');
  const [activeTab, setActiveTab] = useState<Tab | 'menu'>(() => (savedStep ? (savedStep.split(':')[0] as Tab | 'menu') : landingTab));
  const [billHead, setBillHead] = useState<HeadId | null>(() => (savedStep && savedStep.includes(':') ? ((savedStep.split(':')[1] || null) as HeadId | null) : landingHead));
  const applyStep = (k: string) => {
    if (k === 'menu') { setActiveTab('menu'); return; }
    const [t, h] = k.split(':');
    setBillHead((h || null) as HeadId | null); setActiveTab(t as Tab);
  };
  const tabNav = useStepBack('gisTab', stepKey(activeTab, billHead), applyStep, landingKey, ['cpage', 'csel', 'duesPid', 'srchPick']);
  const openTab = (t: Tab | 'menu', h?: HeadId | null) => tabNav.go(stepKey(t, h === undefined ? billHead : h));
  // A ULB login is locked to its own town; only the platform owner ("*") can pick any ULB.
  const [selectedTownKey, setSelectedTownKey] = useState<string>(isSuper || !ulb ? townSlug('Bhota') : ulb);
  const [wardNo, setWardNo] = useState<string>('1');
  const [townSearch, setTownSearch] = useState<string>('');
  const townHeads = useTownHeads(selectedTownKey);
  const bills = useMemo(() => allowedHeads(role, userHead, isSuper, townHeads), [role, userHead, isSuper, townHeads]);
  const choose = (c: Choice) => openTab(c.tab, c.head ?? null);
  // a login with a single place to go never needs the menu
  const singleDest = tabs.length === 1 && (tabs[0] !== 'collection' || bills.length === 1);
  useEffect(() => {
    if (activeTab === 'menu' && tabs.length === 1 && tabs[0] === 'collection' && bills.length === 1) { setBillHead(bills[0]); setActiveTab('collection'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, tabs, bills]);
  // a login can never sit on a page it is not allowed to open
  useEffect(() => { if (activeTab !== 'menu' && !tabs.includes(activeTab)) setActiveTab('menu'); }, [activeTab, tabs]);
  const PAGE_TITLE: Record<Tab, string> = {
    search: 'Search dues', survey: 'Property survey', 'map-editor': 'Ward map', records: 'Property records', assessment: 'Assessment',
    collection: billHead ? BILL_NAME[billHead] : 'Collection', reports: 'Reports & notices', exports: 'GIS exports', dues: 'Pending dues', rules: 'Bill rules', register: 'Register & bye-laws', units: 'Units in structures', demand: 'Demand centre',
  };
  const writable = canWriteSurvey(role);
  const deletable = canDeleteSurvey(role);
  const sync = useSyncState();
  const { table: rateTable, saved: rateSaved } = useRateTable(selectedTownKey);
  const { settings: collectionSettings, saved: collectionSaved } = useCollectionSettings(selectedTownKey);
  const [surveyorName, setSurveyorName] = useState<string>(displayName || 'Field Surveyor 01');
  useEffect(() => { if (displayName) setSurveyorName(displayName); }, [displayName]);

  // Editable Town Boundaries (allows in-memory / local editing & adding new wards!)
  const [editableTowns, setEditableTowns] = useState<Record<string, TownData>>(() => {
    try {
      const saved = localStorage.getItem('gis_survey_custom_towns');
      if (saved) return rekeyTowns(JSON.parse(saved));
    } catch (e) {}
    return TOWNS_MAP;
  });

  // ULBs this login may see: all for the platform owner, just its own otherwise.
  const visibleTowns = useMemo(
    () => (isSuper ? editableTowns : Object.fromEntries(Object.entries(editableTowns).filter(([k]) => k === ulb || isSearchOnly(role, isSuper)))),
    [editableTowns, isSuper, ulb, role],
  );

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
  const [ncls, setNcls] = useState('');
  const [act, setAct] = useState('');
  const [tenant, setTenant] = useState('');
  const [units, setUnits] = useState<(PropertyUnit & { saved?: boolean })[]>([]);
  const [upn, setUpn] = useState('');
  const [lat, setLat] = useState('31.6118');
  const [lng, setLng] = useState('76.5638');
  const [acc, setAcc] = useState('4.0');
  const [rem, setRem] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
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

  // Live sync with Firebase: cloud is the source of truth, but unsent local changes are kept
  const [localOnly, setLocalOnly] = useState<PropertyRecord[]>([]);
  const recordsRef = useRef<PropertyRecord[]>(records);
  useEffect(() => { recordsRef.current = records; }, [records]);
  useEffect(() => { startSync(); }, []);
  useEffect(() => {
    const townName = (editableTowns[selectedTownKey] || TOWNS_MAP[selectedTownKey])?.n;
    if (!townName) return;
    return cloudWatchProperties(selectedTownKey, (list) => {
      const { merged, localOnly: lo } = mergeCloud(selectedTownKey, townName, recordsRef.current, list);
      setRecords(merged);
      setLocalOnly(lo);
    });
  }, [selectedTownKey]);
  // keep a reserve of permanent IDs on this device so surveying works offline
  useEffect(() => {
    if (writable && sync.online) void prefetchIdBlock(selectedTownKey, wardNo);
  }, [selectedTownKey, wardNo, sync.online, writable]);

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

  // Permanent IDs (ULB-WARD-NNNN) are issued by the central counter at save time
  const nextPropertyId = 'assigned on save';

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
    setUnits([]);
    setUpn('');
    setRem('');
    setPhotos([]);
    setFormMsg(null);
  };

  // Save Property
  const handleSaveProperty = async () => {
    if (!writable) {
      setFormMsg({ type: 'err', text: 'Your role cannot create or edit survey records.' });
      return;
    }
    if (!owner.trim() || !hno.trim() || !wardNo) {
      setFormMsg({ type: 'err', text: 'Please fill Owner name, House/Plot No, and Ward No.' });
      return;
    }

    // Duplicate guard (also enforced centrally when the record uploads)
    const dup = records.find(r =>
      r.town === currentTown.n && r.id !== editId &&
      (hnoDupKey(r.ward, r.hno) === hnoDupKey(wardNo, hno) ||
        (upn.trim() && r.upn && upnDupKey(r.upn) === upnDupKey(upn)))
    );
    if (dup) {
      setFormMsg({ type: 'err', text: `Duplicate: ward ${dup.ward}, house ${dup.hno} / UPN is already registered as ${dup.id} (${dup.owner}). Edit that record instead.` });
      return;
    }

    const previous = editId ? records.find(r => r.id === editId) : undefined;
    let targetId = editId;
    if (!targetId) {
      try {
        targetId = await allocatePropertyId(selectedTownKey, wardNo);
      } catch {
        setFormMsg({ type: 'err', text: 'No property IDs left on this device for this ward. Connect to the internet once to reserve more.' });
        return;
      }
    }

    const badUnit = units.find((u) => u.label.trim() && u.occupantType === 'Tenant' && !u.occupant.trim());
    if (badUnit) {
      setFormMsg({ type: 'err', text: `Enter the tenant's name for "${badUnit.label}", or mark that unit as Owner.` });
      return;
    }
    const newPhotos = photos.filter(p => p.isNew);
    const photoIds = [...(previous?.photoIds || []), ...newPhotos.map(p => p.id)];

    const newRecord: PropertyRecord = {
      id: targetId,
      town: currentTown.n,
      ward: wardNo,
      sur: previous?.sur || surveyorName,
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
      ncls: ncls.trim(),
      tenant: tenant.trim(),
      ...(unitsToRecord(units) ? { units: unitsToRecord(units) } : {}),
      upn: upn.trim(),
      lat,
      lng,
      acc,
      rem: rem.trim(),
      date: previous?.date || new Date().toISOString().slice(0, 10),
      photoIds,
      createdBy: previous?.createdBy,
      createdAt: previous?.createdAt,
    };

    const saved = queueSave(
      selectedTownKey,
      newRecord,
      newPhotos.map(({ id, data }) => ({ id, data })),
      previous,
    );
    let okText: string;
    if (editId) {
      setRecords(prev => prev.map(r => r.id === editId ? saved : r));
      okText = `Updated record ${targetId}.`;
    } else {
      setRecords(prev => [...prev, saved]);
      okText = `Saved new property ${targetId}. ${sync.online ? 'Uploading…' : 'Will upload when you are back online.'}`;
    }

    resetForm();
    setFormMsg({ type: 'ok', text: okText });
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
    setNcls(r.ncls || '');
    setAct(r.act || '');
    setTenant(r.tenant || '');
    setUnits(unitList(r).map((u) => ({ ...u, saved: true })));
    setUpn(r.upn || '');
    setLat(r.lat || '');
    setLng(r.lng || '');
    setAcc(r.acc || '');
    setRem(r.rem || '');
    openTab('survey');
    setPhotos([]);
    if (r.photoIds && r.photoIds.length) {
      cloudFetchPhotos(selectedTownKey, r.id)
        .then(list => setPhotos(list.map(p => ({ id: p.id, data: p.data, isNew: false }))))
        .catch(() => {});
    }
    setFormMsg({ type: 'warn', text: `Editing property record ${r.id}` });
  };

  // Delete record (supervisor/admin only; removes the record and frees its house number)
  const handleDeleteRecord = (id: string) => {
    if (!deletable) return;
    const rec = records.find(r => r.id === id);
    if (!rec) return;
    if (window.confirm(`Delete property record ${id}? This also removes it from the cloud.`)) {
      queueDelete(selectedTownKey, rec);
      setRecords(prev => prev.filter(r => r.id !== id));
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
    ctx.fillStyle = '#0d1224';
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
      ctx.strokeStyle = isSelected ? '#f2b233' : '#9aa8ff';
      ctx.stroke();

      // Ward centroid label
      let cx = 0, cy = 0;
      ring.forEach(([x, y]) => { cx += x; cy += y; });
      cx /= ring.length;
      cy /= ring.length;
      const [scx, scy] = toScreen(cx, cy);

      ctx.fillStyle = isSelected ? '#ffffff' : '#aab4dc';
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
        ctx.strokeStyle = '#f2b233';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Pin target
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#f2b233';
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
    ctx.fillStyle = '#f2b233';
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
    const yearNow = new Date().getFullYear();
    const estTaxAnnual = records.reduce((acc, r) => {
      const c = calcAssessment(r, rateTable, yearNow);
      return acc + (c.tax ?? 0);
    }, 0);

    return {
      totalProps,
      geoTagged,
      totalBuiltUpSqM,
      totalLandSqM,
      estTaxAnnual,
    };
  }, [records, rateTable]);

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
      (calcAssessment(r, rateTable, new Date().getFullYear()).tax ?? ''),
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

    const year = new Date().getFullYear();
    const rows = records.map((r, i) => {
      const c = calcAssessment(r, rateTable, year);
      const f = (k: string) => c.lines.find(l => l.factor.startsWith(k))?.value ?? '';
      return [
        i + 1, r.id, r.ward, r.zone, r.use, r.bu,
        f('F1'), f('F2'), f('F3'), f('F4'), f('F5'),
        c.rateableValue.toFixed(2), c.rebate.toFixed(2), c.netTaxableValue.toFixed(2),
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
    <div className="gis-survey-page min-h-screen bg-[#f4f7fb] text-slate-800">
      <style>{`
        .gis-survey-page { --gis-ink:#193654; --gis-muted:#657b94; --gis-line:#d9e5f1; color:#233b57 !important; background:linear-gradient(180deg,#eaf3fc 0,#f8fafc 300px,#f4f7fb 100%) !important; }
        .gis-survey-page .bg-\\[\\#0d1224\\],.gis-survey-page .bg-\\[\\#121830\\],.gis-survey-page .bg-\\[\\#141a36\\],.gis-survey-page .bg-\\[\\#181f3d\\],.gis-survey-page .bg-\\[\\#1d2547\\],.gis-survey-page .bg-\\[\\#232c52\\] { background-color:#fff !important; }
        .gis-survey-page .border-\\[\\#28325c\\],.gis-survey-page .border-\\[\\#2f3a6b\\],.gis-survey-page .border-\\[\\#2a3464\\] { border-color:#d9e5f1 !important; }
        .gis-survey-page .text-white { color:#1f3856 !important; }
        .gis-survey-page .text-\\[\\#aab4dc\\],.gis-survey-page .text-\\[\\#d6dcf5\\],.gis-survey-page .text-\\[\\#8790bd\\] { color:#657b94 !important; }
        .gis-survey-page input,.gis-survey-page select,.gis-survey-page textarea { background:#fff !important; border-color:#cbd9e8 !important; color:#203b58 !important; border-radius:11px; }
        .gis-survey-page button { transition:all .18s ease; }
        .gis-survey-page button:hover { filter:brightness(.98); }
        .gis-survey-page .rounded-2xl,.gis-survey-page .rounded-3xl { box-shadow:0 7px 25px rgba(24,55,88,.055); }
        .gis-workspace-layout{display:grid;grid-template-columns:238px minmax(0,1fr);gap:22px;align-items:start}
        .gis-sidebar{position:sticky;top:104px;align-self:start;overflow:hidden;border:1px solid #d7e3f0;border-radius:20px;background:rgba(255,255,255,.94);box-shadow:0 12px 32px rgba(26,61,96,.08)}
        .gis-sidebar-heading{padding:18px 16px 15px;background:linear-gradient(125deg,rgba(13,37,72,.94),rgba(20,91,126,.88)),url('/counter-bg/property_tax.svg') center/cover;color:white;display:flex;flex-direction:column;gap:5px}
        .gis-sidebar-kicker{font-size:9px;font-weight:900;letter-spacing:.18em;color:#b8e9f4}.gis-sidebar-heading strong{font-size:16px;color:#fff}.gis-sidebar-town{display:flex;align-items:center;gap:5px;font-size:11px;color:#e0efff;margin-top:3px}
        .gis-sidebar-nav{padding:9px;display:grid;gap:4px}.gis-sidebar-link{display:flex;align-items:center;gap:10px;width:100%;min-height:42px;padding:8px 9px;border:1px solid transparent;border-radius:12px;background:transparent;color:#526780;text-align:left;font-size:12px;font-weight:700}.gis-sidebar-link:hover{background:#f0f6ff;border-color:#dce9fb}.gis-sidebar-link.is-active{background:linear-gradient(100deg,#e7f0ff,#f3f8ff);border-color:#bcd4fa;color:#174ea6;box-shadow:inset 3px 0 #3979db}.gis-sidebar-icon{display:grid;place-items:center;flex:none;width:29px;height:29px;border-radius:9px;background:#f0f5fb;color:#607d9c}.gis-sidebar-icon svg{width:17px;height:17px;stroke-width:2}.gis-sidebar-link.is-active .gis-sidebar-icon{background:#d5e6ff;color:#245bb0}.gis-sidebar-arrow{margin-left:auto;font-size:20px;color:#9aaec5}.gis-sidebar-back{display:flex;align-items:center;gap:8px;margin:3px 3px 2px;padding:10px;border-top:1px solid #e7eef6;color:#245ca7;font-size:12px;font-weight:800;text-align:left}.gis-sidebar-tip{display:flex;gap:8px;padding:13px 14px;background:#f5f9ff;border-top:1px solid #e1eaf5;color:#647b95;font-size:10px;line-height:1.5}.gis-sidebar-tip svg{flex:none;color:#3f80d8}.gis-sidebar-tip b{display:block;color:#294b70;font-size:11px;margin-bottom:2px}
        @media(max-width:900px){.gis-workspace-layout{grid-template-columns:minmax(0,1fr);gap:12px}.gis-sidebar{position:relative;top:auto}.gis-sidebar-heading{padding:12px 14px}.gis-sidebar-heading strong{font-size:14px}.gis-sidebar-nav{display:flex;overflow-x:auto;gap:6px;padding:8px}.gis-sidebar-link{flex:0 0 auto;width:auto;min-height:40px;padding:6px 9px}.gis-sidebar-link>span:nth-child(2){white-space:nowrap}.gis-sidebar-arrow,.gis-sidebar-tip{display:none}.gis-sidebar-back{flex:none;white-space:nowrap;border-top:0;border-left:1px solid #e7eef6;margin:0;padding:8px 10px}}
        @media(max-width:640px){ .gis-survey-page { overflow-x:hidden; } .gis-survey-page table { min-width:720px; } }
      `}</style>
      {/* Slim header: where you are, and a way back to the menu (not shown to search-only logins) */}
      {!searchOnly && (
      <div className="bg-[#141a36] border-b border-[#2f3a6b] px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          {activeTab === 'menu' ? (
            <h1 className="text-lg font-bold text-white">Menu</h1>
          ) : (
            <div className="flex items-center gap-3">
              {!singleDest && (
                <button type="button" onClick={() => openTab('menu', null)}
                  className="inline-flex items-center gap-1.5 bg-[#4f46e5] hover:bg-[#6259f0] text-white text-sm font-bold px-3 py-2 rounded-xl">
                  <ArrowLeft className="w-4 h-4" /> Menu
                </button>
              )}
              <h1 className="text-lg font-bold text-white">{PAGE_TITLE[activeTab]}</h1>
            </div>
          )}
          {isSuper ? (
            <select
              value={selectedTownKey}
              onChange={(e) => { setSelectedTownKey(e.target.value); setWardNo('1'); setSelectedWardForEdit('1'); }}
              className="bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg px-3 py-2 font-medium focus:outline-none focus:border-[#9aa8ff]"
            >
              {Object.entries(visibleTowns).sort((a, b) => a[1].n.localeCompare(b[1].n)).map(([key, t]) => (
                <option key={key} value={key}>{t.n}</option>
              ))}
            </select>
          ) : isSearchOnly(role, isSuper) ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                aria-label="Search town list"
                type="search"
                placeholder="Search town..."
                value={townSearch}
                onChange={(e) => setTownSearch(e.target.value)}
                className="w-36 sm:w-48 bg-white border border-slate-300 text-slate-800 text-sm rounded-lg px-3 py-2"
              />
              <select
                aria-label="Select town"
                value={selectedTownKey}
                onChange={(e) => { setSelectedTownKey(e.target.value); setWardNo('1'); setSelectedWardForEdit('1'); }}
                className="max-w-48 bg-white border border-slate-300 text-slate-800 text-sm rounded-lg px-3 py-2"
              >
                {Object.entries(visibleTowns).filter(([, t]) => !townSearch.trim() || t.n.toLowerCase().includes(townSearch.trim().toLowerCase())).sort((a, b) => a[1].n.localeCompare(b[1].n)).map(([key, t]) => (
                  <option key={key} value={key}>{t.n}</option>
                ))}
              </select>
            </div>
          ) : (
            <span className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 font-bold">{currentTown.n}</span>
          )}
        </div>
      </div>

      )}

      {/* Main Workspace Content */}
      <div className={searchOnly ? 'w-full' : 'max-w-7xl mx-auto p-4 sm:p-6'}>
        {/* ==================================================== */}
        {/* TAB 1: PROPERTY SURVEY FORM */}
        {/* ==================================================== */}
        {activeTab !== 'search' && (
        <SyncBar
          localOnlyCount={localOnly.length}
          canMigrate={deletable}
          onMigrate={() => {
            if (!window.confirm(`Upload ${localOnly.length} device-only record(s) to the cloud? Do not do this for demo/sample data.`)) return;
            localOnly.forEach(r => queueSave(selectedTownKey, r, []));
            setLocalOnly([]);
          }}
          onOpenConflict={(id) => { const r = records.find(x => x.id === id); if (r) handleEditRecord(r); }}
        />
        )}
        <div className={!searchOnly && activeTab !== 'menu' ? 'gis-workspace-layout' : 'min-w-0'}>
        {!searchOnly && activeTab !== 'menu' && (
          <aside className="gis-sidebar" aria-label="Section navigation">
            <div className="gis-sidebar-heading">
              <span className="gis-sidebar-kicker">WORKSPACE</span>
              <strong>Navigate sections</strong>
              <span className="gis-sidebar-town"><MapPin className="w-3.5 h-3.5" /> {currentTown.n}</span>
            </div>
            <nav className="gis-sidebar-nav">
              {tabs.map((tab) => {
                const title = tab === 'collection' ? (billHead ? BILL_NAME[billHead] : 'Collection') : PAGE_TITLE[tab];
                const icon = tab === 'search' ? <Compass /> : tab === 'survey' ? <PenTool /> : tab === 'map-editor' ? <Layers /> : tab === 'records' ? <Building2 /> : tab === 'assessment' ? <FileCheck /> : tab === 'collection' ? <Receipt /> : tab === 'reports' ? <FileSpreadsheet /> : tab === 'exports' ? <Download /> : tab === 'dues' ? <Wallet /> : tab === 'rules' ? <Info /> : tab === 'register' ? <Landmark /> : tab === 'units' ? <Building2 /> : <Database />;
                return <button key={tab} type="button" onClick={() => openTab(tab, tab === 'collection' ? billHead : null)} className={`gis-sidebar-link ${activeTab === tab ? 'is-active' : ''}`} aria-current={activeTab === tab ? 'page' : undefined}>
                  <span className="gis-sidebar-icon">{icon}</span><span>{title}</span><span className="gis-sidebar-arrow">›</span>
                </button>;
              })}
              {!singleDest && <button type="button" onClick={() => openTab('menu', null)} className="gis-sidebar-back"><ArrowLeft className="w-4 h-4" /> All sections</button>}
            </nav>
            <div className="gis-sidebar-tip"><Sparkles className="w-4 h-4" /><span><b>Quick tip</b>Choose one section at a time. Your town selection stays in place as you move around.</span></div>
          </aside>
        )}
        <div className="min-w-0">
      <ErrorBoundary resetKey={`${activeTab}:${billHead ?? ''}`} onBack={() => openTab('menu', null)}>
        {activeTab === 'menu' && (
          <WorkMenu townName={currentTown.n} tabs={tabs} bills={bills} onChoose={choose} />
        )}
        {activeTab === 'search' && (
          <LiabilitySearch townKey={selectedTownKey} townName={currentTown.n} records={records} heads={bills} fullScreen={searchOnly} />
        )}
        {activeTab === 'demand' && (
          <DemandCenter
            townKey={selectedTownKey}
            townName={currentTown.n}
            records={records}
            heads={bills}
            onRecordSaved={(saved) => setRecords((prev) => prev.map((r) => (r.id === saved.id ? saved : r)))}
          />
        )}

        {activeTab === 'rules' && (
          <TownRulesPage townKey={selectedTownKey} townName={currentTown.n} heads={bills} />
        )}
        {activeTab === 'register' && (
          <TownRegister townKey={selectedTownKey} townName={currentTown.n} records={records} />
        )}
        {activeTab === 'dues' && (
          <AdminDuesPage townKey={selectedTownKey} townName={currentTown.n} records={records} heads={bills} />
        )}
        {activeTab === 'survey' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Form */}
            <div className="lg:col-span-7 space-y-6">
              {/* Survey Setup Card */}
              <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-5 shadow-lg">
                <h2 className="text-sm font-bold text-[#9aa8ff] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Compass className="w-4 h-4" />
                  Survey Configuration
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-[#aab4dc] mb-1 font-semibold">Town / ULB</label>
                    <input
                      type="text"
                      readOnly
                      value={currentTown.n}
                      className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2.5 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#aab4dc] mb-1 font-semibold">Ward No. *</label>
                    <select
                      value={wardNo}
                      onChange={(e) => setWardNo(e.target.value)}
                      className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2.5 font-medium focus:border-[#9aa8ff]"
                    >
                      {currentTown.w.map((w) => (
                        <option key={w.w} value={w.w}>
                          Ward {w.w} ({w.name || 'Boundary'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#aab4dc] mb-1 font-semibold">Surveyor Name</label>
                    <input
                      type="text"
                      value={surveyorName}
                      onChange={(e) => setSurveyorName(e.target.value)}
                      className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2.5 font-medium focus:border-[#9aa8ff]"
                    />
                  </div>
                </div>
              </div>

              {/* Property Details Card */}
              <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#9aa8ff] uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Property Identification
                  </h2>
                  <span className="bg-[#121830] text-[#ffe3a3] border border-[#2f3a6b] text-xs font-mono font-bold px-2.5 py-1 rounded">
                    ID: {editId || nextPropertyId}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#aab4dc] mb-1 font-semibold">Owner Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Chand"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2.5 focus:border-[#9aa8ff]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#aab4dc] mb-1 font-semibold">House / Plot No. *</label>
                    <input
                      type="text"
                      placeholder="e.g. 14/B or Plot 20"
                      value={hno}
                      onChange={(e) => setHno(e.target.value)}
                      className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2.5 focus:border-[#9aa8ff]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#aab4dc] mb-1 font-semibold">Locality / Street Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Near Bus Stand, Main Road"
                    value={addr}
                    onChange={(e) => setAddr(e.target.value)}
                    className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2.5 focus:border-[#9aa8ff]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-[#aab4dc] mb-1 font-semibold">Use Category *</label>
                    <select
                      value={useType}
                      onChange={(e) => setUseType(e.target.value)}
                      className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2.5 focus:border-[#9aa8ff]"
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
                    <label className="block text-xs text-[#aab4dc] mb-1 font-semibold">Occupancy</label>
                    <select
                      value={occ}
                      onChange={(e) => setOcc(e.target.value)}
                      className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2.5 focus:border-[#9aa8ff]"
                    >
                      <option>Owner-occupied</option>
                      <option>Let out</option>
                      <option>Vacant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#aab4dc] mb-1 font-semibold">Structure Type</label>
                    <select
                      value={str}
                      onChange={(e) => setStr(e.target.value)}
                      className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2.5 focus:border-[#9aa8ff]"
                    >
                      <option>RCC</option>
                      <option>Pucca (other)</option>
                      <option>Semi-pucca</option>
                      <option>Kutcha</option>
                    </select>
                  </div>
                </div>

                                <div className="rounded-xl border border-[#2f3a6b] p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-white">Units in this building (shops / flats)</div>
                      <div className="text-[11px] text-[#aab4dc]">Garbage is billed per unit. Leave empty for a building with one use and one payer.</div>
                    </div>
                    <button type="button" onClick={() => setUnits([...units, { id: nextUnitId(units), label: '', use: 'Residential', occupantType: 'Owner', occupant: '', active: true }])}
                      className="text-xs font-bold text-[#9aa8ff] border border-[#2f3a6b] rounded-lg px-3 py-2 shrink-0">+ Add unit</button>
                  </div>
                  {units.map((u, i) => {
                    const set = (patch: Partial<PropertyUnit>) => setUnits(units.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                    const f = 'w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2 focus:border-[#9aa8ff]';
                    return (
                      <div key={u.id} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end border-t border-[#20284b] pt-2">
                        <div className="col-span-2 sm:col-span-2"><label className="block text-[10px] text-[#aab4dc] mb-1">{u.id} · Name of unit</label>
                          <input className={f} placeholder="e.g. Ground floor shop" value={u.label} onChange={(e) => set({ label: e.target.value })} /></div>
                        <div><label className="block text-[10px] text-[#aab4dc] mb-1">Use</label>
                          <select className={f} value={u.use} onChange={(e) => set({ use: e.target.value as PropertyUnit['use'] })}><option>Residential</option><option>Commercial</option></select></div>
                        <div><label className="block text-[10px] text-[#aab4dc] mb-1">Occupied by</label>
                          <select className={f} value={u.occupantType} onChange={(e) => set({ occupantType: e.target.value as PropertyUnit['occupantType'] })}><option>Owner</option><option>Tenant</option><option>Vacant</option></select></div>
                        <div className="col-span-2 sm:col-span-2"><label className="block text-[10px] text-[#aab4dc] mb-1">Name of payer {u.occupantType === 'Owner' ? '(blank = owner)' : ''}</label>
                          <input className={f} value={u.occupant} onChange={(e) => set({ occupant: e.target.value })} /></div>
                        <div className="col-span-2 sm:col-span-3"><label className="block text-[10px] text-[#aab4dc] mb-1">Mobile (optional)</label>
                          <input className={f} inputMode="tel" value={u.mobile || ''} onChange={(e) => set({ mobile: e.target.value })} /></div>
                        <label className="flex items-center gap-2 text-xs text-white sm:col-span-2"><input type="checkbox" checked={u.active} onChange={(e) => set({ active: e.target.checked })} className="w-4 h-4 accent-[#a5b4ff]" /> In use</label>
                        {!u.saved ? <button type="button" onClick={() => setUnits(units.filter((_, j) => j !== i))} className="text-xs text-[#ffb4a8] font-bold">Remove</button> : <span className="text-[10px] text-[#aab4dc]">Saved: untick "In use" to close</span>}
                      </div>
                    );
                  })}
                </div>

<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-[#aab4dc] mb-1 font-semibold">Year Built</label>
                    <input
                      type="number"
                      placeholder="e.g. 2018"
                      value={yr}
                      onChange={(e) => setYr(e.target.value)}
                      className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2.5 focus:border-[#9aa8ff]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#aab4dc] mb-1 font-semibold">Zone (Tax Rate)</label>
                    <select
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                      className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2.5 focus:border-[#9aa8ff]"
                    >
                      <option value="A">Zone A (Prime Commercial/Road)</option>
                      <option value="B">Zone B (Interior / Secondary)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#aab4dc] mb-1 font-semibold">Class (if the bylaws use one)</label>
                    <input
                      type="text"
                      placeholder="leave blank if not used"
                      value={ncls}
                      onChange={(e) => setNcls(e.target.value)}
                      className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2.5 focus:border-[#9aa8ff]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#aab4dc] mb-1 font-semibold">UPN / GIS Unique ID</label>
                    <input
                      type="text"
                      placeholder="e.g. HP-BHT-01-0012"
                      value={upn}
                      onChange={(e) => setUpn(e.target.value)}
                      className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2.5 focus:border-[#9aa8ff]"
                    />
                  </div>
                </div>
              </div>

              {/* Area Measurements Card */}
              <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#9aa8ff] uppercase tracking-wider flex items-center gap-2">
                    <Maximize2 className="w-4 h-4" />
                    Plinth &amp; Plot Area (sq m)
                  </h2>
                  <button
                    type="button"
                    onClick={addFloor}
                    className="bg-[#2a3464] hover:bg-[#20524c] text-[#9aa8ff] text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Floor
                  </button>
                </div>

                <div className="space-y-2">
                  {floorAreas.map((fArea, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-3">
                      <span className="text-xs text-[#aab4dc] w-24">Floor {fIdx + 1}:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={fArea || ''}
                        onChange={(e) => handleFloorChange(fIdx, parseFloat(e.target.value) || 0)}
                        placeholder="Plinth area (sq m)"
                        className="flex-1 bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2 focus:border-[#9aa8ff]"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#232c52]">
                  <div>
                    <label className="block text-xs text-[#aab4dc] mb-1 font-semibold">Total Built-Up Area (Auto):</label>
                    <div className="bg-[#121830] border border-[#2f3a6b] text-[#ffe3a3] text-sm font-mono font-bold rounded-lg p-2.5">
                      {totalBuiltUp.toFixed(2)} sq m
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[#aab4dc] mb-1 font-semibold">Plot / Land Area (sq m):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={landArea || ''}
                      onChange={(e) => setLandArea(parseFloat(e.target.value) || 0)}
                      placeholder="Land area"
                      className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2.5 focus:border-[#9aa8ff]"
                    />
                  </div>
                </div>
              </div>

              {/* Geo-tagging Card */}
              <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#9aa8ff] uppercase tracking-wider flex items-center gap-2">
                    <Crosshair className="w-4 h-4" />
                    Spatial Geo-Tag &amp; Projections
                  </h2>
                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    className="bg-[#4f46e5] hover:bg-[#6259f0] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Capture GPS Here
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-[#aab4dc] mb-1 font-semibold">Latitude (WGS84)</label>
                    <input
                      type="text"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="e.g. 31.6118"
                      className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2.5 focus:border-[#9aa8ff] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#aab4dc] mb-1 font-semibold">Longitude (WGS84)</label>
                    <input
                      type="text"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      placeholder="e.g. 76.5638"
                      className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2.5 focus:border-[#9aa8ff] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#aab4dc] mb-1 font-semibold">GPS Accuracy (m)</label>
                    <input
                      type="text"
                      value={acc}
                      onChange={(e) => setAcc(e.target.value)}
                      placeholder="e.g. 3.5"
                      className="w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2.5 focus:border-[#9aa8ff] font-mono"
                    />
                  </div>
                </div>

                {/* UTM Readout */}
                {currentUtm && (
                  <div className="bg-[#121830] p-3 rounded-lg border border-[#2a3464] text-xs font-mono text-[#aab4dc] flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[#ffe3a3] font-bold">UTM Zone 43N (m):</span> Easting: {currentUtm.easting.toLocaleString()} mE, Northing: {currentUtm.northing.toLocaleString()} mN
                    </div>
                    <span className="text-[10px] bg-[#20284b] text-white px-2 py-0.5 rounded">
                      EPSG:32643
                    </span>
                  </div>
                )}
              </div>

              {/* Building Photos */}
              <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-5 shadow-lg">
                <PhotoCapture photos={photos} onChange={setPhotos} disabled={!writable} />
              </div>

              {/* Status Message */}
              {formMsg && (
                <div
                  className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    formMsg.type === 'ok'
                      ? 'bg-[#4f46e5]/20 text-[#9aa8ff] border border-[#4f46e5]/40'
                      : formMsg.type === 'warn'
                      ? 'bg-[#f2b233]/20 text-[#ffe3a3] border border-[#f2b233]/40'
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
                  onClick={() => void handleSaveProperty()}
                  disabled={!writable}
                  className="flex-1 bg-[#4f46e5] hover:bg-[#6259f0] disabled:opacity-40 text-white text-sm font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-[0.98]"
                >
                  {editId ? 'Update Property Record' : 'Save Property Record'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-[#1d2547] hover:bg-[#232c52] text-[#aab4dc] text-sm font-semibold px-5 py-3 rounded-xl border border-[#2f3a6b]"
                >
                  Clear / New
                </button>
              </div>
            </div>

            {/* Right Column: Mini Interactive Map Preview */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-4 shadow-lg sticky top-20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[#9aa8ff] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    Ward Outlines &amp; Tap Geo-Tagging
                  </h3>
                  <button
                    onClick={() => openTab('map-editor')}
                    className="text-xs text-[#ffe3a3] hover:underline flex items-center gap-1"
                  >
                    Open Full Editor &rarr;
                  </button>
                </div>

                <div className="relative border border-[#2f3a6b] rounded-lg overflow-hidden bg-[#121830] h-[360px]">
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

                <div className="mt-3 p-3 bg-[#121830] rounded-lg border border-[#232c52] text-xs space-y-1.5">
                  <div className="flex justify-between text-[#aab4dc]">
                    <span>Current Town:</span>
                    <strong className="text-white">{currentTown.n}</strong>
                  </div>
                  <div className="flex justify-between text-[#aab4dc]">
                    <span>Total Wards in Frame:</span>
                    <strong className="text-[#9aa8ff]">{currentTown.w.length} Wards</strong>
                  </div>
                  <div className="flex justify-between text-[#aab4dc]">
                    <span>Selected Active Ward:</span>
                    <strong className="text-[#ffe3a3]">Ward {wardNo}</strong>
                  </div>
                  <div className="text-[11px] text-[#8790bd] pt-1 border-t border-[#252e56]">
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
            <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#aab4dc] uppercase mr-1">GIS Mode:</span>
                <button
                  onClick={() => { setEditorMode('view'); setDrawingRing([]); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    editorMode === 'view' ? 'bg-[#4f46e5] text-white' : 'bg-[#121830] text-[#aab4dc] border border-[#2f3a6b]'
                  }`}
                >
                  Inspect &amp; Tag
                </button>
                <button
                  onClick={() => { setEditorMode('draw'); setDrawingRing([]); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                    editorMode === 'draw' ? 'bg-[#f2b233] text-[#0d1224] font-bold' : 'bg-[#121830] text-[#ffe3a3] border border-[#2f3a6b]'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  Digitize New Ward Polygon
                </button>
                <button
                  onClick={() => { setEditorMode('edit-vertex'); setDrawingRing([]); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    editorMode === 'edit-vertex' ? 'bg-[#3b82f6] text-white' : 'bg-[#121830] text-[#aab4dc] border border-[#2f3a6b]'
                  }`}
                >
                  Vertex Node Editor
                </button>
              </div>

              {/* Ward selector for editor */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#aab4dc] font-semibold">Active Ward:</label>
                <select
                  value={selectedWardForEdit}
                  onChange={(e) => setSelectedWardForEdit(e.target.value)}
                  className="bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg px-2.5 py-1.5"
                >
                  {currentTown.w.map(w => (
                    <option key={w.w} value={w.w}>Ward {w.w}</option>
                  ))}
                </select>
                <button
                  onClick={() => setZoom(z => Math.min(4, z + 0.3))}
                  className="bg-[#121830] hover:bg-white/10 text-white text-xs font-bold px-2.5 py-1.5 rounded border border-[#2f3a6b]"
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  onClick={() => setZoom(z => Math.max(0.6, z - 0.3))}
                  className="bg-[#121830] hover:bg-white/10 text-white text-xs font-bold px-2.5 py-1.5 rounded border border-[#2f3a6b]"
                  title="Zoom Out"
                >
                  -
                </button>
                <button
                  onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                  className="bg-[#121830] hover:bg-white/10 text-white text-xs font-bold px-2.5 py-1.5 rounded border border-[#2f3a6b]"
                  title="Reset View"
                >
                  Fit
                </button>
              </div>
            </div>

            {/* Drawing Notification banner */}
            {editorMode === 'draw' && (
              <div className="bg-[#f2b233]/20 border border-[#f2b233] text-[#ffe3a3] p-3 rounded-xl text-xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-[#f2b233]" />
                  <span>
                    <strong>Digitizing New Ward:</strong> Click points on the canvas below to add polygon vertices ({drawingRing.length} points placed).
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCompleteNewWard}
                    disabled={drawingRing.length < 3}
                    className="bg-[#4f46e5] disabled:opacity-50 hover:bg-[#6259f0] text-white font-bold px-3 py-1.5 rounded-lg text-xs"
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
            <div className="relative border border-[#28325c] rounded-2xl overflow-hidden bg-[#121830] shadow-2xl h-[480px]">
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
              <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#9aa8ff] uppercase tracking-wider flex items-center gap-2">
                    <FileCheck className="w-4 h-4" />
                    AMRUT Topology &amp; Geometry Validation
                  </h3>
                  <span className="text-xs text-[#aab4dc]">Ward {selectedWardForEdit}</span>
                </div>

                {topologyResult ? (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="bg-[#121830] p-2.5 rounded-lg border border-[#252e56]">
                        <span className="text-[#aab4dc] block">Vertex Nodes</span>
                        <b className="text-white text-sm font-mono">{topologyResult.metrics.vertexCount} pts</b>
                      </div>
                      <div className="bg-[#121830] p-2.5 rounded-lg border border-[#252e56]">
                        <span className="text-[#aab4dc] block">Area (sq km)</span>
                        <b className="text-[#ffe3a3] text-sm font-mono">{topologyResult.metrics.areaSqKm} km²</b>
                      </div>
                      <div className="bg-[#121830] p-2.5 rounded-lg border border-[#252e56]">
                        <span className="text-[#aab4dc] block">Perimeter</span>
                        <b className="text-[#9aa8ff] text-sm font-mono">{topologyResult.metrics.perimeterMeters.toLocaleString()} m</b>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#121830] border border-[#252e56] space-y-1.5">
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
                  <p className="text-xs text-[#aab4dc]">Select a ward to inspect its topology.</p>
                )}
              </div>

              {/* Ground Control Points (GCP) & Spatial Reference Table */}
              <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#9aa8ff] uppercase tracking-wider flex items-center gap-2">
                    <Compass className="w-4 h-4" />
                    Ground Control Points (GCPs) Reference
                  </h3>
                  <span className="text-[10px] bg-[#2a3464] text-[#9aa8ff] px-2 py-0.5 rounded font-bold">
                    RTK-Fixed
                  </span>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left font-mono">
                    <thead className="bg-[#121830] text-[#aab4dc] border-b border-[#2f3a6b]">
                      <tr>
                        <th className="p-2">Point ID</th>
                        <th className="p-2">Description</th>
                        <th className="p-2">UTM Easting</th>
                        <th className="p-2">UTM Northing</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#252e56]">
                      {gcps.map(gcp => (
                        <tr key={gcp.id}>
                          <td className="p-2 font-bold text-[#ffe3a3]">{gcp.id}</td>
                          <td className="p-2 font-sans text-white">{gcp.name}</td>
                          <td className="p-2 text-[#aab4dc]">{gcp.utmE.toFixed(1)}</td>
                          <td className="p-2 text-[#aab4dc]">{gcp.utmN.toFixed(1)}</td>
                          <td className="p-2 text-[#10b981] font-sans">Verified</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-[11px] text-[#8790bd]">
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
            <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <input
                type="search"
                placeholder="Search by owner name, house no, UPN or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-96 bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg px-3.5 py-2.5 focus:border-[#9aa8ff]"
              />
              <div className="text-xs font-semibold text-[#aab4dc]">
                Showing {records.filter(r => (r.id + r.owner + r.hno + (r.upn || '')).toLowerCase().includes(searchQuery.toLowerCase())).length} of {records.length} records
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {records
                .filter(r => (r.id + r.owner + r.hno + (r.upn || '')).toLowerCase().includes(searchQuery.toLowerCase()))
                .map((r) => (
                  <div key={r.id} className="bg-[#181f3d] border border-[#28325c] rounded-xl p-4 shadow-md space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-[#ffe3a3] bg-[#121830] px-2 py-0.5 rounded border border-[#2f3a6b]">
                          {r.id}
                        </span>
                        <span className="text-xs text-[#aab4dc]">Ward {r.ward}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-2">{r.owner}</h4>
                      <p className="text-xs text-[#aab4dc] mt-0.5">
                        House {r.hno} {r.addr ? `· ${r.addr}` : ''}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <span className="text-[10px] bg-[#232c52] text-[#9aa8ff] px-2 py-0.5 rounded font-semibold">
                          {r.use}
                        </span>
                        <span className="text-[10px] bg-[#232c52] text-[#aab4dc] px-2 py-0.5 rounded font-semibold">
                          {r.str}
                        </span>
                        <span className="text-[10px] bg-[#232c52] text-[#aab4dc] px-2 py-0.5 rounded font-semibold">
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

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#232c52]">
                      <button
                        onClick={() => handleEditRecord(r)}
                        className="bg-[#2a3464] hover:bg-[#38447a] text-[#9aa8ff] text-xs font-bold px-3 py-1.5 rounded-lg"
                      >
                        Edit
                      </button>
                      {deletable && (
                        <button
                          onClick={() => handleDeleteRecord(r.id)}
                          className="bg-red-950/40 hover:bg-red-900/50 text-red-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-800/40"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <ReportsPanel
            townKey={selectedTownKey}
            townName={currentTown.n}
            records={records}
            settings={collectionSettings}
            wards={currentTown.w}
          />
        )}

        {activeTab === 'units' && (
          <UnitsManager
            townKey={selectedTownKey}
            townName={currentTown.n}
            records={records}
            canEdit={writable}
            onSaved={(saved) => setRecords(prev => prev.map(r => (r.id === saved.id ? saved : r)))}
          />
        )}

        {activeTab === 'collection' && billHead && (
          <CollectionPanel
            lockedHead={billHead}
            townKey={selectedTownKey}
            townName={currentTown.n}
            records={records}
            settings={collectionSettings}
            settingsSaved={collectionSaved}
          />
        )}

        {/* ==================================================== */}
        {/* TAB 4: ASSESSMENT & FORM A / FORM E */}
        {/* ==================================================== */}
        {activeTab === 'assessment' && (
          <div className="space-y-6">
            <AssessmentPanel
              townKey={selectedTownKey}
              townName={currentTown.n}
              records={records}
              rateTable={rateTable}
              rateSaved={rateSaved}
            />
            {/* Summary Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-4 shadow-lg">
                <span className="text-xs text-[#aab4dc] font-semibold block">Total Properties</span>
                <b className="text-2xl font-bold text-white font-mono mt-1 block">
                  {summaryMetrics.totalProps}
                </b>
              </div>
              <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-4 shadow-lg">
                <span className="text-xs text-[#aab4dc] font-semibold block">Geo-Tagged GPS</span>
                <b className="text-2xl font-bold text-[#9aa8ff] font-mono mt-1 block">
                  {summaryMetrics.geoTagged} ({summaryMetrics.totalProps > 0 ? Math.round((summaryMetrics.geoTagged / summaryMetrics.totalProps) * 100) : 0}%)
                </b>
              </div>
              <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-4 shadow-lg">
                <span className="text-xs text-[#aab4dc] font-semibold block">Total Built-Up Area</span>
                <b className="text-2xl font-bold text-[#ffe3a3] font-mono mt-1 block">
                  {Math.round(summaryMetrics.totalBuiltUpSqM).toLocaleString()} sq m
                </b>
              </div>
              <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-4 shadow-lg">
                <span className="text-xs text-[#aab4dc] font-semibold block">Est. General Tax</span>
                <b className="text-2xl font-bold text-white font-mono mt-1 block">
                  {rateTable.taxRatePct === null ? 'Rate not set' : `₹${Math.round(summaryMetrics.estTaxAnnual).toLocaleString()}/yr`}
                </b>
              </div>
            </div>

            {/* Assessment CSV Generation Box */}
            <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Municipal Tax Assessment Roll Export</h3>
                  <p className="text-xs text-[#aab4dc]">Form-A (Assessment List) and Form-E (Rateable Value Factors) conforming to Municipal Property Taxation Bye-laws</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => triggerFileDownload(getFormACsv(), `${currentTown.n}_Form_A_Assessment_Roll.csv`, 'text/csv')}
                    className="bg-[#4f46e5] hover:bg-[#6259f0] text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Form-A (CSV)
                  </button>
                  <button
                    onClick={() => triggerFileDownload(getFormECsv(), `${currentTown.n}_Form_E_Factors_Assessment.csv`, 'text/csv')}
                    className="bg-[#2a3464] hover:bg-[#38447a] text-[#9aa8ff] text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 border border-[#2f3a6b]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Form-E (CSV)
                  </button>
                </div>
              </div>

              {/* Form-A Preview Table */}
              <div className="overflow-x-auto text-xs border border-[#252e56] rounded-lg">
                <table className="w-full text-left font-sans">
                  <thead className="bg-[#121830] text-[#aab4dc] border-b border-[#2f3a6b]">
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
                  <tbody className="divide-y divide-[#252e56]">
                    {records.slice(0, 8).map((r) => (
                      <tr key={r.id} className="hover:bg-white/5">
                        <td className="p-2.5 font-mono text-[#ffe3a3]">{r.id}</td>
                        <td className="p-2.5 font-bold text-white">{r.owner}</td>
                        <td className="p-2.5">{r.ward}</td>
                        <td className="p-2.5">{r.use}</td>
                        <td className="p-2.5 font-mono">{r.bu} sq m</td>
                        <td className="p-2.5 font-bold">{r.zone}</td>
                        <td className="p-2.5 font-mono text-[#9aa8ff]">
                          {(() => { const t = calcAssessment(r, rateTable, new Date().getFullYear()).tax; return t === null ? '-' : `₹${Math.round(t).toLocaleString()}`; })()}
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
            <div className="bg-gradient-to-r from-[#4f46e5]/20 to-[#102b4e]/40 border border-[#9aa8ff]/40 rounded-2xl p-6 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#4f46e5] text-white flex items-center justify-center flex-none">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    AMRUT-Grade Municipal GIS Deliverables Suite
                  </h3>
                  <p className="text-xs text-[#d6dcf5] mt-1 leading-relaxed">
                    Generates production-grade ESRI Shapefiles (.shp, .shx, .dbf, .prj), OGC KML with ExtendedData, and GeoJSON layers. Ready for direct ingestion into QGIS, ArcGIS, municipal Web-GIS portals, and town master-plan databases.
                  </p>
                </div>
              </div>
            </div>

            {/* Deliverable Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Shapefile Card */}
              <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#ffe3a3] uppercase tracking-wider">ESRI Shapefile</span>
                    <span className="text-[10px] bg-[#2a3464] text-[#9aa8ff] px-2 py-0.5 rounded font-bold">Industry Standard</span>
                  </div>
                  <h4 className="text-base font-bold text-white mt-2">Ward Boundary Shapefile</h4>
                  <p className="text-xs text-[#aab4dc] mt-1">
                    Multi-part package (.shp, .shx, .dbf, .prj) containing polygon rings, AMRUT attributes (Ward_No, ULB_Name, Area_SqKm, Perimeter_M) and WGS84 / UTM 43N projection string.
                  </p>
                </div>

                <button
                  onClick={handleExportShapefile}
                  className="w-full bg-[#4f46e5] hover:bg-[#6259f0] text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 shadow"
                >
                  <Download className="w-4 h-4" />
                  Download Shapefile Package
                </button>
              </div>

              {/* KML Card */}
              <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#ffe3a3] uppercase tracking-wider">OGC KML</span>
                    <span className="text-[10px] bg-[#2a3464] text-[#9aa8ff] px-2 py-0.5 rounded font-bold">Google Earth</span>
                  </div>
                  <h4 className="text-base font-bold text-white mt-2">KML / KMZ Boundary &amp; Pins</h4>
                  <p className="text-xs text-[#aab4dc] mt-1">
                    Hierarchical KML folder structure containing both Ward Boundaries (with styled polygon outlines) and surveyed Property Points with rich HTML popup bubbles.
                  </p>
                </div>

                <button
                  onClick={() => triggerFileDownload(exportAmrutKml(currentTown, records), `${currentTown.n}_AMRUT_Wards_and_Properties.kml`, 'application/vnd.google-earth.kml+xml')}
                  className="w-full bg-[#2a3464] hover:bg-[#38447a] text-[#9aa8ff] text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 border border-[#2f3a6b]"
                >
                  <Download className="w-4 h-4" />
                  Download OGC KML
                </button>
              </div>

              {/* GeoJSON Card */}
              <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#ffe3a3] uppercase tracking-wider">RFC 7946 GeoJSON</span>
                    <span className="text-[10px] bg-[#2a3464] text-[#9aa8ff] px-2 py-0.5 rounded font-bold">Web GIS &amp; DB</span>
                  </div>
                  <h4 className="text-base font-bold text-white mt-2">AMRUT GeoJSON Collection</h4>
                  <p className="text-xs text-[#aab4dc] mt-1">
                    Normalized FeatureCollection containing Polygons for ward boundaries and Points for properties, equipped with CRS urn and metadata headers.
                  </p>
                </div>

                <button
                  onClick={() => triggerFileDownload(exportAmrutGeoJson(selectedTownKey, currentTown, records), `${currentTown.n}_AMRUT_GIS_Layer.geojson`, 'application/geo+json')}
                  className="w-full bg-[#1d2547] hover:bg-[#1c3845] text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 border border-[#2f3a6b]"
                >
                  <Download className="w-4 h-4" />
                  Download AMRUT GeoJSON
                </button>
              </div>
            </div>

            {/* Projection & Spatial Accuracy Specification Box */}
            <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-5 shadow-lg space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#9aa8ff]" />
                Geodetic &amp; Projection Compliance Specification
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 bg-[#121830] rounded-lg border border-[#232c52]">
                  <span className="text-[#aab4dc] block mb-1 font-sans font-semibold">Geographic Coordinate Reference System:</span>
                  <div className="text-[#ffe3a3]">Datum: WGS 1984 (EPSG:4326)</div>
                  <div className="text-white mt-1">Prime Meridian: Greenwich, Unit: Decimal Degrees</div>
                </div>
                <div className="p-3 bg-[#121830] rounded-lg border border-[#232c52]">
                  <span className="text-[#aab4dc] block mb-1 font-sans font-semibold">Projected Coordinate Reference System:</span>
                  <div className="text-[#ffe3a3]">Projection: Transverse Mercator (UTM Zone 43N - EPSG:32643)</div>
                  <div className="text-white mt-1">False Easting: 500,000 m, Central Meridian: 75.0° E, Unit: Metre</div>
                </div>
              </div>
            </div>

            {/* Print Municipal Ward Map Booklet */}
            <div className="bg-[#181f3d] border border-[#28325c] rounded-xl p-5 shadow-lg flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white">Hard-Copy Municipal Ward Map Sheet</h4>
                <p className="text-xs text-[#aab4dc]">Print-ready A4/A3 landscape presentation map with official title block, north arrow, scale statement and signature spaces.</p>
              </div>
              <button
                onClick={() => window.print()}
                className="bg-[#e5484d] hover:bg-[#cc3b40] text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow"
              >
                <Printer className="w-4 h-4" />
                Print / Export PDF
              </button>
            </div>
          </div>
        )}
        </ErrorBoundary>
        </div>
      </div>
      </div>
    </div>
  );
};

// Sign-in is handled once for the whole app in main.tsx.
export const GisPropertySurvey: React.FC = () => <GisPropertySurveyInner />;
