import { useEffect, useState } from 'react'
import type { User } from '../App'
import * as api from '../lib/api'
import { CharacterAvatar } from '../lib/characters'

const MEDAL = ['🥇', '🥈', '🥉']
const MEDAL_BG = [
  'linear-gradient(145deg, #FFD700, #FFA500)',
  'linear-gradient(145deg, #E8E8E8, #BDBDBD)',
  'linear-gradient(145deg, #CD7F32, #A0522D)',
]
const MEDAL_SHADOW = [
  '0 8px 24px rgba(255,200,0,0.4)',
  '0 8px 24px rgba(180,180,180,0.4)',
  '0 8px 24px rgba(180,100,40,0.35)',
]
const MEDAL_TEXT = ['#7A5500', '#505050', '#5A2E00']
const PLATFORM_H = [110, 80, 60]
const PODIUM_ORDER = [1, 0, 2] // 2nd, 1st, 3rd

function winRate(p: api.RankingEntry) {
  const total = p.wins + p.losses
  return total === 0 ? 0 : Math.round((p.wins / total) * 100)
}

function PodiumCard({ player, isMe }: { player: api.RankingEntry; isMe: boolean }) {
  const idx = player.rank - 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
      {/* Card */}
      <div
        style={{
          background: '#FFF8EC',
          borderRadius: 20,
          padding: '16px 12px 12px',
          width: '100%',
          maxWidth: 150,
          textAlign: 'center',
          border: isMe ? '2.5px solid #E85D40' : '1.5px solid #E0CCB0',
          boxShadow: isMe
            ? '0 8px 24px rgba(232,93,64,0.2)'
            : '0 4px 16px rgba(61,43,31,0.1)',
          position: 'relative',
        }}
      >
        {isMe && (
          <div
            style={{
              position: 'absolute', top: -10, right: -10,
              background: '#E85D40', color: '#FFF8EC',
              fontSize: 10, fontWeight: 700, padding: '2px 8px',
              borderRadius: 8, boxShadow: '0 2px 6px rgba(232,93,64,0.35)',
            }}
          >
            나
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
          <CharacterAvatar character={player.character} photoUrl={player.photoUrl} size={48} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#3D2B1F', marginBottom: 2 }}>
          {player.nickname}
        </div>
        <div
          style={{
            display: 'inline-block',
            padding: '2px 10px', borderRadius: 12,
            fontSize: 12, fontWeight: 700,
            background: `linear-gradient(135deg, rgba(232,93,64,0.12), rgba(245,168,48,0.12))`,
            color: '#8B5E3C', marginBottom: 6,
          }}
        >
          {player.wins * 100 - player.losses * 30}점
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, fontSize: 11, color: '#9A7A62' }}>
          <span>{player.wins}승 {player.losses}패</span>
        </div>
        <div
          style={{
            marginTop: 8, height: 4, borderRadius: 2,
            background: '#EDE0CC', overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%', borderRadius: 2,
              background: 'linear-gradient(90deg, #E85D40, #F5A830)',
              width: `${winRate(player)}%`,
              transition: 'width 0.8s ease',
            }}
          />
        </div>
        <div style={{ fontSize: 10, color: '#9A7A62', marginTop: 3 }}>승률 {winRate(player)}%</div>
      </div>

      {/* Platform */}
      <div
        style={{
          width: '100%', maxWidth: 150,
          height: PLATFORM_H[idx],
          marginTop: 10,
          background: MEDAL_BG[idx],
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 10,
          boxShadow: MEDAL_SHADOW[idx],
          color: MEDAL_TEXT[idx],
          fontFamily: "'Noto Serif KR', serif",
        }}
      >
        <div style={{ fontSize: 28, lineHeight: 1 }}>{MEDAL[idx]}</div>
        <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{player.rank}</div>
        <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.7 }}>위</div>
      </div>
    </div>
  )
}

function RankRow({ player, isMe }: { player: api.RankingEntry; isMe: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderRadius: 12,
        background: isMe ? 'rgba(232,93,64,0.07)' : 'transparent',
        border: isMe ? '1.5px solid rgba(232,93,64,0.25)' : '1.5px solid transparent',
        transition: 'background 0.2s',
        gap: 12,
      }}
    >
      {/* Rank */}
      <div
        style={{
          width: 32, textAlign: 'center',
          fontSize: 15, fontWeight: 700,
          color: isMe ? '#E85D40' : '#9A7A62',
          fontFamily: "'Noto Serif KR', serif",
          flexShrink: 0,
        }}
      >
        {player.rank}
      </div>
      {/* Avatar */}
      <CharacterAvatar character={player.character} photoUrl={player.photoUrl} size={38} />
      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: isMe ? 700 : 500, color: isMe ? '#E85D40' : '#3D2B1F' }}>
          {player.nickname} {isMe && <span style={{ fontSize: 11, background: '#E85D40', color: '#FFF8EC', borderRadius: 6, padding: '1px 6px', marginLeft: 4 }}>나</span>}
        </div>
      </div>
      {/* Win/Loss */}
      <div style={{ fontSize: 13, color: '#5C3D28', textAlign: 'center', minWidth: 60 }}>
        <span style={{ color: '#E85D40', fontWeight: 700 }}>{player.wins}</span>
        <span style={{ color: '#9A7A62' }}>승 </span>
        <span style={{ color: '#7A7A7A', fontWeight: 600 }}>{player.losses}</span>
        <span style={{ color: '#9A7A62' }}>패</span>
      </div>
      {/* Win rate bar */}
      <div style={{ minWidth: 72, textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#5C3D28', marginBottom: 3 }}>
          {winRate(player)}%
        </div>
        <div style={{ height: 4, borderRadius: 2, background: '#EDE0CC', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%', borderRadius: 2,
              background: isMe ? '#E85D40' : 'linear-gradient(90deg, #8B5E3C, #C9A87C)',
              width: `${winRate(player)}%`,
            }}
          />
        </div>
      </div>
      {/* Score */}
      <div
        style={{
          minWidth: 64, textAlign: 'right',
          fontSize: 14, fontWeight: 700,
          color: isMe ? '#E85D40' : '#8B5E3C',
          fontFamily: "'Noto Serif KR', serif",
        }}
      >
        {(player.wins * 100 - player.losses * 30).toLocaleString()}
      </div>
    </div>
  )
}

export default function RankingTab({ user }: { user: User }) {
  const [players, setPlayers] = useState<api.RankingEntry[] | null>(null)

  useEffect(() => {
    api.getRanking().then(({ players }) => setPlayers(players))
  }, [])

  if (players === null) {
    return <p style={{ textAlign: 'center', color: '#9A7A62', fontSize: 14 }}>랭킹을 불러오는 중...</p>
  }
  if (players.length === 0) {
    return <p style={{ textAlign: 'center', color: '#9A7A62', fontSize: 14 }}>아직 랭킹 데이터가 없어요. 첫 대전을 치러보세요!</p>
  }

  const top3 = players.slice(0, 3)
  const rest = players.slice(3)
  const myRank = players.find((p) => p.nickname === user.nickname)?.rank ?? null

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <h2
          style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: 22, fontWeight: 900, color: '#3D2B1F', margin: '0 0 6px',
          }}
        >
          🏆 학급 오목 랭킹
        </h2>
        <p style={{ fontSize: 13, color: '#9A7A62', margin: 0 }}>
          {myRank ? `내 순위: ${myRank}위 · ` : ''}총 {players.length}명 참여 중
        </p>
      </div>

      {/* Podium */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 12,
          marginBottom: 24,
          padding: '0 8px',
        }}
      >
        {PODIUM_ORDER.map((i) => top3[i])
          .filter((p): p is api.RankingEntry => !!p)
          .map((player) => (
            <PodiumCard key={player.rank} player={player} isMe={player.nickname === user.nickname} />
          ))}
      </div>

      {/* List header */}
      {rest.length > 0 && (
        <>
          <div
            style={{
              display: 'flex',
              padding: '6px 16px',
              fontSize: 11,
              fontWeight: 600,
              color: '#9A7A62',
              gap: 12,
              borderBottom: '1px solid #EDE0CC',
              marginBottom: 4,
            }}
          >
            <span style={{ width: 32, textAlign: 'center' }}>순위</span>
            <span style={{ width: 38 }} />
            <span style={{ flex: 1 }}>닉네임</span>
            <span style={{ minWidth: 60, textAlign: 'center' }}>승/패</span>
            <span style={{ minWidth: 72, textAlign: 'center' }}>승률</span>
            <span style={{ minWidth: 64, textAlign: 'right' }}>점수</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {rest.map((player) => (
              <RankRow key={player.rank} player={player} isMe={player.nickname === user.nickname} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
