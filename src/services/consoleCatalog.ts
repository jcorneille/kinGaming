import { StationType } from '../types';

export interface ConsoleSpec {
  code: StationType;
  label: string;
  shortLabel: string;
  brand: 'Sony PlayStation' | 'Microsoft Xbox';
  tierClass: 'NEXT_GEN' | 'STANDARD' | 'PC_VR';
  defaultWatts: number;
}

export const CONSOLE_CATALOG: ConsoleSpec[] = [
  // Sony PlayStation
  { code: 'PS4', label: 'PS4', shortLabel: 'PS4', brand: 'Sony PlayStation', tierClass: 'STANDARD', defaultWatts: 135 },
  { code: 'PS5', label: 'PS5', shortLabel: 'PS5', brand: 'Sony PlayStation', tierClass: 'NEXT_GEN', defaultWatts: 210 },
  { code: 'PS5_VR', label: 'PS5 + VR', shortLabel: 'PS5 + VR', brand: 'Sony PlayStation', tierClass: 'PC_VR', defaultWatts: 245 },

  // Microsoft Xbox
  { code: 'XBOX_ONE', label: 'Xbox One', shortLabel: 'Xbox One', brand: 'Microsoft Xbox', tierClass: 'STANDARD', defaultWatts: 120 },
  { code: 'XBOX_ONE_X', label: 'Xbox One X', shortLabel: 'Xbox One X', brand: 'Microsoft Xbox', tierClass: 'STANDARD', defaultWatts: 160 },
];

export const CONSOLE_BRANDS: ConsoleSpec['brand'][] = [
  'Sony PlayStation',
  'Microsoft Xbox',
];

export function getConsoleSpec(type: string): ConsoleSpec | undefined {
  const normalized =
    type === 'XBOX_ONE_S'
      ? 'XBOX_ONE'
      : type === 'PSVR2'
      ? 'PS5_VR'
      : type;
  return CONSOLE_CATALOG.find((c) => c.code === normalized);
}

export function getConsoleLabel(type: string): string {
  return getConsoleSpec(type)?.shortLabel || type;
}

export function getConsoleWatts(type: string): number {
  return getConsoleSpec(type)?.defaultWatts ?? 140;
}

export function isHighTierConsole(type: string): boolean {
  const spec = getConsoleSpec(type);
  if (!spec) return type.includes('PS5') || type.includes('VR');
  return spec.tierClass === 'NEXT_GEN' || spec.tierClass === 'PC_VR';
}

export function getFallbackBaseType(type: string): 'PS4' | 'PS5' {
  return isHighTierConsole(type) ? 'PS5' : 'PS4';
}
