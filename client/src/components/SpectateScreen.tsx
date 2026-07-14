import { useEffect, useState } from 'react'
import type { User } from '../App'
import { subscribeRoom, type RoomState } from '../lib/rooms'
import { startSpectating, stopSpectating, subscribeSpectators, type Spectator } from '../lib/spectators'
import { CharacterAvatar } from '../lib/characters'
import type { Cell } from '../lib/omokAI'

interface Props {
  user: User
  roomId: string
  onLeave: () => void
}

const SIZE = 15
const CELL = 32
const PAD = 24

// 진행 중인 다른 사람의 대국을 그냥 지켜보기만 하는 화면.
// GameScreen과 달리 돌을 놓거나 기권/무르기를 할 수 없다 — 방 문서를 읽기만 한다.
export default function SpectateScreen({ user, roomId, onLeave }: Props) {
  const [room, setRoom] = useState<RoomState | null>(null)
  const [roomDeleted, setRoomDeleted] = useState(false)
  const [spectators, setSpectators] = useState<Spectator[]>([])

  useEffect(() => {
    return subscribeRoom(roomId, (r) => {
      if (!r) {
        setRoomDeleted(true)
        return
      }
      setRoom(r)
    })
  }, [roomId])

  // 내가 보고 있다는 걸 다른 사람들도 알 수 있게 하트비트를 보낸다
  useEffect(() => {
    startSpectating(roomId, user)
    return () => stopSpectating(roomId, user.id)
  }, [roomId, user])

  useEffect(() => {
    return subscribeSpectators(roomId, setSpectators)
  }, [roomId])

  const boardPx = CELL * (SIZE - 1) + PAD * 2

  if (roomDeleted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', justifyContent: 'center', background: '#F5EDD8', fontFamily: "'Noto Sans KR', sans-serif" }}>
        <p style={{ color: '#5C3D28', fontSize: 16, fontWeight: 700 }}>이 게임은 종료됐어요</p>
        <button
          onClick={onLeave}
          style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#E85D40,#C94C2E)', color: '#FFF8EC', fontWeight: 700, cursor: 'pointer' }}
        >
          로비로 돌아가기
        </button>
      </div>
    )
  }

  if (!room) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5EDD8', fontFamily: "'Noto Sans KR', sans-serif" }}>
        <p style={{ color: '#5C3D28', fontSize: 15 }}>불러오는 중...</p>
      </div>
    )
  }

  const isWinCell = (r: number, c: number) => room.winLine.some(([wr, wc]) => wr === r && wc === c)

  return (
    <div style={{ minHeight: '100vh', background: '#F5EDD8', display: 'flex', flexDirection: 'column', fontFamily: "'Noto Sans KR', sans-serif" }}>
      <div style={{ background: 'rgba(255,248,236,0.9)', borderBottom: '1px solid #E0CCB0', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onLeave} style={{ background: 'none', border: 'none', color: '#8B5E3C', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
          ← 로비로 돌아가기
        </button>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#A16207', background: 'rgba(245,168,48,0.15)', padding: '4px 12px', borderRadius: 20 }}>
          👀 관전 중 · 관전자 {spectators.length}명
        </span>
      </div>

      {/* Player info */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 32, padding: '18px 24px', flexWrap: 'wrap' }}>
        {([['black', room.host], ['white', room.guest]] as [Cell, typeof room.host | null][]).map(([color, p]) => {
          if (!p) return null
          const isTurn = room.turn === color && room.status === 'playing'
          const animState = room.winner ? (room.winner === color ? 'win' : 'lose') : 'idle'
          return (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 14,
                background: isTurn ? 'rgba(232,93,64,0.08)' : 'transparent',
                border: isTurn ? '1.5px solid rgba(232,93,64,0.25)' : '1.5px solid transparent',
              }}
            >
              <CharacterAvatar character={p.character} photoUrl={p.photoUrl} animState={animState} size={44} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#3D2B1F' }}>{p.nickname}</div>
                <div style={{ fontSize: 11, color: '#9A7A62' }}>
                  {color === 'black' ? '흑돌' : '백돌'}{isTurn && ' · 차례'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Board (읽기 전용) */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 20px' }}>
        <div
          style={{
            width: boardPx, height: boardPx, position: 'relative',
            background:
              'repeating-linear-gradient(90deg,rgba(140,90,30,0.07) 0,rgba(140,90,30,0.07) 1px,transparent 1px,transparent 32px),' +
              'repeating-linear-gradient(rgba(140,90,30,0.07) 0,rgba(140,90,30,0.07) 1px,transparent 1px,transparent 32px),' +
              'linear-gradient(160deg,#D4A055 0%,#C08A40 25%,#B87A35 50%,#C89048 75%,#D4A055 100%)',
            borderRadius: 8, userSelect: 'none',
            boxShadow: '0 12px 40px rgba(61,43,31,0.35),0 4px 12px rgba(61,43,31,0.2)',
            border: '3px solid #8B5E3C',
          }}
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
              <circle key={`${r}-${c}`} cx={PAD + c * CELL} cy={PAD + r * CELL} r={4} fill="rgba(75,40,12,0.55)" />
            ))}
          </svg>

          {room.board.map((rowArr, row) =>
            rowArr.map((cell, col) => {
              if (!cell) return null
              const isLast = room.lastMove?.[0] === row && room.lastMove?.[1] === col
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
                >
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
                    position: 'relative',
                  }}>
                    {isLast && (
                      <div style={{
                        position: 'absolute', inset: '30%', borderRadius: '50%',
                        background: cell === 'black' ? 'rgba(255,100,60,0.85)' : 'rgba(200,70,40,0.7)',
                      }} />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '4px 24px 20px', fontSize: 13, color: '#9A7A62' }}>
        {room.status === 'ended' && room.winner
          ? `🏆 ${(room.winner === 'black' ? room.host.nickname : room.guest?.nickname) ?? '?'}님 승리! (총 ${room.moveCount}수)`
          : `총 ${room.moveCount}수 진행 중`}
      </div>
    </div>
  )
}
