import { useState, useCallback, useEffect, useRef } from 'react'
import type { User, GameMode, AIDifficulty } from '../App'
import { createBoard, checkWin, getWinLine, getAiMove, type Cell } from '../lib/omokAI'
import { CharacterAvatar, type CharacterAnimState, type CharacterId } from '../lib/characters'
import * as roomsApi from '../lib/rooms'
import type { RoomState } from '../lib/rooms'
import { getUserProfile } from '../lib/api'

interface Props {
  user: User
  gameMode: GameMode
  aiDifficulty: AIDifficulty
  pvpRoomId: string | null
  onLeave: () => void
  onUserUpdate: (patch: Partial<User>) => void
}

type ModalType = 'none' | 'undo_incoming' | 'undo_waiting' | 'resign_confirm' | 'result'

const SIZE = 15
const CELL = 36
const PAD = 28
const TURN_SECONDS = roomsApi.TURN_SECONDS

const AI_OPPONENT: Record<AIDifficulty, { nickname: string; character: CharacterId }> = {
  easy:   { nickname: 'AI 쉬움',   character: 'rabbit' },
  normal: { nickname: 'AI 보통',   character: 'fox' },
  hard:   { nickname: 'AI 어려움', character: 'bear' },
}

function TimerRing({ seconds, active }: { seconds: number; active: boolean }) {
  const r = 22, circ = 2 * Math.PI * r
  const progress = seconds / TURN_SECONDS
  const color = seconds <= 10 ? '#E85D40' : seconds <= 20 ? '#F5A830' : '#4ADE80'
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#EDE0CC" strokeWidth="4" />
      {active && (
        <circle
          cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${circ * progress} ${circ}`}
          strokeLinecap="round" transform="rotate(-90 28 28)"
          style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.3s' }}
        />
      )}
      <text x="28" y="33" textAnchor="middle" fontSize="13" fontWeight="700"
        fill={active ? color : '#C9A87C'} fontFamily="'Noto Sans KR', sans-serif">
        {active ? seconds : '—'}
      </text>
    </svg>
  )
}

function PlayerBar({
  nickname, character, photoUrl, color, isMyTurn, timerSeconds, animState, isTop,
}: {
  nickname: string; character: string; photoUrl: string | null; color: Cell
  isMyTurn: boolean; timerSeconds: number; animState: CharacterAnimState; isTop?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '10px 20px',
        background: isMyTurn ? 'rgba(232,93,64,0.07)' : 'transparent',
        borderRadius: 16, transition: 'all 0.3s',
        border: isMyTurn ? '1.5px solid rgba(232,93,64,0.25)' : '1.5px solid transparent',
        flexDirection: isTop ? 'row' : 'row-reverse',
      }}
    >
      <div
        style={{
          width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: isMyTurn ? '2px solid #E85D40' : '2px solid transparent',
          boxShadow: isMyTurn ? '0 0 0 3px rgba(232,93,64,0.2)' : 'none',
          transition: 'all 0.3s',
        }}
      >
        <CharacterAvatar character={character} photoUrl={photoUrl} animState={animState} size={48} />
      </div>
      <div style={{ flex: 1, textAlign: isTop ? 'left' : 'right' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: isTop ? 'flex-start' : 'flex-end' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#3D2B1F' }}>{nickname}</span>
          <div
            style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
              background: color === 'black'
                ? 'radial-gradient(circle at 35% 35%, #555, #1A1A1A)'
                : 'radial-gradient(circle at 35% 35%, #FFF8EC, #CCC0A8)',
              border: color === 'white' ? '1px solid #B0926A' : 'none',
              boxShadow: '1px 2px 4px rgba(0,0,0,0.3)',
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: '#9A7A62', marginTop: 2 }}>
          {color === 'black' ? '흑돌' : '백돌'} · {isMyTurn ? '⏰ 내 차례' : '대기 중'}
        </div>
      </div>
      <TimerRing seconds={timerSeconds} active={isMyTurn} />
    </div>
  )
}

function ModalOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(61,43,31,0.55)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 100, padding: 24,
    }}>
      <div style={{
        background: '#FFF8EC', borderRadius: 24, padding: '36px 32px',
        width: '100%', maxWidth: 360,
        boxShadow: '0 24px 64px rgba(61,43,31,0.3)',
        border: '1px solid rgba(201,168,124,0.4)',
        animation: 'fadeIn 0.2s ease-out',
      }}>
        {children}
      </div>
    </div>
  )
}

function ModalBtn({ label, variant, onClick }: { label: string; variant: 'primary' | 'secondary' | 'danger'; onClick: () => void }) {
  const s = {
    primary:   { background: 'linear-gradient(135deg,#E85D40,#C94C2E)', color: '#FFF8EC', border: 'none', boxShadow: '0 4px 12px rgba(232,93,64,0.35)' },
    secondary: { background: '#EDE0CC', color: '#5C3D28', border: 'none' },
    danger:    { background: '#3D2B1F', color: '#FFF8EC', border: 'none' },
  }[variant]
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '13px 0', borderRadius: 12,
      fontSize: 15, fontWeight: 700, cursor: 'pointer',
      fontFamily: "'Noto Sans KR', sans-serif", transition: 'transform 0.15s', ...s,
    }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
    >{label}</button>
  )
}

export default function GameScreen({ user, gameMode, aiDifficulty, pvpRoomId, onLeave, onUserUpdate }: Props) {
  const isPvp = gameMode === 'pvp'

  const [board, setBoard] = useState<Cell[][]>(() => createBoard())
  const [turn, setTurn] = useState<Cell>('black')
  const [winner, setWinner] = useState<Cell | 'resign' | null>(null)
  const [winLine, setWinLine] = useState<[number, number][]>([])
  const [hover, setHover] = useState<[number, number] | null>(null)
  const [lastMove, setLastMove] = useState<[number, number] | null>(null)
  const [history, setHistory] = useState<{ board: Cell[][]; last: [number, number] | null }[]>([]) // AI 모드 전용
  const [modal, setModal] = useState<ModalType>('none')
  const [aiTimerSec, setAiTimerSec] = useState(TURN_SECONDS)
  const [resultWin, setResultWin] = useState(false)
  const [moveCount, setMoveCount] = useState(0)
  const [room, setRoom] = useState<RoomState | null>(null) // PVP 전용 — Firestore 실시간 상태
  const [nowTick, setNowTick] = useState(Date.now())
  const aiThinking = useRef(false)

  const myColor: Cell = !isPvp ? 'black' : room && room.host.id === user.id ? 'black' : 'white'
  const opColor: Cell = myColor === 'black' ? 'white' : 'black'
  const opponent = isPvp
    ? room
      ? (myColor === 'black' ? room.guest : room.host) ?? { id: '', nickname: '상대방', character: 'bear', photoUrl: null }
      : { id: '', nickname: '상대방', character: 'bear', photoUrl: null }
    : { nickname: AI_OPPONENT[aiDifficulty].nickname, character: AI_OPPONENT[aiDifficulty].character as string, photoUrl: null as string | null }

  const isMyTurn = turn === myColor && !winner && modal === 'none'

  // 이긴 쪽은 'win', 진 쪽은 'lose', 진행 중이면 'idle' — 캐릭터 애니메이션에 사용
  function animStateFor(color: Cell): CharacterAnimState {
    if (!winner) return 'idle'
    if (winner === 'resign') return color === myColor ? 'lose' : 'win'
    return winner === color ? 'win' : 'lose'
  }

  // ── 1:1 대전: 방 문서(Firestore)를 실시간 구독해서 보드/턴/무르기 요청/승패를 그대로 반영 ──
  useEffect(() => {
    if (!isPvp || !pvpRoomId) return
    return roomsApi.subscribeRoom(pvpRoomId, (r) => {
      setRoom(r)
      if (!r) return
      setBoard(r.board)
      setTurn(r.turn)
      setLastMove(r.lastMove)
      setMoveCount(r.moveCount)

      const mine: Cell = r.host.id === user.id ? 'black' : 'white'

      if (r.winner) {
        setWinner(r.winner)
        setWinLine(r.winLine)
        setResultWin(r.winner === mine)
        setModal('result')
        // 내 승/패 수가 바뀌었으니 최신 값을 다시 읽어와 앱 전체 상태(로비/랭킹)에 반영
        getUserProfile(user.id).then((u) => u && onUserUpdate({ wins: u.wins, losses: u.losses }))
      } else if (r.undoRequestBy === mine) {
        setModal('undo_waiting')
      } else if (r.undoRequestBy) {
        setModal('undo_incoming')
      } else {
        setModal((m) => (m === 'undo_incoming' || m === 'undo_waiting' ? 'none' : m))
      }
    })
  }, [isPvp, pvpRoomId, user.id, onUserUpdate])

  // AI 대전 타이머 (기존 로직 그대로)
  useEffect(() => {
    if (isPvp) return
    if (winner || modal !== 'none') return
    setAiTimerSec(TURN_SECONDS)
    const id = setInterval(() => {
      setAiTimerSec((s) => {
        if (s <= 1) {
          clearInterval(id)
          if (turn === myColor) { setWinner('resign'); setResultWin(false); setModal('result') }
          else { setWinner(myColor); setResultWin(true); setModal('result') }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isPvp, turn, winner, modal, myColor])

  // 1:1 대전 타이머 — 서버(Firestore)에 저장된 turnStartedAt을 기준으로 계산한다.
  // 시간이 다 되면(상대가 연결을 끊은 경우 포함) 누구든 먼저 알아챈 클라이언트가 기권 처리를 요청한다.
  useEffect(() => {
    if (!isPvp) return
    const id = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [isPvp])

  const pvpTimerSec = room?.turnStartedAt
    ? Math.max(0, TURN_SECONDS - Math.floor((nowTick - room.turnStartedAt) / 1000))
    : TURN_SECONDS

  useEffect(() => {
    if (!isPvp || !pvpRoomId || !room || room.status !== 'playing' || pvpTimerSec > 0) return
    roomsApi.forceTimeoutResign(pvpRoomId).catch(() => {})
  }, [isPvp, pvpRoomId, room, pvpTimerSec])

  const timerSec = isPvp ? pvpTimerSec : aiTimerSec

  const placeStone = useCallback(async (row: number, col: number) => {
    if (!isMyTurn || board[row][col] || aiThinking.current) return

    if (isPvp) {
      if (pvpRoomId) roomsApi.placeStone(pvpRoomId, myColor, row, col).catch(() => {})
      return
    }

    // ── AI 대전: 클라이언트에서 바로 미니맥스를 돌려 다음 수를 계산 ──
    const snap = board.map((r) => [...r])
    const next = board.map((r) => [...r])
    next[row][col] = myColor
    setBoard(next)
    setLastMove([row, col])
    setMoveCount((n) => n + 1)
    setHistory((h) => [...h, { board: snap, last: lastMove }])

    if (checkWin(next, row, col, myColor)) {
      setWinner(myColor)
      setWinLine(getWinLine(next, row, col, myColor))
      setTimeout(() => { setResultWin(true); setModal('result') }, 600)
      return
    }

    setTurn('white')
    aiThinking.current = true

    const delay = 400 + Math.random() * 400

    setTimeout(async () => {
      try {
        const [ar, ac] = await getAiMove(next, opColor, aiDifficulty)
        const after = next.map((r) => [...r])
        after[ar][ac] = opColor
        setBoard(after)
        setLastMove([ar, ac])
        setMoveCount((n) => n + 1)

        if (checkWin(after, ar, ac, opColor)) {
          setWinner(opColor)
          setWinLine(getWinLine(after, ar, ac, opColor))
          setTimeout(() => { setResultWin(false); setModal('result') }, 600)
          return
        }
        setTurn('black')
      } finally {
        aiThinking.current = false
      }
    }, delay)
  }, [board, isMyTurn, myColor, opColor, lastMove, aiDifficulty, isPvp, pvpRoomId])

  function handleReset() {
    setBoard(createBoard())
    setTurn('black')
    setWinner(null)
    setWinLine([])
    setLastMove(null)
    setHistory([])
    setModal('none')
    setMoveCount(0)
    aiThinking.current = false
  }

  function handleUndoRequest() {
    if (moveCount < 1 || turn !== myColor || !!winner || modal !== 'none') return
    if (isPvp) {
      if (pvpRoomId) roomsApi.requestUndo(pvpRoomId, myColor).catch(() => {})
      return // 모달 상태는 room.undoRequestBy 구독으로 자동 반영됨
    }
    setModal('undo_waiting')
    setTimeout(() => {
      if (Math.random() < 0.6) applyUndo()
      setModal('none')
    }, 2000)
  }

  function respondUndo(accept: boolean) {
    if (isPvp) {
      if (pvpRoomId) roomsApi.respondUndo(pvpRoomId, accept).catch(() => {})
      return
    }
    if (accept) applyUndo()
    setModal('none')
  }

  function applyUndo() {
    if (history.length < 1) return
    const prev = history[history.length - 1]
    setBoard(prev.board)
    setLastMove(prev.last)
    setHistory((h) => h.slice(0, -1))
    setTurn('black')
    setMoveCount((n) => Math.max(0, n - 2))
  }

  function handleResignConfirm() {
    if (isPvp) {
      if (pvpRoomId) roomsApi.resign(pvpRoomId, myColor).catch(() => {})
      setModal('none')
      return
    }
    setWinner('resign')
    setResultWin(false)
    setModal('result')
  }

  const isWinCell = (r: number, c: number) => winLine.some(([wr, wc]) => wr === r && wc === c)
  const boardPx = CELL * (SIZE - 1) + PAD * 2

  if (isPvp && !room) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5EDD8', fontFamily: "'Noto Sans KR', sans-serif" }}>
        <p style={{ color: '#5C3D28', fontSize: 15 }}>게임을 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5EDD8', display: 'flex', flexDirection: 'column', fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* Top player bar */}
      <div style={{ background: 'rgba(255,248,236,0.9)', borderBottom: '1px solid #E0CCB0', padding: '0 24px', flexShrink: 0 }}>
        <PlayerBar
          nickname={opponent.nickname} character={opponent.character} photoUrl={opponent.photoUrl}
          color={opColor} isMyTurn={turn === opColor && !winner} timerSeconds={timerSec}
          animState={animStateFor(opColor)} isTop
        />
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 20px', gap: 24 }}>

        {/* Board */}
        <div>
          <div style={{ textAlign: 'center', marginBottom: 10, fontSize: 13, fontWeight: 600, color: '#5C3D28', height: 20 }}>
            {!winner && (turn === myColor
              ? aiThinking.current ? '' : '🖱️ 돌을 놓을 위치를 클릭하세요'
              : `💭 ${opponent.nickname}${gameMode === 'ai' ? ' (AI)' : ''}이 생각 중...`
            )}
          </div>

          <div
            style={{
              width: boardPx, height: boardPx, position: 'relative',
              background:
                'repeating-linear-gradient(90deg,rgba(140,90,30,0.07) 0,rgba(140,90,30,0.07) 1px,transparent 1px,transparent 36px),' +
                'repeating-linear-gradient(rgba(140,90,30,0.07) 0,rgba(140,90,30,0.07) 1px,transparent 1px,transparent 36px),' +
                'linear-gradient(160deg,#D4A055 0%,#C08A40 25%,#B87A35 50%,#C89048 75%,#D4A055 100%)',
              borderRadius: 8, cursor: isMyTurn ? 'crosshair' : 'default', userSelect: 'none',
              boxShadow: '0 12px 40px rgba(61,43,31,0.35),0 4px 12px rgba(61,43,31,0.2),inset 0 1px 0 rgba(255,210,140,0.4)',
              border: '3px solid #8B5E3C',
            }}
            onMouseLeave={() => setHover(null)}
          >
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width={boardPx} height={boardPx}>
              {Array.from({ length: SIZE }, (_, i) => (
                <g key={i}>
                  <line x1={PAD + i * CELL} y1={PAD} x2={PAD + i * CELL} y2={PAD + (SIZE - 1) * CELL}
                    stroke="rgba(80,45,15,0.55)" strokeWidth={i === 0 || i === SIZE - 1 ? 1.5 : 1} />
                  <line x1={PAD} y1={PAD + i * CELL} x2={PAD + (SIZE - 1) * CELL} y2={PAD + i * CELL}
                    stroke="rgba(80,45,15,0.55)" strokeWidth={i === 0 || i === SIZE - 1 ? 1.5 : 1} />
                </g>
              ))}
              {[[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]].map(([r, c]) => (
                <circle key={`${r}-${c}`} cx={PAD + c * CELL} cy={PAD + r * CELL} r={4.5} fill="rgba(75,40,12,0.55)" />
              ))}
              {Array.from({ length: SIZE }, (_, i) => (
                <g key={`coord-${i}`}>
                  <text x={PAD + i * CELL} y={PAD - 10} textAnchor="middle" fontSize="9" fill="rgba(80,45,15,0.5)" fontFamily="'Noto Sans KR',sans-serif">
                    {String.fromCharCode(65 + i)}
                  </text>
                  <text x={PAD - 12} y={PAD + i * CELL + 4} textAnchor="middle" fontSize="9" fill="rgba(80,45,15,0.5)" fontFamily="'Noto Sans KR',sans-serif">
                    {SIZE - i}
                  </text>
                </g>
              ))}
            </svg>

            {Array.from({ length: SIZE }, (_, row) =>
              Array.from({ length: SIZE }, (_, col) => {
                const cell = board[row][col]
                const isHov = hover?.[0] === row && hover?.[1] === col
                const isLast = lastMove?.[0] === row && lastMove?.[1] === col
                const isWin = isWinCell(row, col)
                return (
                  <div
                    key={`${row}-${col}`}
                    style={{
                      position: 'absolute',
                      left: PAD + col * CELL - CELL / 2, top: PAD + row * CELL - CELL / 2,
                      width: CELL, height: CELL,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                    }}
                    onClick={() => placeStone(row, col)}
                    onMouseEnter={() => isMyTurn && !cell && setHover([row, col])}
                  >
                    {cell ? (
                      <div style={{
                        width: CELL - 4, height: CELL - 4, borderRadius: '50%',
                        background: cell === 'black'
                          ? 'radial-gradient(circle at 32% 30%,#646464,#111)'
                          : 'radial-gradient(circle at 32% 30%,#FFFAF2,#C8BBAA)',
                        boxShadow: isWin
                          ? `0 0 0 3px #E85D40,0 3px 10px rgba(0,0,0,${cell === 'black' ? '0.6' : '0.25'})`
                          : cell === 'black'
                          ? '2px 5px 10px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.18)'
                          : '2px 5px 8px rgba(0,0,0,0.22),inset 0 1px 0 rgba(255,255,255,0.9)',
                        border: cell === 'white' ? '1px solid #A89070' : 'none',
                        position: 'relative', animation: 'stonePop 0.15s ease-out',
                      }}>
                        {isLast && (
                          <div style={{
                            position: 'absolute', inset: '30%', borderRadius: '50%',
                            background: cell === 'black' ? 'rgba(255,100,60,0.85)' : 'rgba(200,70,40,0.7)',
                          }} />
                        )}
                      </div>
                    ) : isHov ? (
                      <div style={{
                        width: CELL - 6, height: CELL - 6, borderRadius: '50%',
                        background: 'radial-gradient(circle at 32% 30%,#646464,#111)',
                        opacity: 0.28, boxShadow: '1px 3px 6px rgba(0,0,0,0.3)',
                      }} />
                    ) : null}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 128 }}>
          {/* Move count */}
          <div style={{ background: 'rgba(255,248,236,0.9)', borderRadius: 16, padding: '14px 12px', border: '1px solid #E0CCB0', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: '#9A7A62', fontWeight: 600 }}>총 착수</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#3D2B1F', fontFamily: "'Noto Serif KR',serif" }}>{moveCount}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#B09070' }}>수</p>
          </div>

          {/* Game mode badge */}
          <div style={{ background: 'rgba(255,248,236,0.9)', borderRadius: 14, padding: '10px', border: '1px solid #E0CCB0', textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{gameMode === 'ai' ? '🤖' : '⚔️'}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#5C3D28' }}>
              {gameMode === 'ai' ? `AI (${aiDifficulty === 'easy' ? '쉬움' : aiDifficulty === 'normal' ? '보통' : '어려움'})` : '1:1 대전'}
            </div>
          </div>

          {/* Undo */}
          <button
            onClick={handleUndoRequest}
            disabled={!!winner || moveCount < 1 || modal !== 'none' || turn !== myColor}
            style={{
              padding: '13px 8px', borderRadius: 14,
              border: '1.5px solid #C9A87C', background: '#FFF8EC',
              color: '#5C3D28', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              opacity: (!!winner || moveCount < 1 || modal !== 'none' || turn !== myColor) ? 0.45 : 1,
              transition: 'all 0.2s', lineHeight: 1.4,
            }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = '#EDE0CC'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#FFF8EC'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            ↩️<br />무르기<br />요청
          </button>

          {/* Resign */}
          <button
            onClick={() => !winner && modal === 'none' && setModal('resign_confirm')}
            disabled={!!winner || modal !== 'none'}
            style={{
              padding: '13px 8px', borderRadius: 14,
              border: '1.5px solid rgba(232,93,64,0.4)',
              background: 'rgba(232,93,64,0.06)', color: '#C94C2E',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              opacity: (!!winner || modal !== 'none') ? 0.45 : 1,
              transition: 'all 0.2s', lineHeight: 1.4,
            }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = 'rgba(232,93,64,0.14)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(232,93,64,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            🏳️<br />기권
          </button>
        </div>
      </div>

      {/* Bottom player bar */}
      <div style={{ background: 'rgba(255,248,236,0.9)', borderTop: '1px solid #E0CCB0', padding: '0 24px', flexShrink: 0 }}>
        <PlayerBar
          nickname={user.nickname} character={user.character} photoUrl={user.photoUrl}
          color={myColor} isMyTurn={turn === myColor && !winner} timerSeconds={timerSec}
          animState={animStateFor(myColor)}
        />
      </div>

      {/* ── Modals ── */}

      {modal === 'undo_incoming' && (
        <ModalOverlay>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🤔</div>
            <h3 style={{ fontFamily: "'Noto Serif KR',serif", fontSize: 20, fontWeight: 900, color: '#3D2B1F', margin: '0 0 6px' }}>무르기 요청</h3>
            <p style={{ color: '#5C3D28', fontSize: 15, margin: '0 0 24px', lineHeight: 1.5 }}>
              <strong>{opponent.nickname}</strong>님이<br />무르기를 요청했습니다.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <ModalBtn label="거절" variant="secondary" onClick={() => respondUndo(false)} />
              <ModalBtn label="수락" variant="primary" onClick={() => respondUndo(true)} />
            </div>
          </div>
        </ModalOverlay>
      )}

      {modal === 'undo_waiting' && (
        <ModalOverlay>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⏳</div>
            <h3 style={{ fontFamily: "'Noto Serif KR',serif", fontSize: 20, fontWeight: 900, color: '#3D2B1F', margin: '0 0 8px' }}>무르기 요청 중</h3>
            <p style={{ color: '#5C3D28', fontSize: 14, margin: '0 0 20px' }}>상대방의 응답을 기다리고 있어요...</p>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #EDE0CC', borderTopColor: '#E85D40', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        </ModalOverlay>
      )}

      {modal === 'resign_confirm' && (
        <ModalOverlay>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🏳️</div>
            <h3 style={{ fontFamily: "'Noto Serif KR',serif", fontSize: 20, fontWeight: 900, color: '#3D2B1F', margin: '0 0 6px' }}>기권하시겠어요?</h3>
            <p style={{ color: '#9A7A62', fontSize: 14, margin: '0 0 24px' }}>기권하면 패배로 처리돼요.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <ModalBtn label="취소" variant="secondary" onClick={() => setModal('none')} />
              <ModalBtn label="기권하기" variant="danger" onClick={handleResignConfirm} />
            </div>
          </div>
        </ModalOverlay>
      )}

      {modal === 'result' && (
        <ModalOverlay>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 8 }}>{resultWin ? '🏆' : '😔'}</div>
            <h2 style={{
              fontFamily: "'Noto Serif KR',serif", fontSize: 30, fontWeight: 900, margin: '0 0 6px',
              ...(resultWin
                ? { background: 'linear-gradient(135deg,#E85D40,#F5A830)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
                : { color: '#5C3D28' }),
            }}>
              {resultWin ? '승리!' : '패배...'}
            </h2>
            <p style={{ color: resultWin ? '#5C3D28' : '#9A7A62', fontSize: 14, margin: '0 0 4px' }}>
              {resultWin ? '오목왕에 한 발짝 가까워졌어요 🎉' : '다음엔 꼭 이길 수 있어요 💪'}
            </p>
            <p style={{ color: '#B09070', fontSize: 12, margin: '0 0 20px' }}>총 {moveCount}수</p>

            <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', border: '1px solid #E0CCB0', marginBottom: 20 }}>
              {[
                { label: user.nickname, val: resultWin ? 1 : 0 },
                { label: 'VS', val: null },
                { label: opponent.nickname, val: resultWin ? 0 : 1 },
              ].map((item, i) => (
                <div key={i} style={{ flex: 1, padding: '12px 6px', background: i === 1 ? '#EDE0CC' : '#FFF8EC', textAlign: 'center', borderLeft: i > 0 ? '1px solid #E0CCB0' : 'none' }}>
                  <div style={{ fontSize: 11, color: '#9A7A62', marginBottom: 3 }}>{item.label}</div>
                  {item.val !== null
                    ? <div style={{ fontSize: 24, fontWeight: 900, color: item.val === 1 ? '#E85D40' : '#B09070' }}>{item.val}</div>
                    : <div style={{ fontSize: 14, fontWeight: 700, color: '#9A7A62' }}>VS</div>
                  }
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <ModalBtn label="홈으로" variant="secondary" onClick={onLeave} />
              {!isPvp && <ModalBtn label="다시하기" variant="primary" onClick={handleReset} />}
            </div>
          </div>
        </ModalOverlay>
      )}

      <style>{`
        @keyframes stonePop { from { transform: scale(0.6); opacity: 0.5; } to { transform: scale(1); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  )
}
