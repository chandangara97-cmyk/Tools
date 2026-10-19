// Keeps the app's idea of "now" on the database server's clock, not the phone's.
// Firebase reports how far this device's clock is from the server in `.info/serverTimeOffset`.
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { setClock } from './collection';

let offset = 0;
export const serverNow = () => Date.now() + offset;

try {
  onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
    const v = snap.val();
    if (typeof v === 'number' && isFinite(v)) offset = v;
  }, () => { /* offline or denied: keep the last known offset */ });
} catch { /* no database in this environment (tests) */ }

setClock(serverNow);
