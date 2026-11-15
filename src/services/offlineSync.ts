import { Ticket } from '../types';

export interface OfflineSyncOperation {
  id: string;
  type: 'TICKET_SYNC' | 'WHATSAPP_SEND';
  createdAt: number;
  payload: any;
  retries: number;
  lastError?: string;
}

const OFFLINE_QUEUE_KEY = 'kin_gaming_hub_offline_queue_v1';

export function getOfflineQueue(): OfflineSyncOperation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: OfflineSyncOperation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('kgh-offline-queue-updated', { detail: { count: queue.length } }));
  } catch {
    // Ignore storage quota errors
  }
}

export function enqueueOfflineOperation(type: OfflineSyncOperation['type'], payload: any): void {
  const queue = getOfflineQueue();
  // Dédupliquer TICKET_SYNC par signedToken pour garder l'état le plus récent du ticket
  const filtered =
    type === 'TICKET_SYNC' && payload?.signedToken
      ? queue.filter((op) => !(op.type === 'TICKET_SYNC' && op.payload?.signedToken === payload.signedToken))
      : queue;

  filtered.push({
    id: `off-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    createdAt: Date.now(),
    payload,
    retries: 0,
  });
  saveOfflineQueue(filtered);
}

export async function syncTicketToServer(ticket: Ticket): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    enqueueOfflineOperation('TICKET_SYNC', ticket);
    return false;
  }
  try {
    const res = await fetch('/api/tickets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket }),
    });
    if (!res.ok) {
      enqueueOfflineOperation('TICKET_SYNC', ticket);
      return false;
    }
    return true;
  } catch {
    enqueueOfflineOperation('TICKET_SYNC', ticket);
    return false;
  }
}

export async function syncAllTicketsToServer(tickets: Ticket[]): Promise<boolean> {
  if (!Array.isArray(tickets) || tickets.length === 0) return true;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  try {
    const res = await fetch('/api/tickets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickets }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function flushOfflineQueue(): Promise<{ synced: number; remaining: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, remaining: getOfflineQueue().length };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  const remaining: OfflineSyncOperation[] = [];
  let synced = 0;

  for (const op of queue) {
    try {
      if (op.type === 'TICKET_SYNC') {
        const res = await fetch('/api/tickets/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket: op.payload }),
        });
        if (res.ok) {
          synced++;
        } else {
          remaining.push({ ...op, retries: op.retries + 1, lastError: `HTTP ${res.status}` });
        }
      } else if (op.type === 'WHATSAPP_SEND') {
        const res = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op.payload),
        });
        if (res.ok) {
          synced++;
        } else {
          remaining.push({ ...op, retries: op.retries + 1, lastError: `HTTP ${res.status}` });
        }
      }
    } catch (err: any) {
      remaining.push({ ...op, retries: op.retries + 1, lastError: err?.message || 'Erreur réseau' });
    }
  }

  saveOfflineQueue(remaining);
  return { synced, remaining: remaining.length };
}
