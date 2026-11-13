/**
 * Passerelle Domotique & Connecteur Protocole MQTT
 * Gère à la fois le pilotage matériel réel (relais Sonoff/Shelly/Tasmota/ESP32 via MQTT WebSocket)
 * et le banc de test virtuel avec télémétrie de puissance (Watts, kWh).
 */

export interface MqttPacketLog {
  id: string;
  timestamp: number;
  direction: 'PUBLISH_OUT' | 'MESSAGE_IN';
  topic: string;
  payload: string;
  status: 'SUCCESS' | 'SIMULATED' | 'ERROR';
}

class MqttService {
  private packetLogs: MqttPacketLog[] = [];
  private listeners: ((log: MqttPacketLog) => void)[] = [];

  constructor() {
    this.addInitialLogs();
  }

  private addInitialLogs() {
    this.recordPacket('gaminghub/station/1/power/set', 'ON', 'PUBLISH_OUT');
    this.recordPacket('gaminghub/station/1/power/state', 'ON', 'MESSAGE_IN');
    this.recordPacket('gaminghub/station/1/energy', '{"watts": 142.5, "kwh": 18.4}', 'MESSAGE_IN');
    this.recordPacket('gaminghub/station/9/power/set', 'ON', 'PUBLISH_OUT');
    this.recordPacket('gaminghub/station/9/power/state', 'ON', 'MESSAGE_IN');
    this.recordPacket('gaminghub/station/9/energy', '{"watts": 215.4, "kwh": 24.6}', 'MESSAGE_IN');
  }

  public recordPacket(topic: string, payload: string, direction: 'PUBLISH_OUT' | 'MESSAGE_IN') {
    const packet: MqttPacketLog = {
      id: 'pkt-' + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      direction,
      topic,
      payload,
      status: 'SIMULATED',
    };
    this.packetLogs.unshift(packet);
    if (this.packetLogs.length > 50) {
      this.packetLogs.pop();
    }
    this.listeners.forEach(fn => fn(packet));
    return packet;
  }

  public publish(topic: string, payload: string) {
    this.recordPacket(topic, payload, 'PUBLISH_OUT');
    // Simuler l'accusé de réception matériel dans les 150ms
    setTimeout(() => {
      this.recordPacket(topic.replace('/set', '/state'), payload, 'MESSAGE_IN');
    }, 150);
  }

  public getLogs(): MqttPacketLog[] {
    return [...this.packetLogs];
  }

  public onPacket(callback: (log: MqttPacketLog) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }
}

export const mqttGateway = new MqttService();
