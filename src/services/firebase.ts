import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, get, onValue, update, push, set, serverTimestamp, runTransaction } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyBJw_9j0wP1dY42wfYYDk_3kIMNKZqHujQ',
  authDomain: 'propertytax-1b855.firebaseapp.com',
  databaseURL: 'https://propertytax-1b855-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'propertytax-1b855',
  storageBucket: 'propertytax-1b855.firebasestorage.app',
  messagingSenderId: '1062167049262',
  appId: '1:1062167049262:web:1270c8199c81addce11bbf',
};
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const cloudAuth = getAuth(app);
export const cloudDb = getDatabase(app);
export { ref, get, onValue, update, push, set, serverTimestamp, runTransaction };
