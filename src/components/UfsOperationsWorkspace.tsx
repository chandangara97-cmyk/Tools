import React, { useState } from 'react';
import { Calendar, Target, CheckCircle2, Download, TrendingUp, Users } from 'lucide-react';
import { triggerFileDownload } from '../utils/gisUtils';

export const UfsOperationsWorkspace: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'weekly' | 'monthly' | 'action'>('weekly');

  // Weekly entries
  const [weeklyLogs, setWeeklyLogs] = useState([
    {
      weekEnding: '2026-10-09',
      town: 'Baddi',
      blocksAllocated: 6,
      blocksCompleted: 6,
      structuresListed: 142,
      householdsListed: 218,
      status: 'Verified',
      officer: 'SSO Shimla'
    },
    {
      weekEnding: '2026-10-02',
      town: 'Solan',
      blocksAllocated: 8,
      blocksCompleted: 7,
      structuresListed: 180,
      householdsListed: 295,
      status: 'In Review',
      officer: 'Supervisor'
    },
    {
      weekEnding: '2026-09-25',
      town: 'Shimla MC (Ward 14)',
      blocksAllocated: 5,
      blocksCompleted: 5,
      structuresListed: 98,
      householdsListed: 165,
      status: 'Verified',
      officer: 'SSO Shimla'
    }
  ]);

  const [newTown, setNewTown] = useState('Nalagarh');
  const [newBlocks, setNewBlocks] = useState(4);
  const [newStructures, setNewStructures] = useState(85);
  const [newHh, setNewHh] = useState(130);

  const handleAddWeekly = () => {
    const today = new Date().toISOString().slice(0, 10);
    setWeeklyLogs([
      {
        weekEnding: today,
        town: newTown,
        blocksAllocated: newBlocks,
        blocksCompleted: newBlocks,
        structuresListed: newStructures,
        householdsListed: newHh,
        status: 'Submitted',
        officer: 'Field Unit'
      },
      ...weeklyLogs
    ]);
    alert(`Logged weekly update for ${newTown}!`);
  };

  const handleExportWeeklyCsv = () => {
    const header = ['Week Ending', 'Town', 'Blocks Done', 'Structures Listed', 'Households Listed', 'Status', 'Reviewing Officer'];
    const rows = weeklyLogs.map(l => [
      l.weekEnding, `"${l.town}"`, l.blocksCompleted, l.structuresListed, l.householdsListed, l.status, `"${l.officer}"`
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerFileDownload(csv, 'UFS_Weekly_Progress_Report_2026.csv', 'text/csv');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0f242d] border border-[#1d434c] rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#059669] to-[#10b981] flex items-center justify-center text-white shadow-lg font-black">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              UFS Progress &amp; Planning Operations
            </h1>
            <p className="text-xs text-[#9fc7c1]">
              Urban Frame Survey · Weekly Progress Log · Monthly MPR · Target Action Plan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('weekly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              activeSubTab === 'weekly' ? 'bg-[#059669] text-white shadow' : 'bg-[#091a1f] text-[#9fc7c1] border border-[#23534d]'
            }`}
          >
            Weekly Log
          </button>
          <button
            onClick={() => setActiveSubTab('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              activeSubTab === 'monthly' ? 'bg-[#059669] text-white shadow' : 'bg-[#091a1f] text-[#9fc7c1] border border-[#23534d]'
            }`}
          >
            Monthly MPR
          </button>
          <button
            onClick={() => setActiveSubTab('action')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              activeSubTab === 'action' ? 'bg-[#059669] text-white shadow' : 'bg-[#091a1f] text-[#9fc7c1] border border-[#23534d]'
            }`}
          >
            Action Plan Targets
          </button>
        </div>
      </div>

      {activeSubTab === 'weekly' && (
        <div className="space-y-6">
          {/* Quick logger form */}
          <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-5 shadow space-y-4">
            <h3 className="text-xs font-bold text-[#f7dfae] uppercase tracking-wider">
              Log This Week&apos;s Field Accomplishment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Town / Frame Unit</label>
                <input
                  type="text"
                  value={newTown}
                  onChange={e => setNewTown(e.target.value)}
                  className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Blocks Completed</label>
                <input
                  type="number"
                  value={newBlocks}
                  onChange={e => setNewBlocks(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Structures Listed</label>
                <input
                  type="number"
                  value={newStructures}
                  onChange={e => setNewStructures(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Households Count</label>
                <input
                  type="number"
                  value={newHh}
                  onChange={e => setNewHh(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleExportWeeklyCsv}
                className="bg-[#1b433e] hover:bg-[#20524c] text-[#20b5a6] text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 border border-[#23534d]"
              >
                <Download className="w-3.5 h-3.5" /> Export Report (CSV)
              </button>
              <button
                onClick={handleAddWeekly}
                className="bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold px-4 py-2 rounded-lg shadow"
              >
                + Add Weekly Record
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#0f242d] border border-[#1d434c] rounded-2xl p-5 shadow space-y-3">
            <h3 className="text-sm font-bold text-white">Recent Weekly Field Progress</h3>
            <div className="overflow-x-auto text-xs border border-[#1b3d39] rounded-xl font-sans">
              <table className="w-full text-left">
                <thead className="bg-[#091a1f] text-[#9fc7c1] border-b border-[#23534d]">
                  <tr>
                    <th className="p-3">Week Ending</th>
                    <th className="p-3">Town Name</th>
                    <th className="p-3">Blocks Done</th>
                    <th className="p-3">Structures</th>
                    <th className="p-3">Households</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Reviewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b3d39]">
                  {weeklyLogs.map((l, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="p-3 font-mono font-bold text-[#f7dfae]">{l.weekEnding}</td>
                      <td className="p-3 font-semibold text-white">{l.town}</td>
                      <td className="p-3 font-mono">{l.blocksCompleted} blocks</td>
                      <td className="p-3 font-mono">{l.structuresListed}</td>
                      <td className="p-3 font-mono">{l.householdsListed}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {l.status}
                        </span>
                      </td>
                      <td className="p-3 text-[#9fc7c1]">{l.officer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'monthly' && (
        <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-6 shadow space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#10b981]" />
            Monthly Progress Report (MPR) Summary
          </h3>
          <p className="text-xs text-[#9fc7c1]">
            Consolidated month-end return submitted by Sub-Regional Office (SRO) to Regional Office Shimla.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 bg-[#091a1f] rounded-xl border border-[#1b3d39]">
              <span className="text-[#9fc7c1] block font-sans">Month&apos;s Target:</span>
              <b className="text-2xl text-white block mt-1">25 Blocks</b>
            </div>
            <div className="p-4 bg-[#091a1f] rounded-xl border border-[#1b3d39]">
              <span className="text-[#9fc7c1] block font-sans">Actual Scrutinised:</span>
              <b className="text-2xl text-[#10b981] block mt-1">22 Blocks (88%)</b>
            </div>
            <div className="p-4 bg-[#091a1f] rounded-xl border border-[#1b3d39]">
              <span className="text-[#9fc7c1] block font-sans">Total Structures:</span>
              <b className="text-2xl text-[#f7dfae] block mt-1">645 Structures</b>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'action' && (
        <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-6 shadow space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-[#f7dfae]" />
            UFS Phase Action Plan &amp; Targets (2026-27)
          </h3>
          <p className="text-xs text-[#9fc7c1]">
            Town-wise tour allocation and target timeline for Phase formation in Himachal Pradesh.
          </p>
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-[#091a1f] rounded-lg border border-[#1b3d39] flex justify-between items-center">
              <span>Baddi Industrial Frame (Phase 19)</span>
              <b className="text-[#10b981]">100% Completed &amp; Scrutinised</b>
            </div>
            <div className="p-3 bg-[#091a1f] rounded-lg border border-[#1b3d39] flex justify-between items-center">
              <span>Solan Urban Extension (Wards 1-17)</span>
              <b className="text-[#f7dfae]">In Progress (Target: Nov 2026)</b>
            </div>
            <div className="p-3 bg-[#091a1f] rounded-lg border border-[#1b3d39] flex justify-between items-center">
              <span>Shimla Sub-Towns (Jutogh &amp; Dhalli)</span>
              <b className="text-[#38bdf8]">Scheduled for Q4 2026-27</b>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
