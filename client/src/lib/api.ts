// 회원가입/로그인/프로필/랭킹을 Firebase(Authentication + Firestore)로 처리하는 함수들.
// 컴포넌트들은 이 함수들만 호출하면 되고, Firebase SDK를 직접 다루지 않아도 된다.

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  type AuthError,
} from 'firebase/auth'
import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { resizeImageToDataUrl } from './image'
import type { User } from '../App'

// Firestore에 저장되는 사용자 문서의 모양
interface UserDoc {
  email: string
  nickname: string
  character: string
  photoUrl: string | null
  wins: number
  losses: number
}

function toUser(id: string, data: UserDoc): User {
  return {
    id,
    email: data.email,
    nickname: data.nickname,
    character: data.character,
    photoUrl: data.photoUrl ?? null,
    wins: data.wins ?? 0,
    losses: data.losses ?? 0,
  }
}

// Firebase 에러 코드를 한국어 메시지로 바꿔준다
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': '이미 가입된 이메일이에요.',
  'auth/invalid-email': '이메일 형식이 올바르지 않아요.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 해요.',
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않아요.',
  'auth/wrong-password': '이메일 또는 비밀번호가 올바르지 않아요.',
  'auth/user-not-found': '이메일 또는 비밀번호가 올바르지 않아요.',
  'auth/too-many-requests': '너무 여러 번 시도했어요. 잠시 후 다시 시도해 주세요.',
  'auth/admin-restricted-operation': '게스트 로그인이 아직 꺼져있어요. Firebase 콘솔 > Authentication > 로그인 방법에서 "익명" 로그인을 켜주세요.',
  'auth/operation-not-allowed': '게스트 로그인이 아직 꺼져있어요. Firebase 콘솔 > Authentication > 로그인 방법에서 "익명" 로그인을 켜주세요.',
}

function friendlyAuthError(err: unknown): Error {
  const code = (err as AuthError)?.code
  return new Error((code && AUTH_ERROR_MESSAGES[code]) || '요청 처리 중 오류가 발생했어요.')
}

export async function register(email: string, password: string, nickname: string): Promise<{ user: User }> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const profile: UserDoc = { email, nickname, character: 'bear', photoUrl: null, wins: 0, losses: 0 }
    await setDoc(doc(db, 'users', cred.user.uid), { ...profile, createdAt: serverTimestamp(), lastActiveAt: serverTimestamp() })
    return { user: toUser(cred.user.uid, profile) }
  } catch (err) {
    throw friendlyAuthError(err)
  }
}

export async function login(email: string, password: string): Promise<{ user: User }> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const snap = await getDoc(doc(db, 'users', cred.user.uid))
    if (!snap.exists()) throw new Error('사용자 정보를 찾을 수 없어요.')
    return { user: toUser(cred.user.uid, snap.data() as UserDoc) }
  } catch (err) {
    throw friendlyAuthError(err)
  }
}

// 회원가입 없이 체험할 수 있는 게스트 로그인 (Firebase 익명 인증).
// 회원가입과 똑같이 프로필 설정 화면으로 이어져서 캐릭터/닉네임을 고르게 된다.
export async function loginAsGuest(): Promise<{ user: User }> {
  try {
    const cred = await signInAnonymously(auth)
    const guestNumber = Math.floor(1000 + Math.random() * 9000)
    const profile: UserDoc = { email: '', nickname: `게스트${guestNumber}`, character: 'bear', photoUrl: null, wins: 0, losses: 0 }
    await setDoc(doc(db, 'users', cred.user.uid), { ...profile, createdAt: serverTimestamp(), lastActiveAt: serverTimestamp() })
    return { user: toUser(cred.user.uid, profile) }
  } catch (err) {
    throw friendlyAuthError(err)
  }
}

// 새로고침 등으로 Firebase가 로그인 상태를 기억하고 있을 때, 그 사용자의 프로필을 다시 불러온다
export async function getUserProfile(userId: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) return null
  return toUser(userId, snap.data() as UserDoc)
}

export async function updateProfile(userId: string, fields: { nickname?: string; character?: string }): Promise<{ user: User }> {
  await updateDoc(doc(db, 'users', userId), fields)
  const snap = await getDoc(doc(db, 'users', userId))
  return { user: toUser(userId, snap.data() as UserDoc) }
}

// Storage 없이 사진을 작게 압축해서 Firestore 문서 안에 직접 저장한다 (client/src/lib/image.ts 참고)
export async function uploadPhoto(userId: string, file: File): Promise<{ user: User }> {
  const photoUrl = await resizeImageToDataUrl(file)
  await updateDoc(doc(db, 'users', userId), { photoUrl })
  const snap = await getDoc(doc(db, 'users', userId))
  return { user: toUser(userId, snap.data() as UserDoc) }
}

export interface RankingEntry {
  rank: number
  nickname: string
  character: string
  photoUrl: string | null
  wins: number
  losses: number
}

export async function getRanking(): Promise<{ players: RankingEntry[] }> {
  const snap = await getDocs(query(collection(db, 'users'), orderBy('wins', 'desc')))
  const players = snap.docs
    .map((d) => d.data() as UserDoc)
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
    .map((d, i) => ({
      rank: i + 1,
      nickname: d.nickname,
      character: d.character,
      photoUrl: d.photoUrl ?? null,
      wins: d.wins ?? 0,
      losses: d.losses ?? 0,
    }))
  return { players }
}
