import React from 'react';
import {
  COPYRIGHT_TEXT,
  COPYRIGHT_DEVELOPED_BY,
  COPYRIGHT_CONTACT,
  COPYRIGHT_UDYAM,
} from '../config/copyright';

export function CopyrightFooter({ className = '' }: { className?: string }) {
  return (
    <footer
      className={`w-full px-4 py-4 text-center text-xs text-slate-400 print:hidden ${className}`}
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div>{COPYRIGHT_TEXT}</div>
      <div className="mt-1">{COPYRIGHT_DEVELOPED_BY}</div>
      <div className="mt-0.5 opacity-90">{COPYRIGHT_CONTACT}</div>
      <div className="mt-0.5 opacity-90">{COPYRIGHT_UDYAM}</div>
    </footer>
  );
}

export default CopyrightFooter;
