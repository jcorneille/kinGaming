import { DomotiqueDevice, SystemSettings } from '../types';
import { mqttGateway } from './mqttService';

/**
 * Service de pilotage des relais Shelly (Gen1 / Gen2 Plus) & règle d'exemption GOZA.
 *
 * Règle métier :
 * - Le courant passe automatiquement dans le relais Shelly d'un poste UNIQUEMENT
 *   lorsqu'un ticket est généré pour ce poste précis (et coupé quand la session s'achève).
 * - SAUF pour 2 postes exemptés (1 poste PS4 + 1 poste PS5) configurables par l'Admin :
 *   ces 2 postes restent en contrôle manuel et ne sont jamais déclenchés ni coupés
 *   automatiquement par la génération/fin d'un ticket.
 */

export function isStationShellyExempt(
  stationId: number,
  settings?: Pick<SystemSettings, 'shellyExemptPs4StationId' | 'shellyExemptPs5StationId'>
): boolean {
  if (!settings) return false;
  const ps4ExemptId = settings.shellyExemptPs4StationId;
  const ps5ExemptId = settings.shellyExemptPs5StationId;
  return (
    (typeof ps4ExemptId === 'number' && ps4ExemptId === stationId) ||
    (typeof ps5ExemptId === 'number' && ps5ExemptId === stationId)
  );
}

export function getShellyExemptStationIds(
  settings?: Pick<SystemSettings, 'shellyExemptPs4StationId' | 'shellyExemptPs5StationId'>
): number[] {
  const ids: number[] = [];
  if (typeof settings?.shellyExemptPs4StationId === 'number') {
    ids.push(settings.shellyExemptPs4StationId);
  }
  if (typeof settings?.shellyExemptPs5StationId === 'number' && !ids.includes(settings.shellyExemptPs5StationId)) {
    ids.push(settings.shellyExemptPs5StationId);
  }
  return ids;
}

export interface TriggerShellyOptions {
  stationId: number;
  state: 'ON' | 'OFF';
  target?: 'POWER' | 'SCREEN' | 'BOTH';
  device?: DomotiqueDevice;
  topicPrefix?: string;
  reason?: string;
}

export function dispatchStationShellyCommand({
  stationId,
  state,
  target = 'BOTH',
  device,
  topicPrefix = 'gaminghub',
  reason,
}: TriggerShellyOptions): void {
  const cleanPrefix = (topicPrefix || 'gaminghub').replace(/\/+$/, '');

  if (target === 'SCREEN') {
    mqttGateway.publish(`${cleanPrefix}/station/${stationId}/screen/set`, state);
  } else if (target === 'POWER') {
    mqttGateway.publish(`${cleanPrefix}/station/${stationId}/power/set`, state);
  } else {
    mqttGateway.publish(`${cleanPrefix}/station/${stationId}/power/set`, state);
    mqttGateway.publish(`${cleanPrefix}/station/${stationId}/screen/set`, state);
  }

  // Envoi HTTP asynchrone vers la passerelle Shelly locale (si joignable sur le LAN)
  const ipAddress = device?.ipAddress || `192.168.1.${120 + stationId}`;
  const hardwareType = device?.hardwareType || 'SHELLY_1PM';

  if (typeof fetch !== 'undefined') {
    void fetch('/api/shelly/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stationId,
        state,
        target,
        ipAddress,
        hardwareType,
        reason: reason || 'TICKET_AUTOMATION',
      }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (data?.delivered) {
          mqttGateway.recordPacket(
            `shelly://${ipAddress}/relay/0`,
            `${state} (${data.protocol || 'SHELLY_HTTP'} OK)`,
            'MESSAGE_IN'
          );
        }
      })
      .catch(() => {
        // Environnement hors-ligne ou Cloud sans accès LAN direct : le log MQTT fait foi
      });
  }
}
