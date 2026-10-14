import React, { useState } from 'react';
import { Layers, CheckCircle2, Clock, Calendar, Download, Plus, Search, Filter } from 'lucide-react';
import { triggerFileDownload } from '../utils/gisUtils';

interface PlfsSampleUnit {
  id: string;
  fsuNo: string;
  townVillage: string;
  sector: 'Urban' | 'Rural';
  visitNumber: number;
  totalHouseholds: number;
  surveyedHouseholds: number;
  status: 'Completed' | 'In Progress' | 'Pending';
  lastVisitDate: string;
  surveyor: string;
}

export const PlfsWorkspace: React.FC = () => {
  const [samples, setSamples] = useState<PlfsSampleUnit[]>([
    {
      id: 'PLFS-01',
      fsuNo: '102941',
      townVillage: 'Shimla (Ward 14 Oatland)',
      sector: 'Urban',
      visitNumber: 1,
      totalHouseholds: 8,
      surveyedHouseholds: 8,
      status: 'Completed',
      lastVisitDate: '2026-10-08',
      surveyor: 'Chandan Gara'
    },
    {
      id: 'PLFS-02',
      fsuNo: '102942',
      townVillage: 'Solan (Ward 04 Mall)',
      sector: 'Urban',
      visitNumber: 2,
      totalHouseholds: 8,
      surveyedHouseholds: 6,
      status: 'In Progress',
      lastVisitDate: '2026-10-11',
      surveyor: 'A. Sharma'
    },
    {
      id: 'PLFS-03',
      fsuNo: '102943',
      townVillage: 'Dharamsala (Kotwali)',
      sector: 'Urban',
      visitNumber: 3,
      totalHouseholds: 8,
      surveyedHouseholds: 0,
      status: 'Pending',
      lastVisitDate: '2026-10-15',
      surveyor: 'R. Verma'
    },
    {
      id: 'PLFS-04',
      fsuNo: '102944',
      townVillage: 'Mandi (Old Suket Road)',
      sector: 'Urban',
      visitNumber: 1,
      totalHouseholds: 8,
      surveyedHouseholds: 8,
      status: 'Completed',
      lastVisitDate: '2026-10-09',
      surveyor: 'Chandan Gara'
    }
  ]);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = samples.filter(s => {
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchQuery = !search ||
      s.fsuNo.includes(search) ||
      s.townVillage.toLowerCase().includes(search.toLowerCase()) ||
      s.surveyor.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchQuery;
  });

  const totalHh = samples.reduce((a, b) => a + b.totalHouseholds, 0);
  const doneHh = samples.reduce((a, b) => a + b.surveyedHouseholds, 0);

  const handleExportCsv = () => {
    const header = ['Sample ID', 'FSU Number', 'Town/Village', 'Sector', 'Visit No', 'Total HH', 'Surveyed HH', 'Status', 'Date', 'Surveyor'];
    const rows = samples.map(s => [
      s.id, s.fsuNo, `"${s.townVillage}"`, s.sector, s.visitNumber, s.totalHouseholds, s.surveyedHouseholds, s.status, s.lastVisitDate, `"${s.surveyor}"`
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerFileDownload(csv, 'PLFS_Field_Samples_Report_2026.csv', 'text/csv');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0f242d] border border-[#1d434c] rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#2563eb] to-[#38bdf8] flex items-center justify-center text-white shadow-lg font-black">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              PLFS Command Dashboard (2026)
            </h1>
            <p className="text-xs text-[#9fc7c1]">
              Periodic Labour Force Survey · Sample FSU Tracking, Field Visits &amp; Progress Monitoring
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCsv}
          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow"
        >
          <Download className="w-4 h-4" />
          Export FSUs (CSV)
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-4 shadow">
          <span className="text-xs text-[#9fc7c1] block">Total Allocated FSUs</span>
          <b className="text-2xl font-bold text-white font-mono">{samples.length}</b>
        </div>
        <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-4 shadow">
          <span className="text-xs text-[#9fc7c1] block">FSUs Completed</span>
          <b className="text-2xl font-bold text-[#10b981] font-mono">
            {samples.filter(s => s.status === 'Completed').length}
          </b>
        </div>
        <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-4 shadow">
          <span className="text-xs text-[#9fc7c1] block">Households Surveyed</span>
          <b className="text-2xl font-bold text-[#38bdf8] font-mono">{doneHh} / {totalHh}</b>
        </div>
        <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-4 shadow">
          <span className="text-xs text-[#9fc7c1] block">Quarter Completion Rate</span>
          <b className="text-2xl font-bold text-[#f7dfae] font-mono">
            {Math.round((doneHh / totalHh) * 100)}%
          </b>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-[#0f242d] border border-[#1d434c] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#7ea19b] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Filter by FSU number or town..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:border-[#38bdf8]"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
            {['all', 'Completed', 'In Progress', 'Pending'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg font-bold ${
                  filterStatus === st ? 'bg-[#2563eb] text-white' : 'bg-[#091a1f] text-[#9fc7c1] border border-[#23534d]'
                }`}
              >
                {st === 'all' ? 'All Samples' : st}
              </button>
            ))}
          </div>
        </div>

        {/* FSUs Table */}
        <div className="overflow-x-auto border border-[#1b3d39] rounded-xl text-xs font-sans">
          <table className="w-full text-left">
            <thead className="bg-[#091a1f] text-[#9fc7c1] border-b border-[#23534d]">
              <tr>
                <th className="p-3">FSU No</th>
                <th className="p-3">Town / Sample Location</th>
                <th className="p-3">Sector</th>
                <th className="p-3">Visit</th>
                <th className="p-3">Households Done</th>
                <th className="p-3">Status</th>
                <th className="p-3">Surveyor</th>
                <th className="p-3">Last Visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b3d39]">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-white/5">
                  <td className="p-3 font-mono font-bold text-[#f7dfae]">{s.fsuNo}</td>
                  <td className="p-3 font-semibold text-white">{s.townVillage}</td>
                  <td className="p-3">{s.sector}</td>
                  <td className="p-3 font-mono">Visit #{s.visitNumber}</td>
                  <td className="p-3 font-mono">{s.surveyedHouseholds} / {s.totalHouseholds}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.status === 'Completed'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : s.status === 'In Progress'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-red-950 text-red-300 border border-red-800'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3 text-[#9fc7c1]">{s.surveyor}</td>
                  <td className="p-3 font-mono text-[#9fc7c1]">{s.lastVisitDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
