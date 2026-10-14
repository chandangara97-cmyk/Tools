import React, { useState, useMemo } from 'react';
import { Briefcase, Calendar, Calculator, Plus, Trash2, Copy, Printer, Save, RefreshCw, FileText } from 'lucide-react';

interface TaDaRow {
  id: string;
  date: string;
  days: number;
  slab: number; // 1, 0.7, 0.3
  noHotel: boolean;
  mode: string;
  km: number;
  fare: number;
}

interface TourRange {
  id: string;
  from: string;
  to: string;
  days: number;
}

export const OfficeBillsMaster: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'tada' | 'diary' | 'program'>('tada');

  // Employee & Tour Information
  const [name, setName] = useState('Chandan Gara');
  const [designation, setDesignation] = useState<'ENUM' | 'SUP' | 'SSO'>('SUP');
  const [place, setPlace] = useState('Shimla / Solan');
  const [month, setMonth] = useState('2026-10');
  const [year, setYear] = useState('2026');

  // Rates based on designation
  const rates = useMemo(() => {
    if (designation === 'ENUM') return { da: 500, hotel: 900, label: 'Enumerator' };
    if (designation === 'SUP') return { da: 600, hotel: 900, label: 'Survey Supervisor' };
    if (designation === 'SSO') return { da: 1000, hotel: 938, label: 'Senior Statistical Officer' };
    return { da: 0, hotel: 0, label: '' };
  }, [designation]);

  // Tour Ranges
  const [rangeFrom, setRangeFrom] = useState('2026-10-05');
  const [rangeTo, setRangeTo] = useState('2026-10-09');
  const [savedRanges, setSavedRanges] = useState<TourRange[]>([
    { id: '1', from: '2026-10-05', to: '2026-10-09', days: 5 }
  ]);

  // TA/DA Table Rows
  const [rows, setRows] = useState<TaDaRow[]>([
    { id: 'r1', date: '2026-10-05', days: 1, slab: 1, noHotel: false, mode: 'Bus', km: 120, fare: 280 },
    { id: 'r2', date: '2026-10-06', days: 1, slab: 1, noHotel: false, mode: 'Local', km: 15, fare: 50 },
    { id: 'r3', date: '2026-10-07', days: 1, slab: 1, noHotel: false, mode: 'Local', km: 20, fare: 60 },
    { id: 'r4', date: '2026-10-08', days: 1, slab: 1, noHotel: false, mode: 'Local', km: 10, fare: 40 },
    { id: 'r5', date: '2026-10-09', days: 1, slab: 1, noHotel: true, mode: 'Bus', km: 120, fare: 280 }, // Return day no hotel
  ]);

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Range Days Calculation
  const calculatedDays = useMemo(() => {
    if (!rangeFrom || !rangeTo) return 0;
    const d1 = new Date(rangeFrom);
    const d2 = new Date(rangeTo);
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
    return diffDays >= 0 ? diffDays + 1 : 0;
  }, [rangeFrom, rangeTo]);

  const handleAddRange = () => {
    if (!rangeFrom || !rangeTo || calculatedDays <= 0) return;
    const newRange: TourRange = {
      id: String(Date.now()),
      from: rangeFrom,
      to: rangeTo,
      days: calculatedDays,
    };
    setSavedRanges([...savedRanges, newRange]);
  };

  const handleGenerateRowsFromRange = (r: TourRange, append: boolean) => {
    const start = new Date(r.from);
    const generated: TaDaRow[] = [];

    for (let i = 0; i < r.days; i++) {
      const cur = new Date(start);
      cur.setDate(cur.getDate() + i);
      const isLast = i === r.days - 1;
      const iso = cur.toISOString().slice(0, 10);

      generated.push({
        id: `r_${Date.now()}_${i}`,
        date: iso,
        days: 1,
        slab: 1,
        noHotel: isLast,
        mode: i === 0 || isLast ? 'Bus' : 'Local',
        km: i === 0 || isLast ? 120 : 15,
        fare: i === 0 || isLast ? 280 : 50,
      });
    }

    if (append) {
      setRows([...rows, ...generated]);
    } else {
      setRows(generated);
    }
  };

  // Row manipulations
  const handleAddRow = () => {
    const today = new Date().toISOString().slice(0, 10);
    const newRow: TaDaRow = {
      id: String(Date.now()),
      date: today,
      days: 1,
      slab: 1,
      noHotel: false,
      mode: 'Bus',
      km: 0,
      fare: 0,
    };
    setRows([...rows, newRow]);
  };

  const handleDuplicateSelected = () => {
    if (!selectedRowId) return;
    const item = rows.find(r => r.id === selectedRowId);
    if (!item) return;
    const dup: TaDaRow = {
      ...item,
      id: String(Date.now()),
    };
    setRows([...rows, dup]);
  };

  const handleDeleteSelected = () => {
    if (!selectedRowId) return;
    setRows(rows.filter(r => r.id !== selectedRowId));
    setSelectedRowId(null);
  };

  // Calculate totals
  const rowCalculations = useMemo(() => {
    return rows.map((r) => {
      const daAmt = Math.round(r.days * rates.da * r.slab * 100) / 100;
      const isPartial = r.slab < 1;
      const hotelAmt = (isPartial || r.noHotel) ? 0 : r.days * rates.hotel;
      const totalTda = daAmt + hotelAmt;
      const grandRow = totalTda + (Number(r.fare) || 0);

      return {
        ...r,
        daAmt,
        hotelAmt,
        totalTda,
        grandRow,
      };
    });
  }, [rows, rates]);

  const grandTotals = useMemo(() => {
    let totDa = 0, totHotel = 0, totTda = 0, totFare = 0, totGrand = 0;
    rowCalculations.forEach((rc) => {
      totDa += rc.daAmt;
      totHotel += rc.hotelAmt;
      totTda += rc.totalTda;
      totFare += Number(rc.fare) || 0;
      totGrand += rc.grandRow;
    });
    return { totDa, totHotel, totTda, totFare, totGrand };
  }, [rowCalculations]);

  return (
    <div className="min-h-screen bg-[#07161d] text-[#edf3fc] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-[#0f242d] border border-[#1d434c] rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#b45309] to-[#d6a34b] flex items-center justify-center text-[#142238] font-black shadow-md">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Office &amp; Bills Master (HP Field Operations)
              </h1>
              <p className="text-xs text-[#9fc7c1]">
                Integrated TA/DA Calculation Sheet · Daily Tour Diary · Tentative Program (A4 Landscape Fit)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('tada')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${
                activeSubTab === 'tada' ? 'bg-[#b45309] text-white shadow' : 'bg-[#091a1f] text-[#9fc7c1] border border-[#23534d]'
              }`}
            >
              TA/DA Sheet
            </button>
            <button
              onClick={() => setActiveSubTab('diary')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${
                activeSubTab === 'diary' ? 'bg-[#b45309] text-white shadow' : 'bg-[#091a1f] text-[#9fc7c1] border border-[#23534d]'
              }`}
            >
              Daily Diary
            </button>
            <button
              onClick={() => setActiveSubTab('program')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${
                activeSubTab === 'program' ? 'bg-[#b45309] text-white shadow' : 'bg-[#091a1f] text-[#9fc7c1] border border-[#23534d]'
              }`}
            >
              Tentative Program
            </button>
          </div>
        </div>

        {/* ===================================== */}
        {/* VIEW 1: TA/DA CALCULATION SHEET */}
        {/* ===================================== */}
        {activeSubTab === 'tada' && (
          <div className="space-y-6">
            {/* Employee Config Box */}
            <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-5 shadow-lg">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">कर्मचारी का नाम / Officer Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">पदनाम / Designation</label>
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value as any)}
                    className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 font-medium"
                  >
                    <option value="ENUM">Enumerator (DA: ₹500, Hotel: ₹900)</option>
                    <option value="SUP">Survey Supervisor (DA: ₹600, Hotel: ₹900)</option>
                    <option value="SSO">Senior Statistical Officer (DA: ₹1000, Hotel: ₹938)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">मुख्यालय / Place</label>
                  <input
                    type="text"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">माह / Month</label>
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => {
                      setMonth(e.target.value);
                      if (e.target.value) setYear(e.target.value.split('-')[0]);
                    }}
                    className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 font-medium"
                  />
                </div>
              </div>

              {/* Applied Rates Callout */}
              <div className="mt-4 pt-3 border-t border-[#1b3d39] flex items-center justify-between text-xs text-[#9fc7c1] flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-[#f7dfae] font-bold">Applied Rates ({rates.label}):</span>
                  <span>DA: <b>₹{rates.da}</b></span>
                  <span>Hotel: <b>₹{rates.hotel}</b></span>
                  <span className="text-[#7ea19b]">(70% day: ₹{Math.round(rates.da * 0.7)}, 30% day: ₹{Math.round(rates.da * 0.3)})</span>
                </div>
                <div className="text-[#d6a34b]">
                  Tip: Last day of tour auto-disables Hotel allowance.
                </div>
              </div>
            </div>

            {/* Tour Range Generator */}
            <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-4 shadow-lg space-y-3">
              <h3 className="text-xs font-bold text-[#f7dfae] uppercase tracking-wider">
                Tour Range Generator
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#9fc7c1]">From:</span>
                  <input
                    type="date"
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(e.target.value)}
                    className="bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#9fc7c1]">To:</span>
                  <input
                    type="date"
                    value={rangeTo}
                    onChange={(e) => setRangeTo(e.target.value)}
                    className="bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2"
                  />
                </div>
                <div className="text-xs font-mono font-bold text-white px-2 py-1 bg-[#091a1f] rounded border border-[#23534d]">
                  Days: {calculatedDays}
                </div>
                <button
                  onClick={handleAddRange}
                  className="bg-[#0e8a7d] hover:bg-[#11a394] text-white text-xs font-bold px-3 py-2 rounded-lg"
                >
                  Add Range
                </button>
              </div>

              {savedRanges.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {savedRanges.map((r, idx) => (
                    <div key={r.id} className="bg-[#091a1f] border border-[#23534d] rounded-lg p-2 text-xs flex items-center gap-3">
                      <span>Range {idx + 1}: <b>{r.from}</b> to <b>{r.to}</b> ({r.days} days)</span>
                      <button
                        onClick={() => handleGenerateRowsFromRange(r, true)}
                        className="bg-[#1b433e] text-[#20b5a6] px-2 py-0.5 rounded text-[11px] font-bold"
                      >
                        Append Rows
                      </button>
                      <button
                        onClick={() => handleGenerateRowsFromRange(r, false)}
                        className="bg-white/10 text-white px-2 py-0.5 rounded text-[11px]"
                      >
                        Replace
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Table Action Controls */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddRow}
                  className="bg-[#1b433e] hover:bg-[#20524c] text-[#20b5a6] text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
                <button
                  onClick={handleDuplicateSelected}
                  disabled={!selectedRowId}
                  className="bg-[#091a1f] disabled:opacity-50 hover:bg-white/5 text-white text-xs font-bold px-3 py-2 rounded-lg border border-[#23534d] flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate Selected
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={!selectedRowId}
                  className="bg-red-950/40 disabled:opacity-50 hover:bg-red-900/50 text-red-300 text-xs font-bold px-3 py-2 rounded-lg border border-red-800/40 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                </button>
              </div>

              <button
                onClick={() => window.print()}
                className="bg-[#b45309] hover:bg-[#c95f0e] text-white text-xs font-bold px-4 py-2 rounded-lg shadow flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Generate PDF / Print (A4 Fit)
              </button>
            </div>

            {/* Print-Ready TA/DA Table Sheet */}
            <div className="bg-white text-black rounded-xl p-6 shadow-2xl overflow-x-auto print:p-0 print:shadow-none">
              <div className="text-center font-bold text-base mb-4 border-b-2 border-black pb-2">
                दौरा भत्ता / दैनिक भत्ता गणना पत्रक &nbsp;|&nbsp; TA/DA CALCULATION SHEET
                <div className="text-xs font-normal mt-1">
                  National Statistical Office (Field Operations Division) · Himachal Pradesh
                </div>
              </div>

              {/* Sheet Header Metadata */}
              <div className="grid grid-cols-3 gap-4 text-xs font-semibold mb-4 pb-2 border-b border-black">
                <div>नाम / Name: <span className="font-bold underline">{name}</span></div>
                <div>पदनाम / Desig: <span className="font-bold underline">{rates.label}</span></div>
                <div>माह व वर्ष / Month: <span className="font-bold underline">{month}</span></div>
              </div>

              {/* Table */}
              <table className="w-full border-collapse border border-black text-center text-xs font-sans">
                <thead>
                  <tr className="bg-gray-100 font-bold border-b border-black">
                    <th className="border border-black p-1.5" rowSpan={2}>Date</th>
                    <th className="border border-black p-1.5" colSpan={4}>DA Details</th>
                    <th className="border border-black p-1.5" colSpan={3}>Travelling Detail</th>
                    <th className="border border-black p-1.5" rowSpan={2}>Total (₹)</th>
                  </tr>
                  <tr className="bg-gray-50 font-bold border-b border-black">
                    <th className="border border-black p-1.5">Days / Slab</th>
                    <th className="border border-black p-1.5">DA (₹)</th>
                    <th className="border border-black p-1.5">Hotel (₹)</th>
                    <th className="border border-black p-1.5">Total DA</th>
                    <th className="border border-black p-1.5">Mode</th>
                    <th className="border border-black p-1.5">K.M.</th>
                    <th className="border border-black p-1.5">Fare (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {rowCalculations.map((r, idx) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRowId(r.id)}
                      className={`cursor-pointer ${selectedRowId === r.id ? 'bg-blue-100' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="border border-black p-1 font-mono">
                        <input
                          type="date"
                          value={r.date}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRows(rows.map(x => x.id === r.id ? { ...x, date: val } : x));
                          }}
                          className="bg-transparent text-center text-xs w-28 font-mono outline-none"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <select
                          value={r.slab}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setRows(rows.map(x => x.id === r.id ? { ...x, slab: val } : x));
                          }}
                          className="bg-transparent text-xs text-center outline-none"
                        >
                          <option value={1}>100%</option>
                          <option value={0.7}>70%</option>
                          <option value={0.3}>30%</option>
                        </select>
                      </td>
                      <td className="border border-black p-1 font-mono font-bold">
                        ₹{r.daAmt}
                      </td>
                      <td
                        onDoubleClick={() => {
                          setRows(rows.map(x => x.id === r.id ? { ...x, noHotel: !x.noHotel } : x));
                        }}
                        className="border border-black p-1 font-mono cursor-pointer"
                        title="Double-click to toggle No-Hotel"
                      >
                        {r.noHotel ? <span className="text-gray-400">No hotel</span> : `₹${r.hotelAmt}`}
                      </td>
                      <td className="border border-black p-1 font-mono font-bold">
                        ₹{r.totalTda}
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={r.mode}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRows(rows.map(x => x.id === r.id ? { ...x, mode: val } : x));
                          }}
                          className="bg-transparent text-center text-xs w-16 outline-none"
                        />
                      </td>
                      <td className="border border-black p-1 font-mono">
                        <input
                          type="number"
                          value={r.km || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setRows(rows.map(x => x.id === r.id ? { ...x, km: val } : x));
                          }}
                          className="bg-transparent text-center text-xs w-14 font-mono outline-none"
                        />
                      </td>
                      <td className="border border-black p-1 font-mono">
                        <input
                          type="number"
                          value={r.fare || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setRows(rows.map(x => x.id === r.id ? { ...x, fare: val } : x));
                          }}
                          className="bg-transparent text-center text-xs w-16 font-mono font-bold outline-none"
                        />
                      </td>
                      <td className="border border-black p-1 font-mono font-bold text-gray-900">
                        ₹{r.grandRow}
                      </td>
                    </tr>
                  ))}

                  {/* Grand Totals Row */}
                  <tr className="bg-gray-200 font-bold border-t-2 border-black">
                    <td className="border border-black p-2 text-left" colSpan={2}>
                      कुल योग / Grand Total
                    </td>
                    <td className="border border-black p-2 font-mono">₹{grandTotals.totDa}</td>
                    <td className="border border-black p-2 font-mono">₹{grandTotals.totHotel}</td>
                    <td className="border border-black p-2 font-mono">₹{grandTotals.totTda}</td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2 font-mono">₹{grandTotals.totFare}</td>
                    <td className="border border-black p-2 font-mono font-black text-sm">
                      ₹{grandTotals.totGrand}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signature Blocks */}
              <div className="grid grid-cols-2 gap-8 pt-12 text-xs font-bold">
                <div>
                  दिनांक / Date: ____________________
                </div>
                <div className="text-right">
                  हस्ताक्षर कर्मचारी / Signature of Officer: ____________________
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* VIEW 2: DAILY DIARY */}
        {/* ===================================== */}
        {activeSubTab === 'diary' && (
          <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#f7dfae]" />
              Field Daily Diary (दैनिक डायरी)
            </h3>
            <p className="text-xs text-[#9fc7c1]">
              Logs daily tour activities, field enumeration entries, and holiday schedules in sync with the TA/DA monthly bill.
            </p>

            <div className="space-y-3">
              {rowCalculations.map((r, i) => (
                <div key={r.id} className="p-3 bg-[#091a1f] border border-[#1b3d39] rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-[#f7dfae] font-mono">{r.date}</span>
                    <span className="text-[#20b5a6]">{r.mode} ({r.km} km)</span>
                  </div>
                  <div className="text-white">
                    Field visit in {place} · Total daily claim: <b>₹{r.grandRow}</b>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* VIEW 3: TENTATIVE TOUR PROGRAM */}
        {/* ===================================== */}
        {activeSubTab === 'program' && (
          <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#f7dfae]" />
              Tentative Tour Programme (Annexure-III Replica)
            </h3>
            <p className="text-xs text-[#9fc7c1]">
              Advance tour programme prepared for supervisory approval prior to field commencement.
            </p>

            <div className="p-4 bg-white text-black rounded-lg text-xs font-mono space-y-2">
              <div className="text-center font-bold text-sm">
                GOVERNMENT OF INDIA · MINISTRY OF STATISTICS &amp; P.I.
              </div>
              <div className="text-center font-bold">
                TENTATIVE TOUR PROGRAMME OF {name.toUpperCase()} ({rates.label.toUpperCase()})
              </div>
              <div className="text-center text-[11px]">FOR THE MONTH OF {month}</div>

              <div className="border border-black mt-4 p-2">
                Proposed field operations in Shimla / Solan sub-region covering PLFS urban samples and UFS frame scrutiny.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
