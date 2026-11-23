import React, { useEffect, useState } from 'react';
import { LeaderboardData, fetchLeaderboard } from '../auth/playerSession';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetchLeaderboard();
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadLeaderboard();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalScore = data?.squads.reduce((acc, s) => acc + s.score, 0) || 1;

  return (
    <div className="leaderboard-modal-overlay" onClick={onClose}>
      <div className="leaderboard-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="leaderboard-header">
          <div className="leaderboard-title-wrap">
            <span className="leaderboard-icon">🏆</span>
            <div>
              <span className="leaderboard-title">SQUAD BATTLE RADAR // PROXIMITY LEADERBOARD</span>
              <div className="leaderboard-subtitle">Air-Gapped Sound Arena · Real-Time Domination Stats</div>
            </div>
          </div>
          <div className="leaderboard-actions">
            <button
              className="btn btn-refresh"
              onClick={() => void loadLeaderboard()}
              disabled={loading}
              title="Refresh Leaderboard"
            >
              {loading ? 'SYNCING…' : '↻ SYNC'}
            </button>
            <button className="gamer-close-btn" onClick={onClose} title="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Global Arena Metrics Bar */}
        <div className="arena-metrics-bar">
          <div className="metric-box">
            <span className="metric-label">ACOUSTIC MSGS</span>
            <span className="metric-value">{data?.totalAcousticMessages ?? 0}</span>
          </div>
          <div className="metric-box">
            <span className="metric-label">SOUND BYTES</span>
            <span className="metric-value">
              {data ? (data.totalAcousticBytes < 1024 ? `${data.totalAcousticBytes} B` : `${(data.totalAcousticBytes / 1024).toFixed(1)} KB`) : '0 B'}
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-label">COMBATANTS</span>
            <span className="metric-value">{data?.totalPlayers ?? 0}</span>
          </div>
          <div className="metric-box highlight">
            <span className="metric-label">ARENA MVP</span>
            <span className="metric-value mvp-name">
              {data?.mvpPlayer ? `${data.mvpPlayer.avatar} ${data.mvpPlayer.gamerTag}` : 'None Yet'}
            </span>
          </div>
        </div>

        <div className="leaderboard-scrollable-content">
          {/* Squad Domination Radar Cards */}
          <div className="squad-radar-section">
            <div className="section-heading">SQUAD DOMINATION RADAR</div>
            <div className="squad-cards-grid">
              {data?.squads.map((squad, idx) => {
                const percent = Math.round((squad.score / totalScore) * 100);
                return (
                  <div
                    key={squad.team}
                    className="squad-stat-card"
                    style={{ borderColor: squad.color }}
                  >
                    <div className="squad-card-top">
                      <div className="squad-rank-badge" style={{ background: squad.bg, color: squad.color }}>
                        #{idx + 1} {squad.team === 'BLUE' ? '🔵' : squad.team === 'RED' ? '🔴' : squad.team === 'NEON' ? '🟢' : '⚪'} {squad.name}
                      </div>
                      <div className="squad-score" style={{ color: squad.color }}>
                        {squad.score} PTS
                      </div>
                    </div>

                    <div className="squad-progress-wrap">
                      <div
                        className="squad-progress-fill"
                        style={{ width: `${Math.max(percent, 4)}%`, backgroundColor: squad.color }}
                      />
                    </div>

                    <div className="squad-card-stats">
                      <span>{squad.totalMessages} msgs</span>
                      <span>{(squad.totalBytes / 1024).toFixed(1)} KB</span>
                      <span>{squad.playerCount} players</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Players Roster */}
          <div className="players-roster-section">
            <div className="section-heading">TOP COMBATANTS // PROXIMITY ROSTER</div>
            {data && data.topPlayers.length > 0 ? (
              <div className="roster-table-wrap">
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th>RANK</th>
                      <th>GAMER</th>
                      <th>SQUAD</th>
                      <th>MSGS</th>
                      <th>SOUND DATA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPlayers.map((p, i) => {
                      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
                      const bytesStr = p.stats.bytesTransmitted
                        ? (p.stats.bytesTransmitted < 1024 ? `${p.stats.bytesTransmitted} B` : `${(p.stats.bytesTransmitted / 1024).toFixed(1)} KB`)
                        : `${(p.stats.messagesSent * 128)} B`;
                      return (
                        <tr key={p.gamerTag + i} className={i === 0 ? 'rank-first' : ''}>
                          <td className="rank-col">{medal}</td>
                          <td className="gamer-col">
                            <span className="roster-avatar">{p.avatar}</span>
                            <span className="roster-tag">{p.gamerTag}</span>
                          </td>
                          <td>
                            <span className={`gamer-tag-badge team-${p.team.toLowerCase()}`}>
                              {p.team}
                            </span>
                          </td>
                          <td className="num-col">{p.stats.messagesSent}</td>
                          <td className="num-col dim">{bytesStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-roster-note">
                No battle records logged yet. Be the first to beam a message over sound frequencies!
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="leaderboard-footer">
          <div className="storage-indicator">
            <span className="indicator-dot" />
            <span>
              Engine: {data?.storage === 'mongodb' ? 'MongoDB Aggregation Pipeline' : 'Offline Air-Gapped Tournament Cache'}
            </span>
          </div>
          <button className="btn" onClick={onClose}>
            [ CLOSE RADAR ]
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardModal;
