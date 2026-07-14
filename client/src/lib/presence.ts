// "온라인 사용자 목록"을 흉내낸다.
// Firestore에는 Socket.io처럼 "연결이 끊기면 알려주는" 기능이 없어서, 대신
// 로그인해 있는 동안 내 lastActiveAt을 주기적으로(하트비트) 갱신하고,
// 다른 사람들은 "최근 30초 안에 활동한 사람"을 온라인으로 간주한다.

import { collection, doc, onSnapshot, serverTimestamp, updateDoc, type Timestamp } from 'firebase/firestore'
import { db } from './firebase'

const HEARTBEAT_MS = 15_000
const ONLINE_WINDOW_MS = 30_000

let heartbeatTimer: ReturnType<typeof setInterval> | null = null

export function startPresenceHeartbeat(userId: string) {
  stopPresenceHeartbeat()
  const beat = () => {
    updateDoc(doc(db, 'users', userId), { lastActiveAt: serverTimestamp() }).catch(() => {})
  }
  beat()
  heartbeatTimer = setInterval(beat, HEARTBEAT_MS)
}

export function stopPresenceHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

export interface OnlineUser {
  userId: string
  nickname: string
  character: string
  photoUrl: string | null
}

// 전체 users 컬렉션을 구독해두고(학급 규모라 몇십 명 수준이라 괜찮음),
// 5초마다 "최근 30초 이내 활동"인 사람만 걸러서 콜백에 넘긴다.
export function subscribeOnlineUsers(cb: (users: OnlineUser[]) => void): () => void {
  let cached: (OnlineUser & { lastActiveMs: number })[] = []

  function emitFiltered() {
    const cutoff = Date.now() - ONLINE_WINDOW_MS
    cb(cached.filter((u) => u.lastActiveMs >= cutoff).map(({ lastActiveMs: _lastActiveMs, ...rest }) => rest))
  }

  const unsubscribeSnapshot = onSnapshot(collection(db, 'users'), (snap) => {
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
  })

  const intervalId = setInterval(emitFiltered, 5000)

  return () => {
    unsubscribeSnapshot()
    clearInterval(intervalId)
  }
}
