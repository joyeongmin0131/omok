// "지금 이 대국을 누가 보고 있는지"를 흉내낸다. presence.ts(온라인 유저 목록)와 똑같은
// 하트비트 방식이다 — 관전하는 동안 rooms/{roomId}/spectators/{나} 문서를 주기적으로
// 갱신하고, 다른 사람들은 "최근 30초 안에 살아있는" 관전자만 목록에 표시한다.

import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, type Timestamp } from 'firebase/firestore'
import { db } from './firebase'
import type { User } from '../App'

const HEARTBEAT_MS = 15_000
const ACTIVE_WINDOW_MS = 30_000

let heartbeatTimer: ReturnType<typeof setInterval> | null = null

function spectatorRef(roomId: string, userId: string) {
  return doc(db, 'rooms', roomId, 'spectators', userId)
}

export function startSpectating(roomId: string, user: User) {
  stopSpectating(roomId, user.id)
  const beat = () => {
    setDoc(spectatorRef(roomId, user.id), {
      nickname: user.nickname,
      character: user.character,
      photoUrl: user.photoUrl,
      lastActiveAt: serverTimestamp(),
    }).catch(() => {})
  }
  beat()
  heartbeatTimer = setInterval(beat, HEARTBEAT_MS)
}

export function stopSpectating(roomId: string, userId: string) {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  deleteDoc(spectatorRef(roomId, userId)).catch(() => {})
}

export interface Spectator {
  userId: string
  nickname: string
  character: string
  photoUrl: string | null
}

export function subscribeSpectators(roomId: string, cb: (spectators: Spectator[]) => void): () => void {
  let cached: (Spectator & { lastActiveMs: number })[] = []

  function emitFiltered() {
    const cutoff = Date.now() - ACTIVE_WINDOW_MS
    cb(cached.filter((s) => s.lastActiveMs >= cutoff).map(({ lastActiveMs: _lastActiveMs, ...rest }) => rest))
  }

  const unsubscribeSnapshot = onSnapshot(
    collection(db, 'rooms', roomId, 'spectators'),
    (snap) => {
      cached = snap.docs.map((d) => {
        const data = d.data()
        const lastActiveAt = data.lastActiveAt as Timestamp | undefined
        return {
          userId: d.id,
          nickname: data.nickname,
          character: data.character,
          photoUrl: data.photoUrl ?? null,
          lastActiveMs: lastActiveAt ? lastActiveAt.toMillis() : 0,
        }
      })
      emitFiltered()
    },
    (err) => console.warn('관전자 목록을 불러오지 못했어요:', err.message),
  )

  const intervalId = setInterval(emitFiltered, 5000)

  return () => {
    unsubscribeSnapshot()
    clearInterval(intervalId)
  }
}
