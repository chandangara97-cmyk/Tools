import React from 'react';
import { LogOut, Cloud, CloudOff, AlertTriangle, UploadCloud } from 'lucide-react';
import { useAuth } from '../services/auth';
import { ROLE_LABEL } from '../services/access';
import { BILL_NAME } from './WorkMenu';
import { useSyncState, discardConflict } from '../services/syncQueue';

interface Props {
  localOnlyCount: number;
  canMigrate: boolean;
  onMigrate: () => void;
  onOpenConflict: (id: string) => void;
}

export const SyncBar: React.FC<Props> = ({ localOnlyCount, canMigrate, onMigrate, onOpenConflict }) => {
  const { displayName, role, head, signOut } = useAuth();
  const s = useSyncState();

  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`inline-flex items-center gap-1 rounded px-2 py-1 font-semibold ${s.online ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {s.online ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
          {s.online ? 'Cloud connected' : 'Offline: saved on this device'}
        </span>
        {s.pending > 0 && (
          <span className="rounded px-2 py-1 font-semibold bg-sky-100 text-sky-800">
            {s.flushing ? 'Syncing… ' : ''}{s.pending} change{s.pending > 1 ? 's' : ''} waiting to upload
          </span>
        )}
        <span className="ml-auto text-[#9fc7c1]">
          {displayName} · <b className="text-[#f7dfae]">{role ? ROLE_LABEL[role] : ''}{head ? ` · ${BILL_NAME[head]}` : ''}</b>
        </span>
        <button type="button" onClick={() => void signOut()} className="inline-flex items-center gap-1 text-[#20b5a6] font-bold">
          <LogOut className="w-3 h-3" /> Sign out
        </button>
      </div>

      {s.storageFull && (
        <div className="rounded p-2 text-xs bg-red-950/40 text-red-300 border border-red-800/40">
          Device storage is full. Connect to the internet to upload pending records before adding more.
        </div>
      )}

      {s.conflicts.map((c) => (
        <div key={c.id} className="rounded p-2 text-xs bg-[#d6a34b]/20 text-[#f7dfae] border border-[#d6a34b]/40 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-none mt-0.5" />
          <div className="flex-1">
            <b>{c.id}</b> ({c.rec.owner}, {c.rec.hno}) was not uploaded. {c.reason}
          </div>
          <button type="button" className="font-bold underline" onClick={() => onOpenConflict(c.id)}>Fix</button>
          <button type="button" className="font-bold underline" onClick={() => discardConflict(c.id)}>Dismiss</button>
        </div>
      ))}

      {canMigrate && localOnlyCount > 0 && (
        <div className="rounded p-2 text-xs bg-sky-950/40 text-sky-200 border border-sky-800/40 flex items-center gap-2">
          <UploadCloud className="w-4 h-4 flex-none" />
          <span className="flex-1">{localOnlyCount} record{localOnlyCount > 1 ? 's' : ''} exist only on this device (never uploaded).</span>
          <button type="button" className="font-bold underline" onClick={onMigrate}>Upload to cloud</button>
        </div>
      )}
    </div>
  );
};
