import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Smartphone, Download, CheckCircle, ExternalLink, Copy, Check, Terminal, X, ShieldCheck } from 'lucide-react';

interface AndroidAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidAppModal: React.FC<AndroidAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install, isAndroid } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'instant' | 'apk'>('instant');

  if (!isOpen) return null;

  const bubblewrapCode = `# 1. Install Google Bubblewrap CLI (Official Google Tool for TWA / Android APK)
npm install -g @bubblewrap/cli

# 2. Initialize Android Project from Scheme Hub 2026 Manifest
bubblewrap init --manifest="${window.location.origin}/manifest.webmanifest"

# 3. Build Signed Android APK
bubblewrap build

# Result: app-release-signed.apk (Ready to install on any Android phone!)`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(bubblewrapCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f242d] border border-[#1d434c] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#1b3d39] flex items-center justify-between bg-[#0b1d24]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#10b981] to-[#20b5a6] flex items-center justify-center text-white shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Android App for Scheme Hub 2026
                <span className="text-[10px] bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 px-2 py-0.5 rounded font-mono font-bold">
                  Field Ready
                </span>
              </h2>
              <p className="text-xs text-[#9fc7c1]">
                Full offline support · Home screen app icon · Full-screen standalone mode
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#9fc7c1] hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#1b3d39] bg-[#091a1f] text-xs font-bold">
          <button
            onClick={() => setActiveTab('instant')}
            className={`flex-1 py-3 text-center transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'instant' ? 'border-b-2 border-[#20b5a6] text-[#20b5a6] bg-white/5' : 'text-[#9fc7c1] hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            1-Tap Install (WebAPK)
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-3 text-center transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'apk' ? 'border-b-2 border-[#20b5a6] text-[#20b5a6] bg-white/5' : 'text-[#9fc7c1] hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Generate Standalone APK
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {activeTab === 'instant' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#091a1f] border border-[#23534d] rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0e8a7d]/30 text-[#20b5a6] flex items-center justify-center font-bold flex-none">
                    ✓
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Direct Android Device Installation</h3>
                    <p className="text-[#9fc7c1] mt-0.5 leading-relaxed">
                      Installs Scheme Hub 2026 directly onto your Android device as a standalone WebAPK. Launches from your app drawer without browser address bar and works completely offline in remote field areas of Himachal Pradesh.
                    </p>
                  </div>
                </div>

                {isInstalled ? (
                  <div className="p-3 bg-[#10b981]/15 border border-[#10b981] rounded-lg text-[#10b981] font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    App is already installed and running in standalone Android mode!
                  </div>
                ) : isInstallable ? (
                  <button
                    onClick={async () => {
                      const ok = await install();
                      if (ok) onClose();
                    }}
                    className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-bold py-3 px-4 rounded-xl shadow-lg text-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    Install App on this Android Device Now
                  </button>
                ) : (
                  <div className="space-y-2 pt-1">
                    <p className="text-white font-semibold">How to install in 2 taps on Android Chrome/Firefox:</p>
                    <ol className="list-decimal list-inside space-y-1 text-[#c5d8df] bg-black/30 p-3 rounded-lg border border-white/5">
                      <li>Tap the <strong>three dots menu (⋮)</strong> in top-right of your browser.</li>
                      <li>Select <strong>&ldquo;Install app&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>.</li>
                      <li>Tap <strong>Install</strong>. The Scheme Hub 2026 icon will appear in your Android app drawer!</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Offline & Hardware Features list */}
              <div className="grid grid-cols-2 gap-3 text-[#9fc7c1]">
                <div className="p-3 bg-[#091a1f] border border-[#1b3d39] rounded-lg">
                  <b className="text-white block mb-0.5">High-Accuracy GPS</b>
                  Uses phone&apos;s GPS hardware chip for high accuracy property tagging.
                </div>
                <div className="p-3 bg-[#091a1f] border border-[#1b3d39] rounded-lg">
                  <b className="text-white block mb-0.5">100% Offline Storage</b>
                  Local storage caches all 67 towns &amp; ward polygons offline.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'apk' && (
            <div className="space-y-4">
              <p className="text-[#c5d8df] leading-relaxed">
                You can generate a signed native <strong>Android APK file (.apk)</strong> or Google Play Store bundle (.aab) directly using Google&apos;s official <strong>Bubblewrap CLI</strong> (Trusted Web Activity standard).
              </p>

              <div className="relative">
                <pre className="bg-[#040d12] text-[#38bdf8] p-4 rounded-xl border border-[#1b3d39] font-mono text-[11px] overflow-x-auto leading-relaxed">
                  {bubblewrapCode}
                </pre>
                <button
                  onClick={handleCopyCode}
                  className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 border border-white/15"
                >
                  {copied ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="p-3 bg-[#091a1f] border border-[#23534d] rounded-lg space-y-1">
                <span className="text-[#f7dfae] font-bold block">Capacitor APK Alternative:</span>
                <p className="text-[#9fc7c1]">
                  You can also wrap this Vite project with <code className="text-[#20b5a6]">npx cap add android &amp;&amp; npx cap run android</code> to generate an Android Studio project with full native Java/Kotlin bindings.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1b3d39] bg-[#091a1f] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#142831] hover:bg-[#1b3642] text-white font-semibold px-4 py-2 rounded-lg text-xs border border-[#23534d]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
