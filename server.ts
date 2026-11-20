import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IS_BUILT_SERVER = path.basename(__dirname) === 'dist';
const APP_ROOT = IS_BUILT_SERVER ? path.dirname(__dirname) : __dirname;
dotenv.config({ path: path.join(APP_ROOT, '.env') });
dotenv.config({ path: path.join(APP_ROOT, '.env.local') });

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '2mb' }));

// ============================================================================
// Stockage sécurisé & hachage côté serveur des mots de passe (scrypt + sel)
// ============================================================================
interface ServerStaffCredential {
  userId: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'GERANT' | 'CAISSIER';
  passwordHash: string; // Format: scrypt$<saltHex>$<hashHex>
  avatarUrl?: string;
  mustChangePassword: boolean;
  passwordUpdatedAt?: number;
  updatedAt: number;
}

interface ServerPasswordAuditLog {
  id: string;
  timestamp: number;
  userId: string;
  username: string;
  action: 'PASSWORD_CHANGE' | 'FIRST_LOGIN_PASSWORD_CHANGE' | 'PROFILE_UPDATE' | 'USER_SYNC_RESET';
  details: string;
}

interface StaffAuthStore {
  credentials: Record<string, ServerStaffCredential>; // clé = username lowercase
  auditLogs: ServerPasswordAuditLog[];
}

const DATA_DIR = path.join(APP_ROOT, '.data');
const AUTH_STORE_FILE = path.join(DATA_DIR, 'staff-auth.json');

function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPasswordScrypt(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.startsWith('scrypt$')) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3) return false;
  const [, salt, originalHex] = parts;
  const derivedBuffer = crypto.scryptSync(password, salt, 64);
  const originalBuffer = Buffer.from(originalHex, 'hex');
  if (derivedBuffer.length !== originalBuffer.length) return false;
  return crypto.timingSafeEqual(derivedBuffer, originalBuffer);
}

function loadAuthStore(): StaffAuthStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(AUTH_STORE_FILE)) {
      const raw = fs.readFileSync(AUTH_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as StaffAuthStore;
      if (parsed && parsed.credentials) {
        return {
          credentials: parsed.credentials,
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
        };
      }
    }
  } catch (err) {
    console.error('[AuthStore] Erreur lecture store:', err);
  }

  // Initialisation par défaut avec mots de passe hachés côté serveur
  const now = Date.now();
  const initial: StaffAuthStore = {
    credentials: {
      admin: {
        userId: 'staff-admin',
        username: 'admin',
        fullName: 'Aimé (Propriétaire / Admin)',
        role: 'ADMIN',
        passwordHash: hashPasswordScrypt('admin'),
        mustChangePassword: true,
        updatedAt: now,
      },
      gerant: {
        userId: 'staff-gerant',
        username: 'gerant',
        fullName: 'Christian (Gérant de Salle)',
        role: 'GERANT',
        passwordHash: hashPasswordScrypt(''),
        mustChangePassword: true,
        updatedAt: now,
      },
      erick: {
        userId: 'staff-erick',
        username: 'erick',
        fullName: 'Erick (Caissier Accueil)',
        role: 'CAISSIER',
        passwordHash: hashPasswordScrypt(''),
        mustChangePassword: true,
        updatedAt: now,
      },
      sarah: {
        userId: 'staff-sarah',
        username: 'sarah',
        fullName: 'Sarah (Caissière Soir)',
        role: 'CAISSIER',
        passwordHash: hashPasswordScrypt(''),
        mustChangePassword: true,
        updatedAt: now,
      },
    },
    auditLogs: [],
  };
  saveAuthStore(initial);
  return initial;
}

function saveAuthStore(store: StaffAuthStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(AUTH_STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AuthStore] Erreur écriture store:', err);
  }
}

let authStore: StaffAuthStore = loadAuthStore();

// Vérification de mot de passe côté serveur (POST /api/auth/verify)
app.post('/api/auth/verify', (req, res) => {
  const { username, password } = req.body || {};
  const key = String(username || '').trim().toLowerCase();
  if (!key || typeof password !== 'string') {
    return res.status(400).json({ valid: false, hasRecord: false, error: 'Paramètres manquants' });
  }

  const record = authStore.credentials[key];
  if (!record) {
    return res.status(200).json({ valid: false, hasRecord: false });
  }

  const valid = verifyPasswordScrypt(password, record.passwordHash);
  return res.status(200).json({
    valid,
    hasRecord: true,
    mustChangePassword: record.mustChangePassword,
    passwordUpdatedAt: record.passwordUpdatedAt,
    fullName: record.fullName,
    avatarUrl: record.avatarUrl,
  });
});

// État de hachage des comptes (sans exposer les empreintes)
app.get('/api/auth/status', (_req, res) => {
  const summary = Object.values(authStore.credentials).map((c) => ({
    userId: c.userId,
    username: c.username,
    fullName: c.fullName,
    role: c.role,
    avatarUrl: c.avatarUrl,
    mustChangePassword: c.mustChangePassword,
    passwordUpdatedAt: c.passwordUpdatedAt,
    hasServerHash: Boolean(c.passwordHash && c.passwordHash.startsWith('scrypt$')),
  }));
  res.status(200).json({ users: summary, auditCount: authStore.auditLogs.length });
});

// Synchroniser / créer / réinitialiser un membre du personnel (avec hachage scrypt)
app.post('/api/auth/sync-user', (req, res) => {
  const { userId, username, fullName, role, password, mustChangePassword, avatarUrl } = req.body || {};
  const key = String(username || '').trim().toLowerCase();
  if (!key) {
    return res.status(400).json({ success: false, error: 'Identifiant requis' });
  }

  const existing = authStore.credentials[key];
  const now = Date.now();
  const nextHash =
    typeof password === 'string' && password.length > 0
      ? hashPasswordScrypt(password)
      : existing?.passwordHash || hashPasswordScrypt('');

  authStore.credentials[key] = {
    userId: userId || existing?.userId || `staff-${now}`,
    username: key,
    fullName: fullName || existing?.fullName || key,
    role: role || existing?.role || 'CAISSIER',
    passwordHash: nextHash,
    avatarUrl: typeof avatarUrl === 'string' ? (avatarUrl || undefined) : existing?.avatarUrl,
    mustChangePassword: mustChangePassword ?? existing?.mustChangePassword ?? true,
    passwordUpdatedAt: password ? now : existing?.passwordUpdatedAt,
    updatedAt: now,
  };

  if (password) {
    authStore.auditLogs.unshift({
      id: `paud-${now}`,
      timestamp: now,
      userId: authStore.credentials[key].userId,
      username: key,
      action: 'USER_SYNC_RESET',
      details: `Mot de passe haché côté serveur mis à jour pour @${key}`,
    });
  }
  saveAuthStore(authStore);

  return res.status(200).json({
    success: true,
    hashedMarker: `scrypt$${nextHash.split('$')[1]?.slice(0, 8) || 'hmac'}***`,
    mustChangePassword: authStore.credentials[key].mustChangePassword,
  });
});

// Changement de mot de passe (première connexion ou utilisateur connecté)
app.post('/api/auth/change-password', (req, res) => {
  const { userId, username, currentPassword, newPassword, isFirstLogin } = req.body || {};
  const key = String(username || '').trim().toLowerCase();
  if (!key || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.',
    });
  }

  const record = authStore.credentials[key];
  if (!isFirstLogin) {
    if (!currentPassword || !record || !verifyPasswordScrypt(currentPassword, record.passwordHash)) {
      return res.status(401).json({
        success: false,
        error: 'Mot de passe actuel incorrect.',
      });
    }
  } else if (currentPassword && record && !verifyPasswordScrypt(currentPassword, record.passwordHash)) {
    return res.status(401).json({
      success: false,
      error: 'Mot de passe actuel incorrect.',
    });
  }

  const now = Date.now();
  const nextHash = hashPasswordScrypt(newPassword);
  authStore.credentials[key] = {
    ...record,
    userId: userId || record?.userId || `staff-${now}`,
    username: key,
    fullName: record?.fullName || key,
    role: record?.role || 'CAISSIER',
    passwordHash: nextHash,
    mustChangePassword: false,
    passwordUpdatedAt: now,
    updatedAt: now,
  };

  authStore.auditLogs.unshift({
    id: `paud-${now}`,
    timestamp: now,
    userId: authStore.credentials[key].userId,
    username: key,
    action: isFirstLogin ? 'FIRST_LOGIN_PASSWORD_CHANGE' : 'PASSWORD_CHANGE',
    details: isFirstLogin
      ? `Changement de mot de passe à la première connexion pour @${key} (hachage scrypt serveur)`
      : `Changement de mot de passe pour @${key} (hachage scrypt serveur)`,
  });
  saveAuthStore(authStore);

  return res.status(200).json({
    success: true,
    passwordUpdatedAt: now,
    hashMarker: `scrypt$${nextHash.split('$')[1]?.slice(0, 8) || 'salted'}***`,
  });
});

// Mise à jour « Mon profil » (nom affiché, photo de profil et mot de passe, identifiant JAMAIS modifiable)
app.post('/api/auth/profile', (req, res) => {
  const { userId, username, attemptedUsername, currentPassword, fullName, newPassword, avatarUrl } = req.body || {};
  const key = String(username || '').trim().toLowerCase();

  if (attemptedUsername && String(attemptedUsername).trim().toLowerCase() !== key) {
    return res.status(400).json({
      success: false,
      error: "L'identifiant de connexion (@username) est permanent et n'est jamais modifiable.",
    });
  }

  if (!key || typeof currentPassword !== 'string' || !currentPassword) {
    return res.status(400).json({
      success: false,
      error: 'La saisie du mot de passe actuel est obligatoire pour modifier votre profil.',
    });
  }

  const record = authStore.credentials[key];
  if (!record || !verifyPasswordScrypt(currentPassword, record.passwordHash)) {
    return res.status(401).json({
      success: false,
      error: 'Mot de passe actuel incorrect. Modification refusée.',
    });
  }

  const cleanedName = String(fullName || '').trim();
  if (cleanedName.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Le nom affiché doit contenir au moins 2 caractères.',
    });
  }

  if (newPassword && String(newPassword).trim().length > 0 && String(newPassword).trim().length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.',
    });
  }

  let nextAvatarUrl = record.avatarUrl;
  let avatarChanged = false;
  if (typeof avatarUrl === 'string') {
    if (avatarUrl === '') {
      nextAvatarUrl = undefined;
      avatarChanged = Boolean(record.avatarUrl);
    } else if (avatarUrl.startsWith('data:image/') && avatarUrl.length <= 500_000) {
      nextAvatarUrl = avatarUrl;
      avatarChanged = avatarUrl !== record.avatarUrl;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Format de photo de profil invalide ou fichier trop lourd.',
      });
    }
  }

  const now = Date.now();
  const passwordChanged = Boolean(newPassword && String(newPassword).trim().length > 0);
  const nextHash = passwordChanged ? hashPasswordScrypt(String(newPassword)) : record.passwordHash;

  authStore.credentials[key] = {
    ...record,
    userId: userId || record.userId,
    fullName: cleanedName,
    avatarUrl: nextAvatarUrl,
    passwordHash: nextHash,
    mustChangePassword: passwordChanged ? false : record.mustChangePassword,
    passwordUpdatedAt: passwordChanged ? now : record.passwordUpdatedAt,
    updatedAt: now,
  };

  authStore.auditLogs.unshift({
    id: `paud-${now}`,
    timestamp: now,
    userId: authStore.credentials[key].userId,
    username: key,
    action: 'PROFILE_UPDATE',
    details: passwordChanged
      ? `Profil, mot de passe${avatarChanged ? ' et photo' : ''} mis à jour pour @${key} (Nom affiché: "${cleanedName}")`
      : `Profil${avatarChanged ? ' (photo mise à jour)' : ''} mis à jour pour @${key} ("${cleanedName}")`,
  });
  saveAuthStore(authStore);

  return res.status(200).json({
    success: true,
    fullName: cleanedName,
    avatarUrl: nextAvatarUrl || '',
    passwordChanged,
    passwordUpdatedAt: authStore.credentials[key].passwordUpdatedAt,
    hashMarker: `scrypt$${nextHash.split('$')[1]?.slice(0, 8) || 'salted'}***`,
  });
});

// ============================================================================
// Stockage public des tickets pour vérification QR cross-appareils
// ============================================================================
const PUBLIC_TICKETS_FILE = path.join(DATA_DIR, 'public-tickets.json');
const WHATSAPP_EVENTS_FILE = path.join(DATA_DIR, 'whatsapp-events.json');
const WIFI_VOUCHERS_FILE = path.join(DATA_DIR, 'wifi-vouchers.json');
const RESERVATIONS_FILE = path.join(DATA_DIR, 'reservations.json');
const STK_PAYMENTS_FILE = path.join(DATA_DIR, 'stk-payments.json');

interface StoredWifiVoucher {
  code: string;
  ssid: string;
  validFrom: number;
  expiresAt: number;
  maxDevices: number;
  singleUseDeviceBound?: boolean;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  inQueueWaiting?: boolean;
  ticketNumber?: string;
  mikrotikSynced?: boolean;
  updatedAt: number;
}

interface StoredPublicTicket {
  id: string;
  ticketNumber: string;
  signedToken: string;
  stationId: number;
  stationName: string;
  stationType: string;
  clientName: string;
  clientPhone?: string;
  clientId?: string;
  durationMinutes: number;
  startTime: number;
  endTime: number;
  actualEndTime?: number;
  amountCDF: number;
  amountUSD: number;
  appliedDiscountPercent?: number;
  appliedTimeSlotLabel?: string;
  appliedPromoCode?: string;
  paymentMethod: string;
  mixedBreakdown?: Record<string, any>;
  status: string;
  createdAt: number;
  extendedCount: number;
  transferredFromStationId?: number;
  wifiVoucher?: StoredWifiVoucher;
  reservationCode?: string;
  reservationFeeCDF?: number;
  reservationFeeUSD?: number;
  isQueuedPrepaid?: boolean;
  updatedAt: number;
}

interface StoredStkPayment {
  paymentId: string;
  network: string;
  phone: string;
  amountCDF: number;
  amountUSD?: number;
  currency: 'CDF' | 'USD';
  status: 'PENDING' | 'PAID' | 'FAILED';
  providerTransactionId: string;
  expiresAt: number;
  createdAt: number;
  paidAt?: number;
  message?: string;
}

interface StoredWhatsAppWebhookEvent {
  id: string;
  receivedAt: number;
  kind: 'STATUS_UPDATE' | 'INBOUND_MESSAGE';
  metaMessageId?: string;
  recipientPhone?: string;
  status?: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  errorMessage?: string;
  fromPhone?: string;
  replyText?: string;
}

function loadPublicTickets(): Record<string, StoredPublicTicket> {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(PUBLIC_TICKETS_FILE)) {
      return JSON.parse(fs.readFileSync(PUBLIC_TICKETS_FILE, 'utf-8')) || {};
    }
  } catch (err) {
    console.error('[PublicTickets] Erreur lecture:', err);
  }
  return {};
}

function savePublicTickets(map: Record<string, StoredPublicTicket>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PUBLIC_TICKETS_FILE, JSON.stringify(map, null, 2), 'utf-8');
  } catch (err) {
    console.error('[PublicTickets] Erreur écriture:', err);
  }
}

function loadWhatsAppEvents(): StoredWhatsAppWebhookEvent[] {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(WHATSAPP_EVENTS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(WHATSAPP_EVENTS_FILE, 'utf-8'));
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.error('[WhatsAppEvents] Erreur lecture:', err);
  }
  return [];
}

function saveWhatsAppEvents(events: StoredWhatsAppWebhookEvent[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(WHATSAPP_EVENTS_FILE, JSON.stringify(events.slice(0, 300), null, 2), 'utf-8');
  } catch (err) {
    console.error('[WhatsAppEvents] Erreur écriture:', err);
  }
}

function loadJsonMap<T>(filePath: string): Record<string, T> {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) || {};
    }
  } catch (err) {
    console.error(`[Store] Erreur lecture ${filePath}:`, err);
  }
  return {};
}

function saveJsonMap<T>(filePath: string, map: Record<string, T>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(map, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[Store] Erreur écriture ${filePath}:`, err);
  }
}

let publicTicketsStore: Record<string, StoredPublicTicket> = loadPublicTickets();
let whatsappEventsStore: StoredWhatsAppWebhookEvent[] = loadWhatsAppEvents();
const wifiVouchersStore: Record<string, StoredWifiVoucher> = loadJsonMap<StoredWifiVoucher>(WIFI_VOUCHERS_FILE);
const reservationsStore: Record<string, any> = loadJsonMap<any>(RESERVATIONS_FILE);
const stkPaymentsStore: Record<string, StoredStkPayment> = loadJsonMap<StoredStkPayment>(STK_PAYMENTS_FILE);

// Synchroniser un ou plusieurs tickets vers le registre public QR
app.post('/api/tickets/sync', (req, res) => {
  const { ticket, tickets } = req.body || {};
  const list: any[] = [];
  if (ticket && typeof ticket === 'object') list.push(ticket);
  if (Array.isArray(tickets)) list.push(...tickets);

  if (list.length === 0) {
    return res.status(400).json({ success: false, error: 'Aucun ticket fourni' });
  }

  const now = Date.now();
  let syncedCount = 0;
  for (const t of list) {
    if (!t || !t.signedToken) continue;
    publicTicketsStore[String(t.signedToken)] = {
      id: String(t.id || ''),
      ticketNumber: String(t.ticketNumber || ''),
      signedToken: String(t.signedToken),
      stationId: Number(t.stationId || 0),
      stationName: String(t.stationName || (t.stationId ? `Poste ${t.stationId}` : "File d'attente")),
      stationType: String(t.stationType || 'PS4'),
      clientName: String(t.clientName || 'Client'),
      clientPhone: t.clientPhone ? String(t.clientPhone) : undefined,
      clientId: t.clientId ? String(t.clientId) : undefined,
      durationMinutes: Number(t.durationMinutes || 0),
      startTime: Number(t.startTime || now),
      endTime: Number(t.endTime || now),
      actualEndTime: t.actualEndTime ? Number(t.actualEndTime) : undefined,
      amountCDF: Number(t.amountCDF || 0),
      amountUSD: Number(t.amountUSD || 0),
      appliedDiscountPercent: t.appliedDiscountPercent ? Number(t.appliedDiscountPercent) : undefined,
      appliedTimeSlotLabel: t.appliedTimeSlotLabel ? String(t.appliedTimeSlotLabel) : undefined,
      appliedPromoCode: t.appliedPromoCode ? String(t.appliedPromoCode) : undefined,
      paymentMethod: String(t.paymentMethod || 'CASH_CDF'),
      mixedBreakdown: t.mixedBreakdown || undefined,
      status: String(t.status || 'active'),
      createdAt: Number(t.createdAt || now),
      extendedCount: Number(t.extendedCount || 0),
      transferredFromStationId: t.transferredFromStationId ? Number(t.transferredFromStationId) : undefined,
      wifiVoucher: t.wifiVoucher ? { ...t.wifiVoucher, updatedAt: now } : undefined,
      reservationCode: t.reservationCode ? String(t.reservationCode) : undefined,
      reservationFeeCDF: typeof t.reservationFeeCDF === 'number' ? t.reservationFeeCDF : undefined,
      reservationFeeUSD: typeof t.reservationFeeUSD === 'number' ? t.reservationFeeUSD : undefined,
      isQueuedPrepaid: Boolean(t.isQueuedPrepaid),
      updatedAt: now,
    };
    if (t.wifiVoucher?.code) {
      wifiVouchersStore[String(t.wifiVoucher.code)] = {
        ...t.wifiVoucher,
        updatedAt: now,
      };
    }
    syncedCount++;
  }

  savePublicTickets(publicTicketsStore);
  saveJsonMap(WIFI_VOUCHERS_FILE, wifiVouchersStore);
  return res.status(200).json({ success: true, count: syncedCount });
});

// Vérification publique d'un ticket via son jeton QR (sans authentification)
app.get('/api/tickets/public/:token', (req, res) => {
  const token = decodeURIComponent(String(req.params.token || '').trim());
  if (!token) {
    return res.status(400).json({ found: false, error: 'Jeton manquant' });
  }

  const found =
    publicTicketsStore[token] ||
    Object.values(publicTicketsStore).find(
      (t) => t.signedToken === token || t.ticketNumber === token || t.id === token
    );

  if (!found) {
    return res.status(404).json({ found: false, error: 'Ticket introuvable' });
  }

  const now = Date.now();
  const isActive = found.status === 'active' || found.status === 'extended';
  const remainingSeconds = isActive ? Math.max(0, Math.floor((found.endTime - now) / 1000)) : 0;

  return res.status(200).json({
    found: true,
    ticket: {
      ...found,
      remainingSeconds,
    },
  });
});

// Variables d'environnement Meta WhatsApp Cloud API
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';

/**
 * 1. Webhook Verification Handshake (GET /api/whatsapp/webhook)
 * Meta appelle cette URL lors de la configuration du webhook dans l'espace développeur
 */
app.get('/api/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    console.log('[Meta Webhook] Verification successful with token');
    res.status(200).send(challenge);
  } else {
    console.warn('[Meta Webhook] Verification failed: Token mismatch or invalid mode');
    res.status(403).send('Forbidden');
  }
});

/**
 * 2. Inbound Webhook Events (POST /api/whatsapp/webhook)
 * Réception réelle des statuts de livraison (sent, delivered, read, failed) et réponses clients ("OUI", "ANNULER", "STOP")
 */
app.post('/api/whatsapp/webhook', (req, res) => {
  const body = req.body || {};
  const now = Date.now();
  const newEvents: StoredWhatsAppWebhookEvent[] = [];

  const mapMetaStatus = (raw?: string): 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | undefined => {
    const s = String(raw || '').toLowerCase();
    if (s === 'sent') return 'SENT';
    if (s === 'delivered') return 'DELIVERED';
    if (s === 'read') return 'READ';
    if (s === 'failed') return 'FAILED';
    return undefined;
  };

  if (Array.isArray(body.entry)) {
    for (const entry of body.entry) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const ch of changes) {
        const val = ch?.value || {};
        if (Array.isArray(val.statuses)) {
          for (const st of val.statuses) {
            const mapped = mapMetaStatus(st?.status);
            if (!mapped) continue;
            const errMsg = Array.isArray(st?.errors) && st.errors[0]?.message ? String(st.errors[0].message) : undefined;
            newEvents.push({
              id: `wa-ev-${now}-${Math.random().toString(36).slice(2, 7)}`,
              receivedAt: st?.timestamp ? Number(st.timestamp) * 1000 : now,
              kind: 'STATUS_UPDATE',
              metaMessageId: st?.id ? String(st.id) : undefined,
              recipientPhone: st?.recipient_id ? `+${String(st.recipient_id).replace(/^\+/, '')}` : undefined,
              status: mapped,
              errorMessage: errMsg,
            });
          }
        }
        if (Array.isArray(val.messages)) {
          for (const msg of val.messages) {
            const textBody = msg?.text?.body || msg?.button?.text || '';
            if (!msg?.from || !textBody) continue;
            newEvents.push({
              id: `wa-ev-${now}-${Math.random().toString(36).slice(2, 7)}`,
              receivedAt: msg?.timestamp ? Number(msg.timestamp) * 1000 : now,
              kind: 'INBOUND_MESSAGE',
              metaMessageId: msg?.context?.id ? String(msg.context.id) : undefined,
              fromPhone: `+${String(msg.from).replace(/^\+/, '')}`,
              replyText: String(textBody).trim(),
            });
          }
        }
      }
    }
  } else if (body.status || body.replyText) {
    // Support format direct interne
    const mapped = mapMetaStatus(body.status);
    if (mapped) {
      newEvents.push({
        id: `wa-ev-${now}-${Math.random().toString(36).slice(2, 7)}`,
        receivedAt: now,
        kind: 'STATUS_UPDATE',
        metaMessageId: body.metaMessageId ? String(body.metaMessageId) : undefined,
        recipientPhone: body.phone ? String(body.phone) : undefined,
        status: mapped,
        errorMessage: body.errorMessage ? String(body.errorMessage) : undefined,
      });
    }
    if (body.replyText && body.phone) {
      newEvents.push({
        id: `wa-ev-${now}-${Math.random().toString(36).slice(2, 7)}`,
        receivedAt: now,
        kind: 'INBOUND_MESSAGE',
        fromPhone: String(body.phone),
        replyText: String(body.replyText).trim(),
      });
    }
  }

  if (newEvents.length > 0) {
    whatsappEventsStore = [...newEvents, ...whatsappEventsStore].slice(0, 300);
    saveWhatsAppEvents(whatsappEventsStore);
  }

  res.status(200).json({ status: 'EVENT_RECEIVED', processedCount: newEvents.length, events: newEvents });
});

app.get('/api/whatsapp/webhook-events', (req, res) => {
  const since = Number(req.query.since || 0);
  const events = since > 0 ? whatsappEventsStore.filter((e) => e.receivedAt >= since) : whatsappEventsStore;
  res.status(200).json({ events });
});

/**
 * Synthèse vocale locale via l'API Web Speech du navigateur.
 * L'application n'envoie aucune requête vocale à un service externe.
 */
app.post('/api/tts/speak', (_req, res) => {
  res.status(503).json({
    success: false,
    fallback: true,
    error: 'Le TTS externe est désactivé. Utilisez la voix locale du navigateur.',
  });
});

/**
 * 4. Envoi de notification WhatsApp (Meta Cloud API / CallMeBot / Webhook HTTP)
 */
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { to, templateName, variables, languageCode, messageType, customText, renderedText, configOverride } = req.body;

    const provider = configOverride?.provider || 'META_CLOUD';
    const phoneNumberId = String(configOverride?.phoneNumberId || WHATSAPP_PHONE_NUMBER_ID || '').trim();
    const accessToken = String(configOverride?.accessToken || WHATSAPP_ACCESS_TOKEN || '').trim();
    const apiVersion = String(configOverride?.apiVersion || WHATSAPP_API_VERSION || 'v21.0').trim();
    const isTestMode = Boolean(configOverride?.isTestMode);
    const callmebotApiKey = String(configOverride?.callmebotApiKey || '').trim();
    const customWebhookUrl = String(configOverride?.customWebhookUrl || '').trim();
    const customWebhookToken = String(configOverride?.customWebhookToken || '').trim();

    const cleanRecipient = String(to || '').replace(/[^0-9]/g, '');
    if (!cleanRecipient || cleanRecipient.length < 8) {
      return res.status(400).json({
        success: false,
        error: `Numéro destinataire invalide: "${to}". Utilisez le format E.164 (ex: +243895457097).`,
      });
    }

    const messageText = String(customText || renderedText || `GOZA (${templateName})`).trim();

    // Option B : Passerelle gratuite CallMeBot WhatsApp API
    if (provider === 'CALLMEBOT') {
      if (!callmebotApiKey) {
        return res.status(200).json({
          success: true,
          mode: 'SIMULATION',
          messageId: `wamid.sim_${Date.now()}`,
          reason: 'Clé API CallMeBot manquante — simulation locale.',
        });
      }
      const cbUrl = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(cleanRecipient)}&text=${encodeURIComponent(messageText)}&apikey=${encodeURIComponent(callmebotApiKey)}`;
      const cbRes = await fetch(cbUrl);
      const cbBody = await cbRes.text();
      if (!cbRes.ok || cbBody.toLowerCase().includes('error')) {
        return res.status(502).json({
          success: false,
          error: `CallMeBot erreur: ${cbBody.slice(0, 180)}`,
        });
      }
      return res.status(200).json({
        success: true,
        mode: 'LIVE_META',
        messageId: `callmebot_${Date.now()}`,
        provider: 'CALLMEBOT',
      });
    }

    // Option C : Webhook HTTP personnalisé (UltraMsg / Green-API / Evolution API / Zapier)
    if (provider === 'CUSTOM_WEBHOOK') {
      if (!customWebhookUrl) {
        return res.status(200).json({
          success: true,
          mode: 'SIMULATION',
          messageId: `wamid.sim_${Date.now()}`,
          reason: 'URL Webhook personnalisée manquante — simulation locale.',
        });
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customWebhookToken) {
        headers['Authorization'] = `Bearer ${customWebhookToken}`;
      }
      const whRes = await fetch(customWebhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: `+${cleanRecipient}`,
          phone: cleanRecipient,
          text: messageText,
          body: messageText,
          templateName,
          variables,
        }),
      });
      if (!whRes.ok) {
        const whErr = await whRes.text().catch(() => '');
        return res.status(whRes.status).json({
          success: false,
          error: `Webhook HTTP ${whRes.status}: ${whErr.slice(0, 180)}`,
        });
      }
      return res.status(200).json({
        success: true,
        mode: 'LIVE_META',
        messageId: `wh_${Date.now()}`,
        provider: 'CUSTOM_WEBHOOK',
      });
    }

    // Option A : Meta WhatsApp Business Cloud API
    const isPlaceholderToken =
      !accessToken ||
      accessToken.length < 25 ||
      accessToken === 'EAA...' ||
      accessToken.length < 25 ||
      accessToken.includes('xxxx');
    const isMissingPhoneId = !phoneNumberId || (phoneNumberId === '109876543210987' && isPlaceholderToken);

    if (isPlaceholderToken || isMissingPhoneId || !phoneNumberId) {
      console.log(
        `[WhatsApp Simulator] Jeton Meta non configuré — message simulé vers ${to} (${messageType === 'text' ? 'texte libre' : templateName})`
      );
      return res.status(200).json({
        success: true,
        messageId: `wamid.sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        mode: 'SIMULATION',
        reason: 'Aucun jeton Meta Graph API valide configuré (simulation locale).',
      });
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    let payload: Record<string, any>;

    if (messageType === 'text' && customText) {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanRecipient,
        type: 'text',
        text: {
          preview_url: false,
          body: String(customText),
        },
      };
    } else {
      const parameters = Object.keys(variables || {})
        .sort((a, b) => Number(a) - Number(b))
        .filter((key) => variables[key] !== undefined && String(variables[key]).trim() !== '')
        .map((key) => ({
          type: 'text',
          text: String(variables[key]),
        }));

      const resolvedLang = languageCode || (templateName === 'hello_world' ? 'en_US' : 'fr');
      const templateObj: Record<string, any> = {
        name: templateName,
        language: {
          code: resolvedLang,
        },
      };

      if (parameters.length > 0) {
        templateObj.components = [
          {
            type: 'body',
            parameters,
          },
        ];
      }

      payload = {
        messaging_product: 'whatsapp',
        to: cleanRecipient,
        type: 'template',
        template: templateObj,
      };
    }

    const metaRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const metaData = await metaRes.json().catch(() => ({}));

    if (!metaRes.ok) {
      console.error('[Meta Graph API Error]:', metaData);
      const code = metaData?.error?.code;
      let userMsg = metaData?.error?.error_user_msg || metaData?.error?.message || `Meta API HTTP ${metaRes.status}`;
      if (code === 190 || metaRes.status === 401) {
        userMsg = `Jeton Meta WhatsApp expiré ou invalide (Erreur 190). Les jetons temporaires Meta expirent toutes les 24h : générez un nouveau jeton dans Meta Developers, ou choisissez "CallMeBot Gratuit" / le lien direct WhatsApp.`;
      } else if (code === 132001 || code === 132000) {
        userMsg = `Modèle "${templateName}" non trouvé/approuvé dans votre compte Meta (${userMsg}). Pour un premier test immédiat, choisissez "hello_world (en_US)" ou créez ce modèle dans Meta Business Manager.`;
      }
      return res.status(metaRes.status).json({
        success: false,
        error: userMsg,
        errorCode: code,
        details: metaData,
      });
    }

    const messageId = metaData.messages?.[0]?.id || `wamid.${Date.now()}`;
    console.log(`[WhatsApp Meta LIVE${isTestMode ? ' Sandbox' : ''}] Message envoyé vers +${cleanRecipient} (ID: ${messageId})`);
    return res.status(200).json({
      success: true,
      messageId,
      mode: 'LIVE_META',
      metaResponse: metaData,
    });
  } catch (error: any) {
    console.error('[WhatsApp Send Route Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while sending WhatsApp message',
    });
  }
});

app.all(['/api/payments/illico/webhook', '/api/payments/illico/status/:reference'], (_req, res) => {
  res.status(410).json({
    success: false,
    error: 'Illico Cash n’est plus disponible comme moyen de paiement GOZA.',
  });
});

/**
 * 4b. Passerelle Domotique Shelly HTTP (Gen1 / Gen2 Plus)
 * Permet d'envoyer l'ordre réel ON/OFF vers l'adresse IP LAN d'un relais Shelly 1PM / Plus 1PM
 * tout en retombant proprement en mode MQTT simulé lorsque la salle n'est pas sur le même réseau local.
 */
app.post('/api/shelly/trigger', async (req, res) => {
  const { stationId, state, ipAddress, hardwareType, reason } = req.body || {};
  const normalizedState = String(state || '').toUpperCase() === 'ON' ? 'ON' : 'OFF';
  const cleanIp = String(ipAddress || '').trim();

  if (!cleanIp || !/^(\d{1,3}\.){3}\d{1,3}$/.test(cleanIp)) {
    return res.status(200).json({
      success: true,
      delivered: false,
      mode: 'MQTT_SIMULATED',
      stationId,
      state: normalizedState,
      reason: 'Adresse IP locale non fournie ou invalide',
    });
  }

  const turnStr = normalizedState === 'ON' ? 'on' : 'off';
  const isOnBool = normalizedState === 'ON';

  const tryHttp = async (url: string, protocol: string): Promise<{ ok: boolean; protocol?: string }> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1400);
    try {
      const r = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timer);
      if (r.ok) return { ok: true, protocol };
      return { ok: false };
    } catch {
      clearTimeout(timer);
      return { ok: false };
    }
  };

  // Gen1 (/relay/0?turn=on|off) puis Gen2 Plus (/rpc/Switch.Set?id=0&on=true|false)
  const gen1 = await tryHttp(`http://${cleanIp}/relay/0?turn=${turnStr}`, 'SHELLY_GEN1');
  if (gen1.ok) {
    console.log(`[Shelly HTTP] Poste ${stationId} (${cleanIp}) -> ${normalizedState} via Gen1 (${reason || 'AUTO'})`);
    return res.status(200).json({
      success: true,
      delivered: true,
      mode: 'SHELLY_HTTP',
      protocol: 'SHELLY_GEN1',
      stationId,
      state: normalizedState,
    });
  }

  const gen2 = await tryHttp(`http://${cleanIp}/rpc/Switch.Set?id=0&on=${isOnBool}`, 'SHELLY_GEN2_RPC');
  if (gen2.ok) {
    console.log(`[Shelly HTTP] Poste ${stationId} (${cleanIp}) -> ${normalizedState} via Gen2 RPC (${reason || 'AUTO'})`);
    return res.status(200).json({
      success: true,
      delivered: true,
      mode: 'SHELLY_HTTP',
      protocol: 'SHELLY_GEN2_RPC',
      stationId,
      state: normalizedState,
    });
  }

  return res.status(200).json({
    success: true,
    delivered: false,
    mode: 'MQTT_SIMULATED',
    hardwareType: hardwareType || 'SHELLY_1PM',
    stationId,
    state: normalizedState,
    note: `Relais ${cleanIp} non joignable depuis ce serveur (commandé via passerelle MQTT locale).`,
  });
});

/**
 * 4c. Portail Captif Wi-Fi Multi-Appareils MikroTik Hotspot
 * 1h–2h : 1 app. | 3h : 2 app. | 4h : 3 app. | 5h+ : 4 app.
 * Synchronise le voucher vers RouterOS REST API (/rest/ip/hotspot/user)
 */
app.post('/api/wifi/voucher', async (req, res) => {
  const { voucher, action, mikrotikHost, mikrotikUser } = req.body || {};
  if (!voucher || !voucher.code) {
    return res.status(400).json({ success: false, error: 'Code Wi-Fi manquant' });
  }

  const now = Date.now();
  const code = String(voucher.code).trim().toUpperCase();
  const expiresAt = Number(voucher.expiresAt || now + 3600000);
  const remainingSec = Math.max(60, Math.ceil((expiresAt - now) / 1000));
  const maxDevices = Math.min(4, Math.max(1, Number(voucher.maxDevices || 1)));

  const stored: StoredWifiVoucher = {
    code,
    ssid: String(voucher.ssid || 'GOZA-WiFi'),
    validFrom: Number(voucher.validFrom || now),
    expiresAt,
    maxDevices,
    singleUseDeviceBound: maxDevices === 1,
    status: voucher.status === 'REVOKED' || voucher.status === 'EXPIRED' ? voucher.status : 'ACTIVE',
    inQueueWaiting: Boolean(voucher.inQueueWaiting),
    ticketNumber: voucher.ticketNumber ? String(voucher.ticketNumber) : undefined,
    mikrotikSynced: false,
    updatedAt: now,
  };

  // Tentative d'envoi vers MikroTik RouterOS v7 REST API (si LAN accessible et identifiants configurés)
  const host = String(process.env.MIKROTIK_HOST || mikrotikHost || '').trim();
  const apiUser = String(process.env.MIKROTIK_USER || mikrotikUser || 'goza-api').trim();
  const apiPass = String(process.env.MIKROTIK_PASS || '').trim();
  let mikrotikMode = 'HOTSPOT_LOCAL_REGISTRY';

  if (host && apiPass && /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1400);
    try {
      const authHeader = 'Basic ' + Buffer.from(`${apiUser}:${apiPass}`).toString('base64');
      const hh = Math.floor(remainingSec / 3600);
      const mm = Math.floor((remainingSec % 3600) / 60);
      const ss = remainingSec % 60;
      const limitUptime = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
      const profileName = maxDevices === 1 ? 'goza-1device' : `goza-${maxDevices}devices`;
      const r = await fetch(`http://${host}/rest/ip/hotspot/user/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({
          name: code,
          password: code,
          profile: profileName,
          'limit-uptime': limitUptime,
          comment: `GOZA ${stored.ticketNumber || ''} (${maxDevices} appareil${maxDevices > 1 ? 's' : ''} max)`,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (r.ok) {
        stored.mikrotikSynced = true;
        mikrotikMode = 'MIKROTIK_ROUTEROS_LIVE';
      }
    } catch {
      clearTimeout(timer);
    }
  }

  wifiVouchersStore[code] = stored;
  saveJsonMap(WIFI_VOUCHERS_FILE, wifiVouchersStore);
  console.log(`[Wi-Fi Hotspot] Voucher ${code} (${action || 'CREATE'}) · ${maxDevices} appareil(s) · Expire ${new Date(expiresAt).toLocaleTimeString('fr-FR')} [${mikrotikMode}]`);

  return res.status(200).json({
    success: true,
    mode: mikrotikMode,
    voucher: stored,
  });
});

app.post('/api/wifi/voucher/revoke', async (req, res) => {
  const { voucher } = req.body || {};
  const code = String(voucher?.code || '').trim().toUpperCase();
  if (!code) {
    return res.status(400).json({ success: false, error: 'Code Wi-Fi manquant' });
  }
  const now = Date.now();
  const existing = wifiVouchersStore[code];
  const fallbackDevices = Math.min(4, Math.max(1, Number(voucher?.maxDevices || existing?.maxDevices || 1)));
  wifiVouchersStore[code] = {
    ...(existing || {
      code,
      ssid: String(voucher?.ssid || 'GOZA-WiFi'),
      validFrom: Number(voucher?.validFrom || now),
      maxDevices: fallbackDevices,
      singleUseDeviceBound: fallbackDevices === 1,
    }),
    expiresAt: now,
    status: voucher?.status === 'REVOKED' ? 'REVOKED' : 'EXPIRED',
    inQueueWaiting: false,
    updatedAt: now,
  };
  saveJsonMap(WIFI_VOUCHERS_FILE, wifiVouchersStore);
  return res.status(200).json({ success: true, voucher: wifiVouchersStore[code] });
});

app.get('/api/wifi/vouchers', (_req, res) => {
  const vouchers = Object.values(wifiVouchersStore).sort((a, b) => b.updatedAt - a.updatedAt);
  res.status(200).json({ vouchers });
});

/**
 * STK Push adapter contract:
 * POST the payment fields to the configured merchant gateway and poll its status endpoint.
 * The gateway must return { transactionId, status } and accept a `reference` status query.
 */
const normalizeStkStatus = (status: unknown): StoredStkPayment['status'] | null => {
  const value = String(status || '').trim().toUpperCase();
  if (['PAID', 'SUCCESS', 'SUCCESSFUL', 'COMPLETED'].includes(value)) return 'PAID';
  if (['FAILED', 'DECLINED', 'CANCELLED', 'CANCELED', 'EXPIRED'].includes(value)) return 'FAILED';
  if (['PENDING', 'PROCESSING', 'ACCEPTED', 'QUEUED', ''].includes(value)) return 'PENDING';
  return null;
};

const stkGatewayConfig = () => ({
  pushUrl: process.env.MOBILE_MONEY_STK_PUSH_URL,
  statusUrl: process.env.MOBILE_MONEY_STK_STATUS_URL,
  apiToken: process.env.MOBILE_MONEY_STK_API_TOKEN,
});

app.post('/api/payments/stk', async (req, res) => {
  const { phone, network, amountCDF } = req.body || {};
  const cleanPhone = String(phone || '').trim();
  const cleanNetwork = String(network || '').trim().toUpperCase();
  const amount = Number(amountCDF);
  const supportedNetworks = ['MPESA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'AFRI_MONEY'];
  if (cleanPhone.replace(/\D/g, '').length < 9 || cleanPhone.replace(/\D/g, '').length > 15) {
    return res.status(400).json({ success: false, error: 'Numéro Mobile Money invalide.' });
  }
  if (!supportedNetworks.includes(cleanNetwork)) {
    return res.status(400).json({ success: false, error: 'Réseau Mobile Money non pris en charge.' });
  }
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Montant de paiement invalide.' });
  }

  const config = stkGatewayConfig();
  if (!config.pushUrl || !config.statusUrl || !config.apiToken) {
    return res.status(503).json({
      success: false,
      error: 'Le paiement STK Push n’est pas configuré. Ajoutez les paramètres du prestataire Mobile Money côté serveur.',
    });
  }

  const paymentId = crypto.randomUUID();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  try {
    const providerResponse = await fetch(config.pushUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference: paymentId,
        network: cleanNetwork,
        phone: cleanPhone,
        amount,
        currency: 'CDF',
      }),
      signal: AbortSignal.timeout(15000),
    });
    const providerData = await providerResponse.json().catch(() => ({}));
    if (!providerResponse.ok) {
      return res.status(502).json({
        success: false,
        error: providerData?.message || providerData?.error || 'Le prestataire a refusé la demande de paiement.',
      });
    }

    const providerTransactionId = String(providerData?.transactionId || '').trim();
    const status = normalizeStkStatus(providerData?.status);
    if (!providerTransactionId || status === null) {
      return res.status(502).json({ success: false, error: 'Réponse de paiement invalide du prestataire.' });
    }

    const payment: StoredStkPayment = {
      paymentId,
      network: cleanNetwork,
      phone: cleanPhone,
      amountCDF: amount,
      status,
      providerTransactionId,
      expiresAt,
      createdAt: Date.now(),
      ...(status === 'PAID' ? { paidAt: Date.now() } : {}),
      ...(providerData?.message ? { message: String(providerData.message) } : {}),
    };
    stkPaymentsStore[paymentId] = payment;
    saveJsonMap(STK_PAYMENTS_FILE, stkPaymentsStore);
    return res.status(201).json({
      success: true,
      paymentId,
      status: payment.status,
      expiresAt,
    });
  } catch (error) {
    console.error('[STK] Erreur demande paiement:', error);
    return res.status(502).json({ success: false, error: 'Impossible de joindre le prestataire de paiement.' });
  }
});

app.get('/api/payments/stk/:paymentId', async (req, res) => {
  const payment = stkPaymentsStore[String(req.params.paymentId || '')];
  if (!payment) {
    return res.status(404).json({ success: false, error: 'Demande de paiement introuvable.' });
  }
  if (payment.status !== 'PENDING') {
    return res.status(200).json({ success: true, status: payment.status, message: payment.message });
  }
  if (Date.now() >= payment.expiresAt) {
    payment.status = 'FAILED';
    payment.message = 'La demande de paiement a expiré.';
    saveJsonMap(STK_PAYMENTS_FILE, stkPaymentsStore);
    return res.status(200).json({ success: true, status: payment.status, message: payment.message });
  }

  const config = stkGatewayConfig();
  if (!config.statusUrl || !config.apiToken) {
    return res.status(503).json({ success: false, error: 'Vérification du prestataire Mobile Money non configurée.' });
  }
  try {
    const statusUrl = new URL(config.statusUrl);
    statusUrl.searchParams.set('reference', payment.providerTransactionId);
    const providerResponse = await fetch(statusUrl, {
      headers: { Authorization: `Bearer ${config.apiToken}` },
      signal: AbortSignal.timeout(15000),
    });
    const providerData = await providerResponse.json().catch(() => ({}));
    if (!providerResponse.ok) {
      return res.status(502).json({
        success: false,
        error: providerData?.message || providerData?.error || 'Le statut ne peut pas être vérifié auprès du prestataire.',
      });
    }
    const status = normalizeStkStatus(providerData?.status);
    if (status === null) {
      return res.status(502).json({ success: false, error: 'Statut de paiement invalide du prestataire.' });
    }
    payment.status = status;
    payment.message = providerData?.message ? String(providerData.message) : undefined;
    if (status === 'PAID') payment.paidAt = Date.now();
    saveJsonMap(STK_PAYMENTS_FILE, stkPaymentsStore);
    return res.status(200).json({ success: true, status: payment.status, message: payment.message });
  } catch (error) {
    console.error('[STK] Erreur vérification paiement:', error);
    return res.status(502).json({ success: false, error: 'Impossible de vérifier le paiement auprès du prestataire.' });
  }
});

app.get('/api/reservations', (_req, res) => {
  const list = Object.values(reservationsStore).sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
  res.status(200).json({ reservations: list });
});

app.post('/api/reservations', (req, res) => {
  const { reservation } = req.body || {};
  if (!reservation || !reservation.reservationCode) {
    return res.status(400).json({ success: false, error: 'Réservation invalide' });
  }
  if (reservation.paymentMode !== 'MOBILE_MONEY') {
    return res.status(400).json({
      success: false,
      error: 'Les réservations se font uniquement par Mobile Money depuis l’Espace Client.',
    });
  }
  if (Number(reservation.durationMinutes || 0) < 180) {
    return res.status(400).json({
      success: false,
      error: 'La réservation Mobile Money depuis l’espace client exige 3h (180 min) minimum.',
    });
  }
  const reservationCode = String(reservation.reservationCode).toUpperCase();
  if (!reservationsStore[reservationCode] && reservation.status === 'PAID_WAITING_CHECKIN') {
    const payment = stkPaymentsStore[String(reservation.paymentReference || '')];
    if (
      !payment ||
      payment.status !== 'PAID' ||
      payment.network !== String(reservation.paymentMethod || '').toUpperCase() ||
      payment.amountCDF !== Number(reservation.totalAmountCDF) ||
      payment.phone !== String(reservation.payerPhone || '').trim()
    ) {
      return res.status(402).json({
        success: false,
        error: 'Réservation refusée : aucun paiement STK Push confirmé correspondant.',
      });
    }
    const paymentAlreadyUsed = Object.values(reservationsStore).some(
      (existing: any) => existing?.paymentReference === payment.paymentId
    );
    if (paymentAlreadyUsed) {
      return res.status(409).json({ success: false, error: 'Ce paiement est déjà associé à une réservation.' });
    }
  }
  if (
    reservation.status === 'CANCELLED' &&
    reservation.cancelReason === 'CLIENT_SELF_CANCEL' &&
    Number(reservation.reservedForTime || 0) - Date.now() < 60 * 60000
  ) {
    return res.status(400).json({
      success: false,
      error: "Annulation refusée : possible uniquement au moins 1h avant l'heure réservée.",
    });
  }
  if (
    reservation.status === 'PAID_WAITING_CHECKIN' &&
    reservation.preferredStationId
  ) {
    const reqStart = Number(reservation.reservedForTime || 0);
    const reqEnd = reqStart + Number(reservation.durationMinutes || 0) * 60000;
    const conflict = Object.values(reservationsStore).find((existing: any) => {
      if (!existing || existing.reservationCode === reservation.reservationCode) return false;
      if (
        existing.status !== 'PAID_WAITING_CHECKIN' &&
        existing.status !== 'VALIDATED_IN_QUEUE' &&
        existing.status !== 'VALIDATED_ON_STATION'
      ) {
        return false;
      }
      if (
        Number(existing.preferredStationId || 0) !== Number(reservation.preferredStationId) &&
        Number(existing.stationId || 0) !== Number(reservation.preferredStationId)
      ) {
        return false;
      }
      const eStart = Number(existing.reservedForTime || 0);
      const eEnd = eStart + Number(existing.playableDurationMinutes ?? existing.durationMinutes ?? 0) * 60000;
      return reqStart < eEnd && reqEnd > eStart;
    });
    if (conflict) {
      return res.status(409).json({
        success: false,
        error: "Ce n'est pas disponible : ce poste est déjà réservé sur ce créneau.",
      });
    }
  }
  reservationsStore[String(reservation.reservationCode).toUpperCase()] = {
    ...reservation,
    updatedAt: Date.now(),
  };
  saveJsonMap(RESERVATIONS_FILE, reservationsStore);
  return res.status(200).json({ success: true, reservation });
});

/**
 * 5. Contrôle d'Accès Serveur aux Réglages (Section 2.18 RBAC)
 * Contrôle vérifié côté serveur, accès refusé HTTP 403 pour tout rôle non-administrateur
 */
app.get('/api/settings', (req, res) => {
  const staffRole = req.headers['x-staff-role'];
  if (staffRole !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'HTTP 403 Forbidden : Accès aux réglages strictement réservé à l\'administrateur propriétaire.',
      requiredRole: 'ADMIN',
      providedRole: staffRole || 'ANONYMOUS',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Autorisation administrateur accordée',
    timestamp: Date.now(),
  });
});

app.post('/api/settings/validate', (req, res) => {
  const staffRole = req.headers['x-staff-role'];
  if (staffRole !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'HTTP 403 Forbidden : Seul l\'administrateur peut enregistrer ou modifier les réglages système.',
      requiredRole: 'ADMIN',
      providedRole: staffRole || 'ANONYMOUS',
    });
  }

  const { settings, section, reason, adminPassword } = req.body;
  // Vérification de base
  if (!settings) {
    return res.status(400).json({ success: false, error: 'Données de configuration manquantes' });
  }

  res.status(200).json({
    success: true,
    message: `Réglages validés côté serveur pour la section : ${section || 'Générale'}`,
    savedAt: Date.now(),
  });
});

app.get('/api/system/health', (_req, res) => {
  const whatsappConfigured = Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  );
  const stkConfigured = Boolean(
    process.env.MOBILE_MONEY_STK_PUSH_URL &&
    process.env.MOBILE_MONEY_STK_STATUS_URL &&
    process.env.MOBILE_MONEY_STK_API_TOKEN
  );
  res.status(200).json({
    status: 'HEALTHY',
    version: '2.18.0',
    uptimeSeconds: Math.floor(process.uptime()),
    serverTime: new Date().toISOString(),
    mqttBroker: process.env.MQTT_BROKER_URL ? 'CONFIGURED (connectivity not verified)' : 'NOT_CONFIGURED',
    whatsappGateway: whatsappConfigured ? 'CONFIGURED (connectivity not verified)' : 'NOT_CONFIGURED',
    mobileMoneyStk: stkConfigured ? 'CONFIGURED (connectivity not verified)' : 'NOT_CONFIGURED',
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  });
});

/**
 * 6. Configuration Vite middleware (dev) / Static (prod)
 */
async function startServer() {
  if (!IS_BUILT_SERVER && process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(APP_ROOT, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(APP_ROOT, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GOZA server running on http://localhost:${PORT}`);
  });
}

startServer();
