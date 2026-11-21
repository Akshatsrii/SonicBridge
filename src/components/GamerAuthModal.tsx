import React, { useState } from 'react';
import {
  PlayerProfile,
  loginPlayer,
  registerPlayer,
  createGuestPlayer,
} from '../auth/playerSession';

interface GamerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayerLoggedIn: (player: PlayerProfile) => void;
  currentProfile?: PlayerProfile | null;
  onLogout?: () => void;
}

const TEAMS = [
  { id: 'BLUE', name: 'TEAM BLUE', color: '#00d2ff', bg: 'rgba(0, 210, 255, 0.15)', border: '#00d2ff' },
  { id: 'RED', name: 'TEAM RED', color: '#ff3366', bg: 'rgba(255, 51, 102, 0.15)', border: '#ff3366' },
  { id: 'NEON', name: 'TEAM NEON', color: '#00ff88', bg: 'rgba(0, 255, 136, 0.15)', border: '#00ff88' },
  { id: 'SOLO', name: 'SOLO LONE', color: '#ffaa00', bg: 'rgba(255, 170, 0, 0.15)', border: '#ffaa00' },
] as const;

const AVATARS = ['⚡', '🎮', '🥷', '🤖', '👑', '🔥', '🎯', '🚀'];

export const GamerAuthModal: React.FC<GamerAuthModalProps> = ({
  isOpen,
  onClose,
  onPlayerLoggedIn,
  currentProfile,
  onLogout,
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'offline'>('login');
  const [gamerTag, setGamerTag] = useState('');
  const [password, setPassword] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<'BLUE' | 'RED' | 'NEON' | 'SOLO'>('BLUE');
  const [selectedAvatar, setSelectedAvatar] = useState('⚡');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (tab === 'offline') {
        if (!gamerTag.trim()) {
          setErrorMsg('Please enter a Gamer Tag');
          setLoading(false);
          return;
        }
        const player = createGuestPlayer(gamerTag, selectedTeam, selectedAvatar);
        onPlayerLoggedIn(player);
        onClose();
        return;
      }

      if (tab === 'login') {
        const res = await loginPlayer(gamerTag, password);
        if (res.ok && res.player) {
          onPlayerLoggedIn(res.player);
          onClose();
        } else {
          setErrorMsg(res.error || 'Login failed');
        }
      } else {
        const res = await registerPlayer(gamerTag, password, selectedTeam, selectedAvatar);
        if (res.ok && res.player) {
          onPlayerLoggedIn(res.player);
          onClose();
        } else {
          setErrorMsg(res.error || 'Registration failed');
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gamer-modal-overlay" onClick={onClose}>
      <div className="gamer-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="gamer-modal-header">
          <div className="gamer-title-wrap">
            <span className="gamer-icon">🎮</span>
            <span className="gamer-title">SONICBRIDGE // PLAYER AUTH</span>
          </div>
          <button className="gamer-close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {currentProfile && (
          <div style={{ padding: '10px 16px', background: '#091017', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{currentProfile.avatar}</span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 13, color: 'var(--fg)' }}>{currentProfile.gamerTag}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)' }}>Squad {currentProfile.team} · {currentProfile.isOfflineGuest ? 'Offline Air-Gap Guest' : 'MongoDB Verified'} · {currentProfile.stats?.messagesSent || 0} msgs</div>
              </div>
            </div>
            {onLogout && (
              <button
                type="button"
                className="btn"
                style={{ fontSize: 10, padding: '4px 8px', color: '#ff3366', borderColor: '#ff3366' }}
                onClick={() => {
                  onLogout();
                  onClose();
                }}
              >
                LOGOUT
              </button>
            )}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="gamer-tabs">
          <button
            type="button"
            className={`gamer-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setErrorMsg(''); }}
          >
            LOGIN
          </button>
          <button
            type="button"
            className={`gamer-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setErrorMsg(''); }}
          >
            REGISTER (MONGO)
          </button>
          <button
            type="button"
            className={`gamer-tab ${tab === 'offline' ? 'active' : ''}`}
            onClick={() => { setTab('offline'); setErrorMsg(''); }}
          >
            OFFLINE GUEST
          </button>
        </div>

        <form onSubmit={handleSubmit} className="gamer-form">
          {errorMsg && <div className="gamer-error-banner">{errorMsg}</div>}

          {/* GamerTag Input */}
          <div className="gamer-field">
            <label className="gamer-label">GAMER TAG / PLAYER NAME</label>
            <input
              type="text"
              className="gamer-input"
              placeholder="e.g. Shadow_Ninja, Viper99"
              value={gamerTag}
              onChange={(e) => setGamerTag(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* Password Input (Login & Register only) */}
          {tab !== 'offline' && (
            <div className="gamer-field">
              <label className="gamer-label">SECRET PIN / PASSWORD</label>
              <input
                type="password"
                className="gamer-input"
                placeholder="••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          {/* Team Selection (Register & Offline only) */}
          {tab !== 'login' && (
            <div className="gamer-field">
              <label className="gamer-label">SELECT SQUAD / TEAM</label>
              <div className="team-selector-grid">
                {TEAMS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`team-pill ${selectedTeam === t.id ? 'active' : ''}`}
                    style={{
                      borderColor: selectedTeam === t.id ? t.color : 'var(--line)',
                      background: selectedTeam === t.id ? t.bg : 'transparent',
                      color: selectedTeam === t.id ? t.color : 'var(--dim)',
                    }}
                    onClick={() => setSelectedTeam(t.id)}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Avatar Selection (Register & Offline only) */}
          {tab !== 'login' && (
            <div className="gamer-field">
              <label className="gamer-label">AVATAR BADGE</label>
              <div className="avatar-picker-row">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    className={`avatar-btn ${selectedAvatar === av ? 'active' : ''}`}
                    onClick={() => setSelectedAvatar(av)}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="gamer-submit-wrap">
            <button type="submit" className="gamer-submit-btn" disabled={loading}>
              {loading
                ? 'CONNECTING…'
                : tab === 'login'
                ? 'AUTHENTICATE & ENTER ZONE'
                : tab === 'register'
                ? 'CREATE SQUAD PROFILE'
                : 'START OFFLINE SOUND CHAT'}
            </button>
          </div>
        </form>

        <div className="gamer-modal-footer">
          <span>Mode: {tab === 'offline' ? 'Air-Gapped Local Proximity' : 'Node.js + MongoDB Sync'}</span>
        </div>
      </div>
    </div>
  );
};

export default GamerAuthModal;
