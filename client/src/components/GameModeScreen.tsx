import { useEffect, useState } from 'react'
import type { User, AIDifficulty } from '../App'
import * as rooms from '../lib/rooms'

interface Props {
  user: User
  onStartAi: (difficulty: AIDifficulty) => void
  onStartPvp: (roomId: string) => void
  onBack: () => void
}

const DIFFICULTY_INFO: Record<AIDifficulty, { label: string; desc: string; color: string; bg: string; emoji: string }> = {
  easy:   { label: '쉬움',  desc: '처음 해보는 분께 추천!',    color: '#4ADE80', bg: 'rgba(74,222,128,0.1)',   emoji: '🌱' },
  normal: { label: '보통',  desc: '어느 정도 해본 분께 추천', color: '#F5A830', bg: 'rgba(245,168,48,0.1)',   emoji: '🎮' },
  hard:   { label: '어려움', desc: '미니맥스 풀파워 — 각오해요!', color: '#E85D40', bg: 'rgba(232,93,64,0.1)', emoji: '🔥' },
}

type Mode = 'pvp' | 'ai'

export default function GameModeScreen({ user, onStartAi, onStartPvp, onBack }: Props) {
  const [mode, setMode] = useState<Mode | null>(null)
  const [difficulty, setDifficulty] = useState<AIDifficulty>('normal')
  const [roomTitle, setRoomTitle] = useState('')
  const [openRooms, setOpenRooms] = useState<rooms.OpenRoomSummary[]>([])
  const [waitingRoomId, setWaitingRoomId] = useState<string | null>(null)
  const [waitingTitle, setWaitingTitle] = useState('')
  const [joinError, setJoinError] = useState('')
  const [creating, setCreating] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)

  // 로비에 열려있는 방 목록 실시간 구독
  useEffect(() => {
    return rooms.subscribeOpenRooms(setOpenRooms)
  }, [])

  // 내가 만든 방을 지켜보다가, 누군가 들어와서 status가 'playing'이 되면 바로 게임 화면으로
  useEffect(() => {
    if (!waitingRoomId) return
    return rooms.subscribeRoom(waitingRoomId, (room) => {
      if (room?.status === 'playing') onStartPvp(waitingRoomId)
    })
  }, [waitingRoomId, onStartPvp])

  async function createRoom() {
    setCreating(true)
    setJoinError('')
    try {
      const roomId = await rooms.createRoom(roomTitle, user)
      setWaitingTitle(roomTitle.trim() || `${user.nickname}의 방`)
      setWaitingRoomId(roomId)
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : '방을 만들지 못했어요.')
    } finally {
      setCreating(false)
    }
  }

  async function joinRoom(roomId: string) {
    setJoinError('')
    setJoiningId(roomId)
    try {
      await rooms.joinRoom(roomId, user)
      onStartPvp(roomId)
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : '입장하지 못했어요.')
      setJoiningId(null)
    }
  }

  async function cancelWaiting() {
    const roomId = waitingRoomId
    setWaitingRoomId(null)
    setWaitingTitle('')
    if (roomId) await rooms.cancelRoom(roomId)
  }

  async function goBack() {
    if (waitingRoomId) await rooms.cancelRoom(waitingRoomId)
    onBack()
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #FBF4E6 0%, #EDD9B8 50%, #D4B896 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(139,90,30,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(140,90,30,0.07) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 540 }}>
        <button
          onClick={goBack}
          style={{
            background: 'none', border: 'none', color: '#8B5E3C',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20,
            padding: 0,
          }}
        >
          ← 로비로 돌아가기
        </button>

        <h1
          style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: 26, fontWeight: 900, color: '#3D2B1F', margin: '0 0 6px',
          }}
        >
          게임 모드 선택
        </h1>
        <p style={{ fontSize: 14, color: '#9A7A62', margin: '0 0 28px' }}>
          어떻게 게임을 시작할까요?
        </p>

        {/* Mode cards */}
        {!waitingRoomId && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <button
              onClick={() => setMode(mode === 'pvp' ? null : 'pvp')}
              style={{
                padding: '24px 16px',
                borderRadius: 20,
                border: mode === 'pvp' ? '2.5px solid #E85D40' : '2px solid #D4B896',
                background: mode === 'pvp' ? 'rgba(232,93,64,0.06)' : '#FFF8EC',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                boxShadow: mode === 'pvp' ? '0 8px 24px rgba(232,93,64,0.2)' : '0 4px 12px rgba(61,43,31,0.08)',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>⚔️</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#3D2B1F', marginBottom: 4 }}>
                1:1 대전
              </div>
              <div style={{ fontSize: 12, color: '#9A7A62', lineHeight: 1.5 }}>
                방을 만들거나, 열려있는 방에 들어가서 대결해요.
              </div>
              {mode === 'pvp' && (
                <div style={{ marginTop: 10, fontSize: 11, color: '#E85D40', fontWeight: 600 }}>
                  ✓ 선택됨
                </div>
              )}
            </button>

            <button
              onClick={() => setMode(mode === 'ai' ? null : 'ai')}
              style={{
                padding: '24px 16px',
                borderRadius: 20,
                border: mode === 'ai' ? '2.5px solid #8B5E3C' : '2px solid #D4B896',
                background: mode === 'ai' ? 'rgba(139,94,60,0.06)' : '#FFF8EC',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                boxShadow: mode === 'ai' ? '0 8px 24px rgba(139,94,60,0.2)' : '0 4px 12px rgba(61,43,31,0.08)',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>🤖</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#3D2B1F', marginBottom: 4 }}>
                AI 대전
              </div>
              <div style={{ fontSize: 12, color: '#9A7A62', lineHeight: 1.5 }}>
                미니맥스 AI와 대결! 난이도를 골라보세요.
              </div>
              {mode === 'ai' && (
                <div style={{ marginTop: 10, fontSize: 11, color: '#8B5E3C', fontWeight: 600 }}>
                  ✓ 선택됨
                </div>
              )}
            </button>
          </div>
        )}

        {/* PvP: create + join panel */}
        {mode === 'pvp' && !waitingRoomId && (
          <div
            style={{
              background: '#FFF8EC',
              borderRadius: 20,
              padding: '20px',
              border: '1.5px solid #D4B896',
              marginBottom: 20,
            }}
          >
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#3D2B1F' }}>
              🆕 방 만들기
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input
                type="text"
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                placeholder="방 제목 (안 적으면 자동으로 지어져요)"
                maxLength={24}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid #C9A87C', background: '#FBF4E6',
                  fontSize: 13, color: '#3D2B1F',
                }}
              />
              <button
                onClick={createRoom}
                disabled={creating}
                style={{
                  padding: '10px 18px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #E85D40, #C94C2E)',
                  color: '#FFF8EC', fontSize: 13, fontWeight: 700, cursor: creating ? 'default' : 'pointer',
                  opacity: creating ? 0.7 : 1,
                  flexShrink: 0,
                }}
              >
                {creating ? '만드는 중...' : '방 만들기'}
              </button>
            </div>

            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#3D2B1F' }}>
              🚪 입장 가능한 방 ({openRooms.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
              {openRooms.length === 0 && (
                <p style={{ fontSize: 12, color: '#9A7A62', margin: 0 }}>
                  아직 만들어진 방이 없어요. 첫 방을 만들어 보세요!
                </p>
              )}
              {openRooms.map((room) => (
                <div
                  key={room.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 12, border: '1px solid #EDE0CC', background: '#FBF4E6',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#3D2B1F' }}>{room.title}</div>
                    <div style={{ fontSize: 11, color: '#9A7A62' }}>{room.host}님이 대기 중</div>
                  </div>
                  <button
                    onClick={() => joinRoom(room.id)}
                    disabled={joiningId === room.id}
                    style={{
                      padding: '7px 14px', borderRadius: 8, border: '1.5px solid #8B5E3C',
                      background: '#FFF8EC', color: '#5C3D28', fontSize: 12, fontWeight: 700,
                      cursor: joiningId === room.id ? 'default' : 'pointer',
                      opacity: joiningId === room.id ? 0.6 : 1,
                      flexShrink: 0,
                    }}
                  >
                    {joiningId === room.id ? '입장 중...' : '입장하기'}
                  </button>
                </div>
              ))}
            </div>

            {joinError && (
              <p style={{ marginTop: 12, fontSize: 12, color: '#C0401F' }}>{joinError}</p>
            )}
          </div>
        )}

        {/* AI difficulty panel */}
        {mode === 'ai' && !waitingRoomId && (
          <div
            style={{
              background: '#FFF8EC',
              borderRadius: 20,
              padding: '20px',
              border: '1.5px solid #D4B896',
              marginBottom: 20,
            }}
          >
            <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#3D2B1F' }}>
              🧠 AI 난이도 선택
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {(Object.entries(DIFFICULTY_INFO) as [AIDifficulty, typeof DIFFICULTY_INFO[AIDifficulty]][]).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setDifficulty(key)}
                  style={{
                    padding: '14px 8px',
                    borderRadius: 14,
                    border: difficulty === key ? `2px solid ${info.color}` : '2px solid #EDE0CC',
                    background: difficulty === key ? info.bg : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{info.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: difficulty === key ? info.color : '#5C3D28' }}>
                    {info.label}
                  </div>
                  <div style={{ fontSize: 10, color: '#9A7A62', marginTop: 3, lineHeight: 1.4 }}>
                    {info.desc}
                  </div>
                </button>
              ))}
            </div>
            <div
              style={{
                marginTop: 14, padding: '10px 14px',
                borderRadius: 10, background: '#FBF4E6',
                border: '1px solid #EDE0CC', fontSize: 12, color: '#9A7A62', lineHeight: 1.6,
              }}
            >
              <strong style={{ color: '#5C3D28' }}>개발자 메모:</strong> AI는 미니맥스 알고리즘(α-β 가지치기)으로 구동됩니다.
              난이도별 탐색 깊이 — 쉬움: 2, 보통: 3, 어려움: 4.{' '}
              <code style={{ background: '#EDE0CC', padding: '1px 4px', borderRadius: 4 }}>src/lib/omokAI.ts</code> 참고.
            </div>

            <button
              onClick={() => onStartAi(difficulty)}
              style={{
                marginTop: 16,
                width: '100%',
                padding: '14px',
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #E85D40, #C94C2E)',
                color: '#FFF8EC',
                fontSize: 15, fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(232,93,64,0.35)',
              }}
            >
              🤖 AI 대전 시작 ({DIFFICULTY_INFO[difficulty].label})
            </button>
          </div>
        )}

        {/* Waiting for opponent */}
        {waitingRoomId && (
          <div
            style={{
              background: '#FFF8EC',
              borderRadius: 20,
              padding: '40px 24px',
              border: '1.5px solid #D4B896',
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #E85D40, #F5A830)',
                    animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#3D2B1F', margin: '0 0 6px' }}>
              "{waitingTitle}" 방에서 상대를 기다리는 중...
            </p>
            <p style={{ fontSize: 13, color: '#9A7A62', margin: '0 0 20px' }}>
              다른 사용자가 로비에서 이 방을 선택하면 바로 시작돼요
            </p>
            <button
              onClick={cancelWaiting}
              style={{
                padding: '10px 20px', borderRadius: 10, border: '1.5px solid #C9A87C',
                background: 'transparent', color: '#5C3D28', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              방 만들기 취소
            </button>
          </div>
        )}

        {!mode && !waitingRoomId && (
          <button
            disabled
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: 14,
              border: 'none',
              background: '#D4B896',
              color: '#9A7A62',
              fontSize: 16, fontWeight: 700,
              cursor: 'not-allowed',
            }}
          >
            게임 모드를 선택해 주세요
          </button>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}
