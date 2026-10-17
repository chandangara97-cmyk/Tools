// Permanent property IDs (ULB-WARD-NNNN) and duplicate keys.
import { ref, runTransaction } from 'firebase/database';
import { db } from '../firebase';
import { townCode } from './townPath';

const BLOCK_SIZE = 50;          // numbers reserved per device per ward
const TXN_TIMEOUT_MS = 8000;

/** ULB code: the town's registered code, else a numeric suffix of the key, else first 5 letters. */
export function ulbCode(townKey: string): string {
  const known = townCode(townKey);
  if (known) return known;
  const m = townKey.match(/(\d{5,})$/);
  if (m) return m[1];
  return townKey.replace(/[^a-z0-9]/gi, '').slice(0, 5).toUpperCase() || 'ULB';
}

/** RTDB-safe ward key. */
export function wardKey(ward: string): string {
  return String(ward).trim().replace(/[^A-Za-z0-9]/g, '_') || '0';
}

function wardLabel(ward: string): string {
  const w = wardKey(ward);
  return /^\d+$/.test(w) ? w.padStart(2, '0') : w;
}

export function formatPropertyId(townKey: string, ward: string, n: number): string {
  return `${ulbCode(townKey)}-${wardLabel(ward)}-${String(n).padStart(4, '0')}`;
}

/** Normalise house/plot no. so "14 / B" and "14/b" collide, but "1/45" and "14/5" do not. */
export function normHno(hno: string): string {
  return hno.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '-');
}

export const hnoDupKey = (ward: string, hno: string) => `h_${wardKey(ward)}__${normHno(hno)}`;
export const upnDupKey = (upn: string) => `u_${upn.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

// ---- ID block reservation (works offline once a block is held) ----
interface Block { next: number; end: number } // next inclusive, end exclusive
const blockStore = (townKey: string, ward: string) => `ptax_idblocks_${townKey}_${wardKey(ward)}`;

function readBlocks(townKey: string, ward: string): Block[] {
  try {
    const arr = JSON.parse(localStorage.getItem(blockStore(townKey, ward)) || '[]') as Block[];
    return arr.filter((b) => b.next < b.end);
  } catch { return []; }
}
function writeBlocks(townKey: string, ward: string, blocks: Block[]) {
  try { localStorage.setItem(blockStore(townKey, ward), JSON.stringify(blocks)); } catch { /* storage blocked */ }
}

async function reserveBlock(townKey: string, ward: string): Promise<Block> {
  const counterRef = ref(db, `counters/${townKey}/${wardKey(ward)}`);
  const run = runTransaction(counterRef, (cur) => (typeof cur === 'number' ? cur : 0) + BLOCK_SIZE);
  const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('OFFLINE')), TXN_TIMEOUT_MS));
  const res = await Promise.race([run, timeout]);
  if (!res.committed) throw new Error('Could not reserve ID block');
  const last = res.snapshot.val() as number;
  return { next: last - BLOCK_SIZE + 1, end: last + 1 };
}

/** How many IDs this device can still issue for a ward without network. */
export function idsLeftOffline(townKey: string, ward: string): number {
  return readBlocks(townKey, ward).reduce((n, b) => n + (b.end - b.next), 0);
}

/** Top up the local reserve while online so field work can continue offline. */
export async function prefetchIdBlock(townKey: string, ward: string): Promise<void> {
  if (idsLeftOffline(townKey, ward) >= 10) return;
  try {
    const fresh = await reserveBlock(townKey, ward);
    writeBlocks(townKey, ward, [...readBlocks(townKey, ward), fresh]);
  } catch { /* offline: try again later */ }
}

/** Issue the next permanent ID. Throws 'NO_ID_BLOCK' if offline with no reserved numbers left. */
export async function allocatePropertyId(townKey: string, ward: string): Promise<string> {
  let blocks = readBlocks(townKey, ward);
  if (!blocks.length) {
    try { blocks = [await reserveBlock(townKey, ward)]; }
    catch { throw new Error('NO_ID_BLOCK'); }
  }
  const n = blocks[0].next;
  blocks[0] = { next: n + 1, end: blocks[0].end };
  writeBlocks(townKey, ward, blocks);
  return formatPropertyId(townKey, ward, n);
}
