export interface PlayerProfile {
  id: string;
  gamerTag: string;
  team: 'BLUE' | 'RED' | 'NEON' | 'SOLO';
  avatar: string;
  stats?: {
    messagesSent: number;
    filesTransferred: number;
  };
  token?: string;
  isOfflineGuest?: boolean;
}

const STORAGE_KEY = 'sonicbridge_player_session';

export function getStoredPlayer(): PlayerProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storePlayer(player: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
  } catch {
    // Local storage unavailable
  }
}

export function clearPlayer(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

// ── API HELPERS ────────────────────────────────────────────────────────

const API_BASE = '/api/auth';

export async function loginPlayer(gamerTag: string, password: string): Promise<{ ok: boolean; player?: PlayerProfile; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gamerTag, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Failed to login' };
    }

    const player: PlayerProfile = {
      ...data.player,
      token: data.token,
      isOfflineGuest: false,
    };
    storePlayer(player);
    return { ok: true, player };
  } catch (err: any) {
    // If backend is unreachable (100% offline air-gapped game club), allow local login
    return { ok: false, error: 'Server unreachable. You can use OFFLINE GUEST MODE without internet!' };
  }
}

export async function registerPlayer(
  gamerTag: string,
  password: string,
  team: 'BLUE' | 'RED' | 'NEON' | 'SOLO' = 'SOLO',
  avatar: string = '⚡'
): Promise<{ ok: boolean; player?: PlayerProfile; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gamerTag, password, team, avatar }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Failed to register' };
    }

    const player: PlayerProfile = {
      ...data.player,
      token: data.token,
      isOfflineGuest: false,
    };
    storePlayer(player);
    return { ok: true, player };
  } catch (err: any) {
    return { ok: false, error: 'Server unreachable. You can use OFFLINE GUEST MODE without internet!' };
  }
}

export function createGuestPlayer(
  gamerTag: string,
  team: 'BLUE' | 'RED' | 'NEON' | 'SOLO' = 'SOLO',
  avatar: string = '⚡'
): PlayerProfile {
  const player: PlayerProfile = {
    id: 'guest_' + Math.random().toString(36).substring(2, 9),
    gamerTag: gamerTag.trim() || 'Player_' + Math.floor(Math.random() * 900 + 100),
    team,
    avatar,
    stats: { messagesSent: 0, filesTransferred: 0 },
    isOfflineGuest: true,
  };
  storePlayer(player);
  return player;
}

// ── SOUND MESSAGE FORMATTING & PARSING ───────────────────────────────────

export function formatGamerMessage(player: PlayerProfile, text: string): string {
  // Format: [TAG:TEAM:GamerTag] message
  return `[${player.team}:${player.gamerTag}] ${text}`;
}

export interface ParsedGamerMessage {
  hasGamerTag: boolean;
  team?: 'BLUE' | 'RED' | 'NEON' | 'SOLO';
  gamerTag?: string;
  cleanText: string;
}

export function parseGamerMessage(text: string): ParsedGamerMessage {
  // Regex: matches [TEAM:GamerTag] at the start
  const match = text.match(/^\[(BLUE|RED|NEON|SOLO):([^\]]+)\]\s*(.*)$/);
  if (match) {
    return {
      hasGamerTag: true,
      team: match[1] as any,
      gamerTag: match[2],
      cleanText: match[3],
    };
  }
  return {
    hasGamerTag: false,
    cleanText: text,
  };
}
