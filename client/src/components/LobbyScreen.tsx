import { useEffect, useState } from 'react'
import type { User } from '../App'
import RankingTab from './RankingTab'
import { CharacterAvatar } from '../lib/characters'
import { subscribeOnlineUsers, type OnlineUser } from '../lib/presence'
import { subscribeActiveRooms, type ActiveRoomSummary } from '../lib/rooms'

interface Props {
  user: User
  onStartGame: () => void
  onLogout: () => void
}

type Tab = 'lobby' | 'ranking'

export default function LobbyScreen({ user, onStartGame, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('lobby')
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [activeRooms, setActiveRooms] = useState<ActiveRoomSummary[]>([])

  useEffect(() => {
    const unsubUsers = subscribeOnlineUsers(setOnlineUsers)
    const unsubRooms = subscribeActiveRooms(setActiveRooms)
    return () => {
      unsubUsers()
      unsubRooms()
    }
  }, [])

  const winRate = user.wins + user.losses === 0 ? 0 : Math.round((user.wins / (user.wins + user.losses)) * 100)

  return (
    <div style={{ minHeight: '100vh', background: '#FBF4E6', fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* Header */}
      <header
        style={{
          background: 'linear-gradient(135deg, #8B5E3C, #6B4530)',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 12px rgba(61,43,31,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>⚫</span>
          <span style={{ fontFamily: "'Noto Serif KR', serif", fontSize: 20, fontWeight: 900, color: '#FFF8EC' }}>
            오목왕
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 6px #4ADE80' }} />
            <span style={{ color: '#FFF8EC', fontSize: 14, fontWeight: 500 }}>{user.nickname}</span>
          </div>
          <button
            onClick={onLogout}
            style={{
              padding: '6px 14px', borderRadius: 8,
              border: '1px solid rgba(255,248,236,0.3)',
              background: 'transparent', color: 'rgba(255,248,236,0.7)',
              fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,248,236,0.15)'; e.currentTarget.style.color = '#FFF8EC' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,248,236,0.7)' }}
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div
        style={{
          background: '#FFF8EC',
          borderBottom: '1px solid #E0CCB0',
          display: 'flex',
          padding: '0 24px',
          gap: 0,
        }}
      >
        {([['lobby', '🏠 대기실'], ['ranking', '🏆 랭킹']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '14px 20px',
              border: 'none',
              background: 'transparent',
              fontSize: 14,
              fontWeight: tab === key ? 700 : 500,
              color: tab === key ? '#E85D40' : '#9A7A62',
              borderBottom: tab === key ? '2.5px solid #E85D40' : '2.5px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '28px 24px',
          display: 'grid',
          gridTemplateColumns: tab === 'ranking' ? '1fr' : '1fr 260px',
          gap: 24,
        }}
      >
        {/* ── LOBBY TAB ── */}
        {tab === 'lobby' && (
          <>
            <div>
              {/* Start game CTA */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #8B5E3C, #C9A87C)',
                  borderRadius: 20,
                  padding: '24px 28px',
                  marginBottom: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 6px 20px rgba(139,94,60,0.25)',
                }}
              >
                <div>
                  <h2 style={{ fontFamily: "'Noto Serif KR', serif", fontSize: 20, fontWeight: 900, color: '#FFF8EC', margin: '0 0 4px' }}>
                    지금 바로 시작해보세요!
                  </h2>
                  <p style={{ fontSize: 13, color: 'rgba(255,248,236,0.8)', margin: 0 }}>
                    친구와 1:1 대전 또는 AI와 연습 대전
                  </p>
                </div>
                <button
                  onClick={onStartGame}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 14,
                    border: 'none',
                    background: 'linear-gradient(135deg, #E85D40, #C94C2E)',
                    color: '#FFF8EC',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(232,93,64,0.4)',
                    transition: 'transform 0.15s',
                    flexShrink: 0,
                    fontFamily: "'Noto Sans KR', sans-serif",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  🎮 게임 시작
                </button>
              </div>

              {/* Active games */}
              <div style={{ marginBottom: 8 }}>
                <h3 style={{ fontFamily: "'Noto Serif KR', serif", fontSize: 17, fontWeight: 700, color: '#3D2B1F', margin: '0 0 14px' }}>
                  진행 중인 게임 {activeRooms.length > 0 && `(${activeRooms.length})`}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeRooms.length === 0 && (
                    <p style={{ fontSize: 13, color: '#9A7A62', margin: 0 }}>지금은 진행 중인 1:1 대국이 없어요.</p>
                  )}
                  {activeRooms.map((room) => (
                    <div
                      key={room.id}
                      style={{
                        background: '#FFF8EC',
                        borderRadius: 14,
                        padding: '14px 18px',
                        border: '1.5px solid #E0CCB0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 20 }}>⚫</span>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#3D2B1F' }}>
                            {room.host} vs {room.guest}
                          </p>
                          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9A7A62' }}>
                            {room.title} · {room.moveCount}수
                          </p>
                        </div>
                      </div>
                      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(245,168,48,0.15)', color: '#A16207' }}>
                        게임중
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: online users */}
            <div>
              <div
                style={{
                  background: '#FFF8EC',
                  borderRadius: 16,
                  padding: '20px',
                  border: '1.5px solid #D4B896',
                  position: 'sticky',
                  top: 24,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 6px #4ADE80' }} />
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#3D2B1F' }}>
                    온라인 {onlineUsers.length}명
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {onlineUsers.map((u) => {
                    const isMe = u.userId === user.id
                    return (
                      <div
                        key={u.userId}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px', borderRadius: 10,
                          background: isMe ? 'rgba(232,93,64,0.07)' : 'transparent',
                          border: isMe ? '1px solid rgba(232,93,64,0.2)' : '1px solid transparent',
                        }}
                      >
                        <CharacterAvatar character={u.character} photoUrl={u.photoUrl} size={30} />
                        <span style={{ flex: 1, fontSize: 13, color: isMe ? '#E85D40' : '#3D2B1F', fontWeight: isMe ? 600 : 400 }}>
                          {u.nickname}{isMe && ' (나)'}
                        </span>
                        <span style={{ fontSize: 10, color: '#16A34A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
                          온라인
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #EDE0CC' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#5C3D28' }}>내 전적</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                    {[['승', user.wins, '#E85D40'], ['패', user.losses, '#9A7A62'], ['승률', `${winRate}%`, '#C9A87C']].map(([label, value, color]) => (
                      <div key={label as string} style={{ background: '#FBF4E6', borderRadius: 8, padding: '8px 4px' }}>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: color as string }}>{value}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9A7A62' }}>{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── RANKING TAB ── */}
        {tab === 'ranking' && (
          <div
            style={{
              background: '#FFF8EC',
              borderRadius: 20,
              padding: '28px 24px',
              border: '1.5px solid #D4B896',
            }}
          >
            <RankingTab user={user} />
          </div>
        )}
      </div>
    </div>
  )
}
