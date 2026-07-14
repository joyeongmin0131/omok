import { useEffect, useState } from 'react'
import type { User } from '../App'
import RankingTab from './RankingTab'
import { CharacterAvatar } from '../lib/characters'
import { subscribeOnlineUsers, type OnlineUser } from '../lib/presence'
import {
  subscribeActiveRooms, type ActiveRoomSummary, subscribeRoom, cancelRoom,
  subscribeOpenRooms, type OpenRoomSummary, adminDeleteRoom,
} from '../lib/rooms'
import {
  sendInvite, cancelInvite, acceptInvite, declineInvite,
  subscribeIncomingInvites, subscribeInvite, type IncomingInvite,
} from '../lib/invites'
import { isAdmin } from '../lib/admin'

interface Props {
  user: User
  onStartGame: () => void
  onLogout: () => void
  onEditProfile: () => void
  onStartPvp: (roomId: string) => void
  onSpectate: (roomId: string) => void
}

type Tab = 'lobby' | 'ranking'

export default function LobbyScreen({ user, onStartGame, onLogout, onEditProfile, onStartPvp, onSpectate }: Props) {
  const [tab, setTab] = useState<Tab>('lobby')
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [activeRooms, setActiveRooms] = useState<ActiveRoomSummary[]>([])
  const [openRooms, setOpenRooms] = useState<OpenRoomSummary[]>([])

  const [outgoingInvite, setOutgoingInvite] = useState<{ inviteId: string; roomId: string; toNickname: string } | null>(null)
  const [incomingInvite, setIncomingInvite] = useState<IncomingInvite | null>(null)
  const [inviteError, setInviteError] = useState('')
  const [adminError, setAdminError] = useState('')

  const admin = isAdmin(user.email)

  useEffect(() => {
    const unsubUsers = subscribeOnlineUsers(setOnlineUsers)
    const unsubRooms = subscribeActiveRooms(setActiveRooms)
    const unsubOpenRooms = subscribeOpenRooms(setOpenRooms)
    return () => {
      unsubUsers()
      unsubRooms()
      unsubOpenRooms()
    }
  }, [])

  async function handleAdminStop(roomId: string) {
    if (!window.confirm('이 게임을 강제로 종료할까요? 종료하면 아무도 관전할 수 없어요.')) return
    setAdminError('')
    try {
      await adminDeleteRoom(roomId)
    } catch (err) {
      setAdminError(
        err instanceof Error
          ? `게임을 중단하지 못했어요: ${err.message} (firestore.rules를 재배포했는지 확인해 주세요)`
          : '게임을 중단하지 못했어요.',
      )
    }
  }

  async function handleAdminDeleteWaiting(roomId: string) {
    if (!window.confirm('이 대기방을 삭제할까요?')) return
    setAdminError('')
    try {
      await adminDeleteRoom(roomId)
    } catch (err) {
      setAdminError(
        err instanceof Error
          ? `방을 삭제하지 못했어요: ${err.message} (firestore.rules를 재배포했는지 확인해 주세요)`
          : '방을 삭제하지 못했어요.',
      )
    }
  }

  // 나에게 온 1:1 초대를 항상 지켜본다
  useEffect(() => {
    return subscribeIncomingInvites(user.id, setIncomingInvite)
  }, [user.id])

  // 내가 보낸 초대: 상대가 입장하면(방이 playing으로 바뀌면) 바로 게임 화면으로,
  // 상대가 거절하면 방을 정리하고 안내 메시지를 띄운다.
  // 5초 안에 아무 응답이 없어도 마찬가지로 초대를 취소하고 방을 지운다.
  useEffect(() => {
    if (!outgoingInvite) return
    const { inviteId, roomId, toNickname } = outgoingInvite

    const unsubRoom = subscribeRoom(roomId, (room) => {
      if (room?.status === 'playing') onStartPvp(roomId)
    })
    const unsubInvite = subscribeInvite(inviteId, (invite) => {
      if (invite?.status === 'declined') {
        setInviteError(`${toNickname}님이 초대를 거절했어요.`)
        cancelRoom(roomId).catch(() => {})
        setOutgoingInvite(null)
      }
    })
    const timeoutId = setTimeout(() => {
      setInviteError(`${toNickname}님이 응답하지 않았어요.`)
      cancelInvite(inviteId, roomId).catch(() => {})
      setOutgoingInvite(null)
    }, 5000)

    return () => {
      unsubRoom()
      unsubInvite()
      clearTimeout(timeoutId)
    }
  }, [outgoingInvite, onStartPvp])

  // 지금 대국 중인 사람 ID 목록 — 이 사람들에게는 초대를 보낼 수 없다
  const busyUserIds = new Set(activeRooms.flatMap((r) => [r.hostId, r.guestId]))

  async function handleInviteClick(target: OnlineUser) {
    if (outgoingInvite || target.userId === user.id || busyUserIds.has(target.userId)) return
    setInviteError('')
    try {
      const { inviteId, roomId } = await sendInvite(user, target.userId)
      setOutgoingInvite({ inviteId, roomId, toNickname: target.nickname })
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : '초대를 보내지 못했어요.')
    }
  }

  async function handleCancelOutgoing() {
    if (!outgoingInvite) return
    const { inviteId, roomId } = outgoingInvite
    setOutgoingInvite(null)
    await cancelInvite(inviteId, roomId)
  }

  async function handleAcceptIncoming() {
    if (!incomingInvite) return
    const invite = incomingInvite
    setIncomingInvite(null)
    try {
      await acceptInvite(invite, user)
      onStartPvp(invite.roomId)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : '입장하지 못했어요.')
    }
  }

  async function handleDeclineIncoming() {
    if (!incomingInvite) return
    const inviteId = incomingInvite.id
    setIncomingInvite(null)
    await declineInvite(inviteId)
  }

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
            onClick={onEditProfile}
            style={{
              padding: '6px 14px', borderRadius: 8,
              border: '1px solid rgba(255,248,236,0.3)',
              background: 'transparent', color: 'rgba(255,248,236,0.7)',
              fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,248,236,0.15)'; e.currentTarget.style.color = '#FFF8EC' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,248,236,0.7)' }}
          >
            ✏️ 프로필 수정
          </button>
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
                {admin && adminError && (
                  <p style={{ fontSize: 12, color: '#C0401F', margin: '0 0 10px', background: 'rgba(232,93,64,0.08)', padding: '8px 12px', borderRadius: 8 }}>
                    {adminError}
                  </p>
                )}
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
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
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
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {admin && (
                          <button
                            onClick={() => handleAdminStop(room.id)}
                            style={{
                              padding: '6px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                              background: 'rgba(232,93,64,0.12)', color: '#C0401F', border: '1px solid rgba(232,93,64,0.3)', cursor: 'pointer',
                              fontFamily: "'Noto Sans KR', sans-serif",
                            }}
                          >
                            🛑 중단
                          </button>
                        )}
                        <button
                          onClick={() => onSpectate(room.id)}
                          style={{
                            padding: '6px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: 'rgba(245,168,48,0.15)', color: '#A16207', border: 'none', cursor: 'pointer',
                            fontFamily: "'Noto Sans KR', sans-serif",
                          }}
                        >
                          👀 관전하기
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 관리자 전용: 대기 중인 방 */}
              {admin && (
                <div style={{ marginTop: 24 }}>
                  <h3 style={{ fontFamily: "'Noto Serif KR', serif", fontSize: 17, fontWeight: 700, color: '#3D2B1F', margin: '0 0 14px' }}>
                    🛡️ 대기 중인 방 (관리자) {openRooms.length > 0 && `(${openRooms.length})`}
                  </h3>
                  {adminError && (
                    <p style={{ fontSize: 12, color: '#C0401F', margin: '0 0 10px', background: 'rgba(232,93,64,0.08)', padding: '8px 12px', borderRadius: 8 }}>
                      {adminError}
                    </p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {openRooms.length === 0 && (
                      <p style={{ fontSize: 13, color: '#9A7A62', margin: 0 }}>대기 중인 방이 없어요.</p>
                    )}
                    {openRooms.map((room) => (
                      <div
                        key={room.id}
                        style={{
                          background: '#FFF8EC', borderRadius: 14, padding: '12px 18px', border: '1.5px solid #E0CCB0',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#3D2B1F' }}>{room.title}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9A7A62' }}>{room.host}님이 대기 중</p>
                        </div>
                        <button
                          onClick={() => handleAdminDeleteWaiting(room.id)}
                          style={{
                            padding: '6px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            background: 'rgba(232,93,64,0.12)', color: '#C0401F', border: '1px solid rgba(232,93,64,0.3)', cursor: 'pointer',
                            flexShrink: 0, fontFamily: "'Noto Sans KR', sans-serif",
                          }}
                        >
                          🗑 삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 6px #4ADE80' }} />
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#3D2B1F' }}>
                    온라인 {onlineUsers.length}명
                  </h3>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: 11, color: '#9A7A62' }}>초대 버튼을 누르면 1:1 대전을 신청해요</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {onlineUsers.map((u) => {
                    const isMe = u.userId === user.id
                    const isBusy = busyUserIds.has(u.userId)
                    const inviteDisabled = isMe || isBusy || !!outgoingInvite
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
                        {isMe ? null : isBusy ? (
                          <span style={{ fontSize: 10, color: '#A16207', fontWeight: 600, padding: '4px 10px' }}>게임중</span>
                        ) : (
                          <button
                            onClick={() => handleInviteClick(u)}
                            disabled={inviteDisabled}
                            style={{
                              fontSize: 11, fontWeight: 700, color: inviteDisabled ? '#B09878' : '#FFF8EC',
                              background: inviteDisabled ? '#EDE0CC' : 'linear-gradient(135deg, #E85D40, #C94C2E)',
                              border: 'none', borderRadius: 8, padding: '6px 12px',
                              cursor: inviteDisabled ? 'default' : 'pointer', flexShrink: 0,
                              fontFamily: "'Noto Sans KR', sans-serif",
                            }}
                          >
                            ⚔️ 초대
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {inviteError && (
                  <p style={{ marginTop: 10, fontSize: 12, color: '#C0401F' }}>{inviteError}</p>
                )}

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

      {/* 내가 보낸 초대: 응답 기다리는 중 */}
      {outgoingInvite && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(61,43,31,0.55)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 100, padding: 24,
        }}>
          <div style={{
            background: '#FFF8EC', borderRadius: 24, padding: '36px 32px',
            width: '100%', maxWidth: 360, textAlign: 'center',
            boxShadow: '0 24px 64px rgba(61,43,31,0.3)', border: '1px solid rgba(201,168,124,0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #E85D40, #F5A830)',
                  animation: `lobbyBounce 0.8s ease-in-out ${i * 0.15}s infinite`,
                }} />
              ))}
            </div>
            <h3 style={{ fontFamily: "'Noto Serif KR',serif", fontSize: 18, fontWeight: 900, color: '#3D2B1F', margin: '0 0 8px' }}>
              {outgoingInvite.toNickname}님에게 초대를 보냈어요
            </h3>
            <p style={{ fontSize: 13, color: '#9A7A62', margin: '0 0 20px' }}>수락하면 바로 대전이 시작돼요</p>
            <button
              onClick={handleCancelOutgoing}
              style={{
                padding: '10px 20px', borderRadius: 10, border: '1.5px solid #C9A87C',
                background: 'transparent', color: '#5C3D28', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              초대 취소
            </button>
          </div>
        </div>
      )}

      {/* 나에게 온 초대: 수락/거절 */}
      {incomingInvite && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(61,43,31,0.55)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 100, padding: 24,
        }}>
          <div style={{
            background: '#FFF8EC', borderRadius: 24, padding: '36px 32px',
            width: '100%', maxWidth: 360, textAlign: 'center',
            boxShadow: '0 24px 64px rgba(61,43,31,0.3)', border: '1px solid rgba(201,168,124,0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <CharacterAvatar character={incomingInvite.fromCharacter} photoUrl={incomingInvite.fromPhotoUrl} size={64} />
            </div>
            <h3 style={{ fontFamily: "'Noto Serif KR',serif", fontSize: 18, fontWeight: 900, color: '#3D2B1F', margin: '0 0 6px' }}>
              ⚔️ 대전 신청
            </h3>
            <p style={{ color: '#5C3D28', fontSize: 15, margin: '0 0 24px' }}>
              <strong>{incomingInvite.fromNickname}</strong>님이 1:1 대전을 신청했어요
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleDeclineIncoming}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: '#EDE0CC', color: '#5C3D28', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                거절
              </button>
              <button
                onClick={handleAcceptIncoming}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#E85D40,#C94C2E)', color: '#FFF8EC', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                수락
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes lobbyBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}
