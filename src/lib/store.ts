/**
 * Lead storage.
 *
 * Backed by a single JSON file on disk. For the volume a solo photographer
 * sees — tens of inquiries a month — this is genuinely enough, and it means
 * zero database setup to get running.
 *
 * The trade-off: it needs a writable, PERSISTENT disk. That rules out
 * Vercel and other read-only serverless hosts, where the file would vanish
 * between requests. See README "Deploying" for the options.
 *
 * Every read and write goes through this file, so swapping in Postgres later
 * means reimplementing these functions and nothing else.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Lead, Stage } from './types';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'leads.json');

/**
 * Writes are serialised through this promise chain. Two inquiries landing at
 * the same moment would otherwise read-modify-write over each other and one
 * would be lost — which for a lead means a booking you never knew about.
 */
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(fn, fn);
  // Keep the chain alive even if this operation rejects.
  writeQueue = result.catch(() => {});
  return result;
}

async function readAll(): Promise<Lead[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Lead[]) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

async function writeAll(leads: Lead[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  // Write to a temp file and rename, so a crash mid-write cannot leave a
  // truncated file where your entire lead list used to be.
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(leads, null, 2), 'utf8');
  await fs.rename(tmp, DATA_FILE);
}

export async function listLeads(): Promise<Lead[]> {
  const leads = await readAll();
  return leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getLead(id: string): Promise<Lead | null> {
  const leads = await readAll();
  return leads.find((l) => l.id === id) ?? null;
}

export type NewLeadInput = Omit<
  Lead,
  'id' | 'createdAt' | 'updatedAt' | 'stage' | 'notes' | 'followUpsSent' | 'autoReplySent'
>;

export async function createLead(input: NewLeadInput): Promise<Lead> {
  return enqueue(async () => {
    const leads = await readAll();
    const now = new Date().toISOString();
    const lead: Lead = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      stage: 'new',
      notes: [],
      followUpsSent: [],
      autoReplySent: false,
    };
    leads.push(lead);
    await writeAll(leads);
    return lead;
  });
}

export async function updateLead(
  id: string,
  patch: Partial<Pick<Lead, 'stage' | 'autoReplySent' | 'weddingDate' | 'venue' | 'phone'>>,
): Promise<Lead | null> {
  return enqueue(async () => {
    const leads = await readAll();
    const idx = leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    leads[idx] = { ...leads[idx], ...patch, updatedAt: new Date().toISOString() };
    await writeAll(leads);
    return leads[idx];
  });
}

export async function addNote(id: string, body: string): Promise<Lead | null> {
  return enqueue(async () => {
    const leads = await readAll();
    const idx = leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    const lead = leads[idx];
    lead.notes = [...lead.notes, { at: new Date().toISOString(), body }];
    lead.updatedAt = new Date().toISOString();
    await writeAll(leads);
    return lead;
  });
}

export async function recordFollowUp(id: string, key: string): Promise<Lead | null> {
  return enqueue(async () => {
    const leads = await readAll();
    const idx = leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    const lead = leads[idx];
    if (lead.followUpsSent.some((f) => f.key === key)) return lead;
    lead.followUpsSent = [...lead.followUpsSent, { key, at: new Date().toISOString() }];
    lead.updatedAt = new Date().toISOString();
    await writeAll(leads);
    return lead;
  });
}

/** Replaces the whole file. Used by the seed script only. */
export async function replaceAll(leads: Lead[]): Promise<void> {
  return enqueue(() => writeAll(leads));
}

export function countByStage(leads: Lead[]): Record<Stage, number> {
  const counts = {} as Record<Stage, number>;
  for (const lead of leads) {
    counts[lead.stage] = (counts[lead.stage] ?? 0) + 1;
  }
  return counts;
}
