import { Client, Ticket } from '../types';

export const MINIMUM_REGISTRATION_TICKET_MINUTES = 180; // 3 heures de jeu

/**
 * Normalise un numéro de téléphone pour comparaison fiable (dernier 9 chiffres RDC ou digits complets)
 */
export function normalizePhoneDigits(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

export function phonesMatch(phoneA?: string, phoneB?: string): boolean {
  const a = normalizePhoneDigits(phoneA);
  const b = normalizePhoneDigits(phoneB);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 9 && b.length >= 9) {
    return a.slice(-9) === b.slice(-9);
  }
  return false;
}

/**
 * Nettoie une saisie de code parrain : majuscules alphanumériques, max 5 caractères
 */
export function normalizeReferralCodeInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
}

/**
 * Vérifie qu'un code parrain respecte :
 * - maximum 5 caractères (1 à 5)
 * - uniquement des lettres (A-Z) et des chiffres (0-9)
 * - contient obligatoirement au moins 1 lettre ET au moins 1 chiffre
 */
export function isValidReferralCodeFormat(code: string): boolean {
  const normalized = (code || '').trim().toUpperCase();
  return /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{1,5}$/.test(normalized);
}

/**
 * Génère un code parrain unique de 5 caractères maximum composé de lettres et de chiffres.
 */
export function generateUniqueReferralCode(
  fullName: string,
  existingClients: Pick<Client, 'referralCode'>[]
): string {
  const used = new Set(
    existingClients
      .map((c) => (c.referralCode || '').trim().toUpperCase())
      .filter(Boolean)
  );

  // Extraire jusqu'à 2 lettres du nom/prénom du joueur
  const cleanLetters = (fullName || 'GZ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');

  const prefix = (cleanLetters.slice(0, 2) || 'GZ').padEnd(2, 'X');
  const digits = '0123456789';
  const alphaNum = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  // Essayer d'abord 2 lettres + 3 chiffres (ex: CO482)
  for (let attempt = 0; attempt < 150; attempt++) {
    const numPart = String(Math.floor(100 + Math.random() * 900));
    const candidate = `${prefix}${numPart}`.slice(0, 5);
    if (!used.has(candidate) && isValidReferralCodeFormat(candidate)) {
      return candidate;
    }
  }

  // Fallback garanti unique 5 caractères alphanumériques (lettres + chiffres)
  for (let attempt = 0; attempt < 500; attempt++) {
    let code = prefix[0];
    code += digits[Math.floor(Math.random() * digits.length)];
    for (let i = 0; i < 3; i++) {
      code += alphaNum[Math.floor(Math.random() * alphaNum.length)];
    }
    if (!used.has(code) && isValidReferralCodeFormat(code)) {
      return code;
    }
  }

  return `G${Date.now().toString(36).toUpperCase().slice(-4)}`.slice(0, 5);
}

/**
 * Vérifie si un client possède un ticket de jeu valide d'au moins 3H (180 min)
 * permettant son enregistrement dans le système.
 */
export function findQualifying3HTicket(
  tickets: Ticket[],
  phone?: string,
  explicitTicketNumber?: string
): Ticket | undefined {
  const valid3HTickets = tickets.filter(
    (t) =>
      t.status !== 'refunded' &&
      t.status !== 'cancelled' &&
      t.durationMinutes >= MINIMUM_REGISTRATION_TICKET_MINUTES
  );

  if (explicitTicketNumber && explicitTicketNumber.trim()) {
    const cleanNum = explicitTicketNumber.trim().toUpperCase();
    const byTicketNum = valid3HTickets.find(
      (t) =>
        t.ticketNumber.toUpperCase() === cleanNum ||
        t.id.toUpperCase() === cleanNum
    );
    if (byTicketNum) return byTicketNum;
  }

  if (phone && normalizePhoneDigits(phone).length >= 8) {
    return valid3HTickets.find(
      (t) =>
        !t.clientId &&
        (phonesMatch(t.clientPhone, phone) || phonesMatch(t.payerPhone, phone))
    );
  }

  return undefined;
}
