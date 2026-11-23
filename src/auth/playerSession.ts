export interface PlayerProfile {
  id: string;
  gamerTag: string;
  team: 'BLUE' | 'RED' | 'NEON' | 'SOLO';
  avatar: string;
  stats?: {
    messagesSent: number;
    filesTransferred: number;
    bytesTransmitted?: number;
  };
  token?: string;
  isOfflineGuest?: boolean;
}

export interface SquadStat {
  team: 'BLUE' | 'RED' | 'NEON' | 'SOLO';
  name: string;
  color: string;
  bg: string;
  totalMessages: number;
  totalFiles: number;
  totalBytes: number;
  playerCount: number;
  score: number;
}

export interface TopPlayer {
  gamerTag: string;
  team: 'BLUE' | 'RED' | 'NEON' | 'SOLO';
  avatar: string;
  stats: {
    messagesSent: number;
    filesTransferred: number;
    bytesTransmitted?: number;
  };
}

export interface LeaderboardData {
  ok: boolean;
  squads: SquadStat[];
  topPlayers: TopPlayer[];
  totalAcousticMessages: number;
  totalAcousticBytes: number;
  totalPlayers: number;
  mvpPlayer: TopPlayer | null;
  storage: string;
  timestamp: string;
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
  } catch {
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
  } catch {
    return { ok: false, error: 'Server unreachable. You can use OFFLINE GUEST MODE without internet!' };
  }
}

export async function recordPlayerStat(gamerTag: string, type: 'message' | 'file', bytes = 0): Promise<void> {
  try {
    await fetch(`${API_BASE}/stat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gamerTag, type, bytes }),
    });
  } catch {
    // Air-gapped fallback ignores network failure
  }
}

export async function fetchLeaderboard(): Promise<LeaderboardData> {
  try {
    const res = await fetch(`${API_BASE}/leaderboard`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok) return data;
    }
  } catch {
    // Air-gapped offline tournament room fallback
  }

  const current = getStoredPlayer();
  const dummySquads: SquadStat[] = [
    { team: 'BLUE' as const, name: 'Team Blue', color: '#00d2ff', bg: 'rgba(0, 210, 255, 0.15)', totalMessages: current?.team === 'BLUE' ? (current.stats?.messagesSent || 1) : 14, totalFiles: 1, totalBytes: 2560, playerCount: 2, score: 250 },
    { team: 'RED' as const, name: 'Team Red', color: '#ff3366', bg: 'rgba(255, 51, 102, 0.15)', totalMessages: current?.team === 'RED' ? (current.stats?.messagesSent || 1) : 18, totalFiles: 2, totalBytes: 3120, playerCount: 3, score: 320 },
    { team: 'NEON' as const, name: 'Team Neon', color: '#00ff88', bg: 'rgba(0, 255, 136, 0.15)', totalMessages: current?.team === 'NEON' ? (current.stats?.messagesSent || 1) : 22, totalFiles: 3, totalBytes: 4500, playerCount: 4, score: 410 },
    { team: 'SOLO' as const, name: 'Solo Hunters', color: '#ffaa00', bg: 'rgba(255, 170, 0, 0.15)', totalMessages: current?.team === 'SOLO' ? (current.stats?.messagesSent || 1) : 8, totalFiles: 0, totalBytes: 1100, playerCount: 1, score: 90 },
  ].sort((a, b) => b.score - a.score);

  const topList: TopPlayer[] = current
    ? [
        {
          gamerTag: current.gamerTag,
          team: current.team,
          avatar: current.avatar,
          stats: {
            messagesSent: current.stats?.messagesSent || 0,
            filesTransferred: current.stats?.filesTransferred || 0,
            bytesTransmitted: current.stats?.bytesTransmitted || (current.stats?.messagesSent || 0) * 128,
          },
        },
      ]
    : [];

  return {
    ok: true,
    squads: dummySquads,
    topPlayers: topList,
    totalAcousticMessages: dummySquads.reduce((a, s) => a + s.totalMessages, 0),
    totalAcousticBytes: dummySquads.reduce((a, s) => a + s.totalBytes, 0),
    totalPlayers: dummySquads.reduce((a, s) => a + s.playerCount, 0),
    mvpPlayer: topList[0] || null,
    storage: 'offline-local-cache',
    timestamp: new Date().toISOString(),
  };
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
      team: match[1] as 'BLUE' | 'RED' | 'NEON' | 'SOLO',
      gamerTag: match[2],
      cleanText: match[3],
    };
  }
  return {
    hasGamerTag: false,
    cleanText: text,
  };
}
