import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, get, Unsubscribe } from 'firebase/database';
import type { PropertyRecord } from './utils/gisUtils';

// Web API keys are not secrets; access is controlled by database.rules.json + Auth.
const firebaseConfig = {
  apiKey: 'AIzaSyBJw_9j0wP1dY42wfYYDk_3kIMNKZqHujQ',
  authDomain: 'propertytax-1b855.firebaseapp.com',
  databaseURL: 'https://propertytax-1b855-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'propertytax-1b855',
  storageBucket: 'propertytax-1b855.firebasestorage.app',
  messagingSenderId: '1062167049262',
  appId: '1:1062167049262:web:1270c8199c81addce11bbf',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);   // session persists in IndexedDB, so it survives offline reloads
export const db = getDatabase(app);

export function cloudWatchProperties(
  townKey: string,
  onData: (list: PropertyRecord[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onValue(
    ref(db, `properties/${townKey}`),
    (snap) => {
      // properties/{town}/{ward}/{propertyId}: flatten the ward layer into one list.
      const val = snap.val() as Record<string, Record<string, PropertyRecord>> | null;
      const list = val ? Object.values(val).flatMap((wardMap) => Object.values(wardMap)) : [];
      onData(list);
    },
    (err) => onError?.(err),
  );
}

export function cloudWatchConnection(onChange: (online: boolean) => void): Unsubscribe {
  return onValue(ref(db, '.info/connected'), (s) => onChange(!!s.val()));
}

export async function cloudFetchPhotos(townKey: string, id: string): Promise<{ id: string; data: string }[]> {
  const snap = await get(ref(db, `photos/${townKey}/${id}`));
  const val = snap.val() as Record<string, { data: string }> | null;
  return val ? Object.entries(val).map(([pid, v]) => ({ id: pid, data: v.data })) : [];
}
