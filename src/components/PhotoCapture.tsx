import React, { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { compressImage, MAX_PHOTOS, newPhotoId } from '../services/photos';

export interface PhotoItem { id: string; data: string; isNew: boolean }

interface Props {
  photos: PhotoItem[];
  onChange: (next: PhotoItem[]) => void;
  disabled?: boolean;
}

export const PhotoCapture: React.FC<Props> = ({ photos, onChange, disabled }) => {
  const input = useRef<HTMLInputElement | null>(null);
  const [err, setErr] = useState('');

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setErr('');
    const room = MAX_PHOTOS - photos.length;
    const added: PhotoItem[] = [];
    for (const f of files.slice(0, Math.max(room, 0))) {
      try { added.push({ id: newPhotoId(), data: await compressImage(f), isNew: true }); }
      catch { setErr('Could not read that photo.'); }
    }
    if (added.length) onChange([...photos, ...added]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs text-[#aab4dc] font-semibold">Building photos ({photos.length}/{MAX_PHOTOS})</label>
        <button type="button" disabled={disabled || photos.length >= MAX_PHOTOS} onClick={() => input.current?.click()}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#9aa8ff] disabled:opacity-40">
          <Camera className="w-3.5 h-3.5" /> Take / add photo
        </button>
        <input ref={input} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={onPick} />
      </div>
      {err && <p className="text-xs text-red-300 mb-2">{err}</p>}
      <div className="flex gap-2 flex-wrap">
        {photos.map((p) => (
          <div key={p.id} className="relative w-24 h-24 rounded-lg overflow-hidden border border-[#2f3a6b]">
            <img src={p.data} alt="Building" className="w-full h-full object-cover" />
            {p.isNew && (
              <button type="button" onClick={() => onChange(photos.filter((x) => x.id !== p.id))}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white" aria-label="Remove photo">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[#8790bd] mt-1">Saved photos cannot be removed here; ask a supervisor.</p>
    </div>
  );
};
