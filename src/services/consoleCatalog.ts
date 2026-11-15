import { StationType } from '../types';

export interface ConsoleSpec {
  code: StationType;
  label: string;
  shortLabel: string;
  brand: 'Sony PlayStation' | 'Microsoft Xbox' | 'Nintendo' | 'PC & Portables' | 'VR & Arcade / Sim';
  tierClass: 'NEXT_GEN' | 'STANDARD' | 'PC_VR';
  defaultWatts: number;
}

export const CONSOLE_CATALOG: ConsoleSpec[] = [
  // Sony PlayStation
  { code: 'PS5', label: 'PlayStation 5 (Standard / Slim)', shortLabel: 'PS5', brand: 'Sony PlayStation', tierClass: 'NEXT_GEN', defaultWatts: 210 },
  { code: 'PS5_PRO', label: 'PlayStation 5 Pro', shortLabel: 'PS5 Pro', brand: 'Sony PlayStation', tierClass: 'NEXT_GEN', defaultWatts: 240 },
  { code: 'PS4', label: 'PlayStation 4 (Standard / Slim)', shortLabel: 'PS4', brand: 'Sony PlayStation', tierClass: 'STANDARD', defaultWatts: 135 },
  { code: 'PS4_PRO', label: 'PlayStation 4 Pro', shortLabel: 'PS4 Pro', brand: 'Sony PlayStation', tierClass: 'STANDARD', defaultWatts: 165 },
  { code: 'PS3', label: 'PlayStation 3 (PS3)', shortLabel: 'PS3', brand: 'Sony PlayStation', tierClass: 'STANDARD', defaultWatts: 110 },
  { code: 'PS2', label: 'PlayStation 2 (PS2)', shortLabel: 'PS2', brand: 'Sony PlayStation', tierClass: 'STANDARD', defaultWatts: 55 },
  { code: 'PS1', label: 'PlayStation 1 (PSX / PSone)', shortLabel: 'PS1', brand: 'Sony PlayStation', tierClass: 'STANDARD', defaultWatts: 35 },
  { code: 'PSP', label: 'PlayStation Portable (PSP)', shortLabel: 'PSP', brand: 'Sony PlayStation', tierClass: 'STANDARD', defaultWatts: 20 },
  { code: 'PS_VITA', label: 'PlayStation Vita (PS Vita)', shortLabel: 'PS Vita', brand: 'Sony PlayStation', tierClass: 'STANDARD', defaultWatts: 20 },
  { code: 'PSVR2', label: 'PlayStation VR2 (PS VR2)', shortLabel: 'PS VR2', brand: 'Sony PlayStation', tierClass: 'PC_VR', defaultWatts: 230 },

  // Microsoft Xbox
  { code: 'XBOX_SERIES_X', label: 'Xbox Series X', shortLabel: 'Series X', brand: 'Microsoft Xbox', tierClass: 'NEXT_GEN', defaultWatts: 190 },
  { code: 'XBOX_SERIES_S', label: 'Xbox Series S', shortLabel: 'Series S', brand: 'Microsoft Xbox', tierClass: 'STANDARD', defaultWatts: 115 },
  { code: 'XBOX_ONE_X', label: 'Xbox One X', shortLabel: 'One X', brand: 'Microsoft Xbox', tierClass: 'STANDARD', defaultWatts: 160 },
  { code: 'XBOX_ONE_S', label: 'Xbox One / Xbox One S', shortLabel: 'Xbox One', brand: 'Microsoft Xbox', tierClass: 'STANDARD', defaultWatts: 120 },
  { code: 'XBOX_360', label: 'Xbox 360', shortLabel: 'Xbox 360', brand: 'Microsoft Xbox', tierClass: 'STANDARD', defaultWatts: 110 },
  { code: 'XBOX_ORIGINAL', label: 'Xbox Original (1re génération)', shortLabel: 'Xbox OG', brand: 'Microsoft Xbox', tierClass: 'STANDARD', defaultWatts: 85 },

  // Nintendo
  { code: 'SWITCH_2', label: 'Nintendo Switch 2', shortLabel: 'Switch 2', brand: 'Nintendo', tierClass: 'NEXT_GEN', defaultWatts: 65 },
  { code: 'SWITCH_OLED', label: 'Nintendo Switch OLED (TV / Dock)', shortLabel: 'Switch OLED', brand: 'Nintendo', tierClass: 'STANDARD', defaultWatts: 50 },
  { code: 'SWITCH', label: 'Nintendo Switch Standard', shortLabel: 'Switch', brand: 'Nintendo', tierClass: 'STANDARD', defaultWatts: 45 },
  { code: 'SWITCH_LITE', label: 'Nintendo Switch Lite', shortLabel: 'Switch Lite', brand: 'Nintendo', tierClass: 'STANDARD', defaultWatts: 25 },
  { code: 'WII_U', label: 'Nintendo Wii U', shortLabel: 'Wii U', brand: 'Nintendo', tierClass: 'STANDARD', defaultWatts: 65 },
  { code: 'WII', label: 'Nintendo Wii', shortLabel: 'Wii', brand: 'Nintendo', tierClass: 'STANDARD', defaultWatts: 45 },
  { code: 'GAMECUBE', label: 'Nintendo GameCube', shortLabel: 'GameCube', brand: 'Nintendo', tierClass: 'STANDARD', defaultWatts: 40 },
  { code: 'N64', label: 'Nintendo 64 (N64)', shortLabel: 'N64', brand: 'Nintendo', tierClass: 'STANDARD', defaultWatts: 30 },
  { code: 'SNES', label: 'Super Nintendo (SNES)', shortLabel: 'SNES', brand: 'Nintendo', tierClass: 'STANDARD', defaultWatts: 25 },
  { code: 'NES', label: 'Nintendo NES / Famicom', shortLabel: 'NES', brand: 'Nintendo', tierClass: 'STANDARD', defaultWatts: 20 },
  { code: 'NINTENDO_3DS', label: 'Nintendo 3DS / New 3DS / 2DS', shortLabel: '3DS', brand: 'Nintendo', tierClass: 'STANDARD', defaultWatts: 15 },
  { code: 'GAMEBOY_ADVANCE', label: 'Game Boy Advance / Color', shortLabel: 'GBA', brand: 'Nintendo', tierClass: 'STANDARD', defaultWatts: 15 },

  // PC & Consoles Portables
  { code: 'PC_GAMING', label: 'PC Gaming (RTX / Esports 144Hz)', shortLabel: 'PC Gaming', brand: 'PC & Portables', tierClass: 'PC_VR', defaultWatts: 380 },
  { code: 'PC_GAMING_PRO', label: 'PC Gaming Ultra (4K / Streaming)', shortLabel: 'PC Ultra', brand: 'PC & Portables', tierClass: 'PC_VR', defaultWatts: 480 },
  { code: 'STEAM_DECK', label: 'Valve Steam Deck (LCD / OLED)', shortLabel: 'Steam Deck', brand: 'PC & Portables', tierClass: 'STANDARD', defaultWatts: 45 },
  { code: 'ROG_ALLY', label: 'ASUS ROG Ally / ROG Ally X', shortLabel: 'ROG Ally', brand: 'PC & Portables', tierClass: 'STANDARD', defaultWatts: 65 },
  { code: 'LEGION_GO', label: 'Lenovo Legion Go', shortLabel: 'Legion Go', brand: 'PC & Portables', tierClass: 'STANDARD', defaultWatts: 65 },
  { code: 'MSI_CLAW', label: 'MSI Claw', shortLabel: 'MSI Claw', brand: 'PC & Portables', tierClass: 'STANDARD', defaultWatts: 65 },
  { code: 'NVIDIA_SHIELD', label: 'NVIDIA Shield TV / Cloud Gaming', shortLabel: 'Shield TV', brand: 'PC & Portables', tierClass: 'STANDARD', defaultWatts: 40 },

  // VR, Arcade, SimRacing & Rétro SEGA/Atari
  { code: 'META_QUEST_3', label: 'Meta Quest 3 / 3S (Réalité Virtuelle)', shortLabel: 'Quest 3', brand: 'VR & Arcade / Sim', tierClass: 'PC_VR', defaultWatts: 120 },
  { code: 'META_QUEST_2', label: 'Meta Quest 2 (Réalité Virtuelle)', shortLabel: 'Quest 2', brand: 'VR & Arcade / Sim', tierClass: 'PC_VR', defaultWatts: 100 },
  { code: 'SIM_RACING', label: 'Simulateur Auto (Volant + Siège Baquet)', shortLabel: 'Sim Racing', brand: 'VR & Arcade / Sim', tierClass: 'PC_VR', defaultWatts: 320 },
  { code: 'BORNE_ARCADE', label: 'Borne Arcade Multi-Jeux (2 Joueurs)', shortLabel: 'Arcade', brand: 'VR & Arcade / Sim', tierClass: 'STANDARD', defaultWatts: 140 },
  { code: 'SEGA_DREAMCAST', label: 'SEGA Dreamcast', shortLabel: 'Dreamcast', brand: 'VR & Arcade / Sim', tierClass: 'STANDARD', defaultWatts: 40 },
  { code: 'SEGA_MEGADRIVE', label: 'SEGA Mega Drive / Genesis', shortLabel: 'Mega Drive', brand: 'VR & Arcade / Sim', tierClass: 'STANDARD', defaultWatts: 25 },
  { code: 'NEO_GEO', label: 'SNK Neo Geo AES / MVS', shortLabel: 'Neo Geo', brand: 'VR & Arcade / Sim', tierClass: 'STANDARD', defaultWatts: 45 },
  { code: 'ATARI_2600', label: 'Atari 2600 / VCS', shortLabel: 'Atari', brand: 'VR & Arcade / Sim', tierClass: 'STANDARD', defaultWatts: 25 },
];

export const CONSOLE_BRANDS: ConsoleSpec['brand'][] = [
  'Sony PlayStation',
  'Microsoft Xbox',
  'Nintendo',
  'PC & Portables',
  'VR & Arcade / Sim',
];

export function getConsoleSpec(type: string): ConsoleSpec | undefined {
  return CONSOLE_CATALOG.find((c) => c.code === type);
}

export function getConsoleLabel(type: string): string {
  return getConsoleSpec(type)?.shortLabel || type;
}

export function getConsoleWatts(type: string): number {
  return getConsoleSpec(type)?.defaultWatts ?? 140;
}

export function isHighTierConsole(type: string): boolean {
  const spec = getConsoleSpec(type);
  if (!spec) return type.includes('PS5') || type.includes('XBOX_SERIES_X') || type.includes('PC');
  return spec.tierClass === 'NEXT_GEN' || spec.tierClass === 'PC_VR';
}

export function getFallbackBaseType(type: string): 'PS4' | 'PS5' {
  return isHighTierConsole(type) ? 'PS5' : 'PS4';
}
