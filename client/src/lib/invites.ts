// 대기실 온라인 목록에서 상대를 클릭해 1:1 대전을 신청하는 기능.
// 방을 실제로 만들고 입장시키는 부분은 rooms.ts의 기존 함수를 그대로 재사용한다.
//
// 흐름:
//  1) 신청하는 사람이 방을 만들고(rooms.createRoom) 동시에 invites 문서를 하나 남긴다.
//  2) 초대받은 사람은 자기에게 온 pending 초대를 구독하고 있다가, 수락하면 그 방에
//     들어간다(rooms.joinRoom). 방 상태가 'playing'으로 바뀌는 건 신청자 쪽에서
//     이미 구독 중인 rooms.subscribeRoom이 알아서 감지한다.
//  3) 거절하면 상태만 'declined'로 바꾸고, 신청자 쪽에서 이 문서를 지켜보다가
//     알아채서 만들어둔 방을 정리한다.

import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, type Timestamp } from 'firebase/firestore'
import { db } from './firebase'
import { createRoom, joinRoom, cancelRoom } from './rooms'
import type { User } from '../App'

interface InviteDoc {
  fromId: string
  fromNickname: string
  fromCharacter: string
  fromPhotoUrl: string | null
  toId: string
  roomId: string
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  createdAt: Timestamp
}

export interface IncomingInvite {
  id: string
  fromNickname: string
  fromCharacter: string
  fromPhotoUrl: string | null
  roomId: string
}

export interface OutgoingInvite {
  id: string
  roomId: string
  status: InviteDoc['status']
}

// 상대를 초대 — 내가 host인 방을 새로 만들고, 초대장을 같이 남긴다
export async function sendInvite(from: User, toUserId: string): Promise<{ inviteId: string; roomId: string }> {
  const roomId = await createRoom(`${from.nickname}님의 초대`, from)
  const inviteRef = doc(collection(db, 'invites'))
  await setDoc(inviteRef, {
    fromId: from.id,
    fromNickname: from.nickname,
    fromCharacter: from.character,
    fromPhotoUrl: from.photoUrl,
    toId: toUserId,
    roomId,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
  return { inviteId: inviteRef.id, roomId }
}

// 초대를 보낸 사람이 기다리다가 그만둘 때
export async function cancelInvite(inviteId: string, roomId: string): Promise<void> {
  await updateDoc(doc(db, 'invites', inviteId), { status: 'cancelled' })
  await cancelRoom(roomId)
}

// 초대 수락 — 그 방에 입장한다 (guest로, 백돌)
export async function acceptInvite(invite: IncomingInvite, me: User): Promise<void> {
  await joinRoom(invite.roomId, me)
  await updateDoc(doc(db, 'invites', invite.id), { status: 'accepted' })
}

export async function declineInvite(inviteId: string): Promise<void> {
  await updateDoc(doc(db, 'invites', inviteId), { status: 'declined' })
}

// 나에게 온 대기중(pending) 초대 하나를 실시간으로 구독한다 (여러 개 와도 가장 먼저 온 것 하나만 보여줌)
export function subscribeIncomingInvites(myId: string, cb: (invite: IncomingInvite | null) => void): () => void {
  const q = query(collection(db, 'invites'), where('toId', '==', myId))
  return onSnapshot(q, (snap) => {
    const pending = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as InviteDoc) }))
      .filter((d) => d.status === 'pending')
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))[0]

    if (!pending) { cb(null); return }
    cb({
      id: pending.id,
      fromNickname: pending.fromNickname,
      fromCharacter: pending.fromCharacter,
      fromPhotoUrl: pending.fromPhotoUrl,
      roomId: pending.roomId,
    })
  })
}

// 내가 보낸 초대 하나의 상태를 실시간으로 구독한다 (상대가 거절했는지 확인하는 용도)
export function subscribeInvite(inviteId: string, cb: (invite: OutgoingInvite | null) => void): () => void {
  return onSnapshot(doc(db, 'invites', inviteId), (snap) => {
    if (!snap.exists()) { cb(null); return }
    const d = snap.data() as InviteDoc
    cb({ id: snap.id, roomId: d.roomId, status: d.status })
  })
}
