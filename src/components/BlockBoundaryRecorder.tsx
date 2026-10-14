import React, { useState } from 'react';
import { Mic, MicOff, Save, ArrowLeft, ArrowRight, CheckCircle2, FileText, Download } from 'lucide-react';
import { triggerFileDownload } from '../utils/gisUtils';

export const BlockBoundaryRecorder: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [town, setTown] = useState('Baddi');
  const [ward, setWard] = useState('02');
  const [block, setBlock] = useState('08');
  const [north, setNorth] = useState('');
  const [east, setEast] = useState('');
  const [south, setSouth] = useState('');
  const [west, setWest] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [savedRecords, setSavedRecords] = useState<any[]>([
    {
      town: 'Baddi',
      ward: '02',
      block: '05',
      north: 'Starting from Bridge on River Sirsa moving along the PWD road up to Power House.',
      east: 'From Power House moving south along the factory boundary wall up to Gate 2.',
      south: 'From Gate 2 moving along the village path up to Old Well.',
      west: 'From Old Well moving along the drainage line back to Sirsa Bridge (point of start).'
    }
  ]);

  const toggleMic = (targetField: 'north' | 'east' | 'south' | 'west') => {
    // Web Speech API check
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type the description.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (targetField === 'north') setNorth(prev => prev ? `${prev} ${transcript}` : transcript);
        if (targetField === 'east') setEast(prev => prev ? `${prev} ${transcript}` : transcript);
        if (targetField === 'south') setSouth(prev => prev ? `${prev} ${transcript}` : transcript);
        if (targetField === 'west') setWest(prev => prev ? `${prev} ${transcript}` : transcript);
      };

      recognition.start();
    } catch (e: any) {
      alert(`Voice recognition error: ${e.message}`);
    }
  };

  const handleSave = () => {
    const rec = { town, ward, block, north, east, south, west };
    setSavedRecords([...savedRecords, rec]);
    setStep(6); // Review step
  };

  const handleExportCsv = () => {
    const header = ['Town', 'Ward', 'Block', 'North Description', 'East Description', 'South Description', 'West Description'];
    const rows = savedRecords.map(r => [
      `"${r.town}"`, r.ward, r.block, `"${r.north}"`, `"${r.east}"`, `"${r.south}"`, `"${r.west}"`
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerFileDownload(csv, `UFS_Block_Descriptions_${town}_Ward${ward}.csv`, 'text/csv');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0f242d] border border-[#1d434c] rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#be123c] to-[#f43f5e] flex items-center justify-center text-white shadow-lg font-black">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Block Boundary Description Recorder
            </h1>
            <p className="text-xs text-[#9fc7c1]">
              Enter &amp; verify UFS block boundaries by direction (N / E / S / W) · Hands-free voice dictation
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCsv}
          className="bg-[#be123c] hover:bg-[#9f1239] text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow"
        >
          <Download className="w-4 h-4" />
          Export All Descriptions (CSV)
        </button>
      </div>

      {/* Stepper Wizard Card */}
      <div className="bg-[#0f242d] border border-[#1d434c] rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between text-xs font-bold text-[#9fc7c1] border-b border-[#1b3d39] pb-3">
          <span>Step {step} of 6</span>
          <span className="text-[#f7dfae]">
            {step === 1 && '1. Identify Town, Ward & Block'}
            {step === 2 && '2. North Boundary Description'}
            {step === 3 && '3. East Boundary Description'}
            {step === 4 && '4. South Boundary Description'}
            {step === 5 && '5. West Boundary Description'}
            {step === 6 && '6. Saved & Verified Review'}
          </span>
        </div>

        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Block Identification</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[#9fc7c1] mb-1">Town Name:</label>
                <input
                  type="text"
                  value={town}
                  onChange={e => setTown(e.target.value)}
                  className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9fc7c1] mb-1">Ward Number:</label>
                <input
                  type="text"
                  value={ward}
                  onChange={e => setWard(e.target.value)}
                  className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9fc7c1] mb-1">Block Number:</label>
                <input
                  type="text"
                  value={block}
                  onChange={e => setBlock(e.target.value)}
                  className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-2.5"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setStep(2)}
                className="bg-[#0e8a7d] hover:bg-[#11a394] text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-1.5"
              >
                Next: North Boundary &rarr;
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: North */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#38bdf8]">▲ North Boundary Description</h3>
              <button
                type="button"
                onClick={() => toggleMic('north')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                  isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-[#091a1f] text-[#38bdf8] border border-[#38bdf8]'
                }`}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                {isListening ? 'Listening...' : 'Voice Dictate'}
              </button>
            </div>
            <textarea
              rows={4}
              value={north}
              onChange={e => setNorth(e.target.value)}
              placeholder="e.g. Starting from PWD road junction moving east along the ridge covering structure 1 to 14 up to old temple..."
              className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-3 font-sans leading-relaxed"
            />
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="text-xs text-[#9fc7c1] hover:text-white">&larr; Back</button>
              <button onClick={() => setStep(3)} className="bg-[#0e8a7d] text-white text-xs font-bold px-5 py-2.5 rounded-lg">Next: East &rarr;</button>
            </div>
          </div>
        )}

        {/* STEP 3: East */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#f59e0b]">► East Boundary Description</h3>
              <button
                type="button"
                onClick={() => toggleMic('east')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                  isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-[#091a1f] text-[#f59e0b] border border-[#f59e0b]'
                }`}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                {isListening ? 'Listening...' : 'Voice Dictate'}
              </button>
            </div>
            <textarea
              rows={4}
              value={east}
              onChange={e => setEast(e.target.value)}
              placeholder="e.g. From old temple moving south along the ward boundary wall..."
              className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-3 font-sans leading-relaxed"
            />
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="text-xs text-[#9fc7c1] hover:text-white">&larr; Back</button>
              <button onClick={() => setStep(4)} className="bg-[#0e8a7d] text-white text-xs font-bold px-5 py-2.5 rounded-lg">Next: South &rarr;</button>
            </div>
          </div>
        )}

        {/* STEP 4: South */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#10b981]">▼ South Boundary Description</h3>
              <button
                type="button"
                onClick={() => toggleMic('south')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                  isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-[#091a1f] text-[#10b981] border border-[#10b981]'
                }`}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                {isListening ? 'Listening...' : 'Voice Dictate'}
              </button>
            </div>
            <textarea
              rows={4}
              value={south}
              onChange={e => setSouth(e.target.value)}
              placeholder="e.g. From village border moving west along the nullah..."
              className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-3 font-sans leading-relaxed"
            />
            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="text-xs text-[#9fc7c1] hover:text-white">&larr; Back</button>
              <button onClick={() => setStep(5)} className="bg-[#0e8a7d] text-white text-xs font-bold px-5 py-2.5 rounded-lg">Next: West &rarr;</button>
            </div>
          </div>
        )}

        {/* STEP 5: West */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#ec4899]">◄ West Boundary Description</h3>
              <button
                type="button"
                onClick={() => toggleMic('west')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                  isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-[#091a1f] text-[#ec4899] border border-[#ec4899]'
                }`}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                {isListening ? 'Listening...' : 'Voice Dictate'}
              </button>
            </div>
            <textarea
              rows={4}
              value={west}
              onChange={e => setWest(e.target.value)}
              placeholder="e.g. Moving north along the road back to the point of start..."
              className="w-full bg-[#091a1f] border border-[#23534d] text-white text-xs rounded-lg p-3 font-sans leading-relaxed"
            />
            <div className="flex justify-between">
              <button onClick={() => setStep(4)} className="text-xs text-[#9fc7c1] hover:text-white">&larr; Back</button>
              <button onClick={handleSave} className="bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-1.5 shadow">
                <CheckCircle2 className="w-4 h-4" /> Save Description
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Review */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="p-4 bg-[#10b981]/15 border border-[#10b981] rounded-xl text-[#10b981] text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Description for {town} Ward {ward} Block {block} has been recorded!
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setStep(1); setNorth(''); setEast(''); setSouth(''); setWest(''); }} className="bg-[#0e8a7d] text-white text-xs font-bold px-4 py-2 rounded-lg">
                + Record Another Block
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Saved Records List */}
      <div className="bg-[#0f242d] border border-[#1d434c] rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white">Recorded Block Descriptions ({savedRecords.length})</h3>
        <div className="space-y-3">
          {savedRecords.map((r, i) => (
            <div key={i} className="p-4 bg-[#091a1f] border border-[#1b3d39] rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-white border-b border-[#162f33] pb-2">
                <span>{r.town} · Ward {r.ward} · Block {r.block}</span>
                <span className="text-[#20b5a6] font-mono">Recorded</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[#c5d8df]">
                <div><b className="text-[#38bdf8]">North:</b> {r.north}</div>
                <div><b className="text-[#f59e0b]">East:</b> {r.east}</div>
                <div><b className="text-[#10b981]">South:</b> {r.south}</div>
                <div><b className="text-[#ec4899]">West:</b> {r.west}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
