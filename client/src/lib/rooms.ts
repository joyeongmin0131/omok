// 1:1 대전방을 Firestore로 관리한다.
//
// 핵심 아이디어: "방 문서 하나 = 그 대국의 전체 상태". 양쪽 플레이어는 같은 방 문서를
// onSnapshot으로 실시간 구독하고, 착수/기권/무르기는 Firestore 트랜잭션으로 안전하게 쓴다.
// 서버가 따로 없기 때문에, 승패가 결정되는 순간 "방 상태 갱신 + 승자 wins/패자 losses 증가"를
// 하나의 트랜잭션으로 묶어서 처리한다 (원자적으로 한 번에 반영됨).

import {
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { checkWin, getWinLine, createBoard, SIZE, type Cell } from './omokAI'
import type { User } from '../App'

export const TURN_SECONDS = 60

interface PlayerInfo {
  id: string
  nickname: string
  character: string
  photoUrl: string | null
}

// Firestore에는 배열 안에 배열을 직접 넣을 수 없어서, 15x15 보드를 225칸짜리 1차원
// 배열로 펴서 저장한다. index = row * 15 + col.
function flattenBoard(board: Cell[][]): Cell[] {
  return board.flat()
}
function unflattenBoard(flat: Cell[]): Cell[][] {
  const board: Cell[][] = []
  for (let r = 0; r < SIZE; r++) board.push(flat.slice(r * SIZE, r * SIZE + SIZE))
  return board
}

interface HistoryEntry {
  board: Cell[]
  turn: Cell
  moveCount: number
}

interface RoomDoc {
  title: string
  hostId: string; hostNickname: string; hostCharacter: string; hostPhotoUrl: string | null
  guestId: string | null; guestNickname: string | null; guestCharacter: string | null; guestPhotoUrl: string | null
  board: Cell[]
  turn: Cell
  status: 'waiting' | 'playing' | 'ended'
  moveCount: number
  lastMove: [number, number] | null
  winner: Cell | null
  winLine: { r: number; c: number }[]
  turnStartedAt: Timestamp | null
  undoRequestBy: Cell | null
  history: HistoryEntry[]
  createdAt: Timestamp
}

export interface RoomState {
  id: string
  title: string
  status: RoomDoc['status']
  board: Cell[][]
  turn: Cell
  moveCount: number
  lastMove: [number, number] | null
  winner: Cell | null
  winLine: [number, number][]
  undoRequestBy: Cell | null
  turnStartedAt: number | null
  host: PlayerInfo
  guest: PlayerInfo | null
}

function toRoomState(id: string, r: RoomDoc): RoomState {
  return {
    id,
    title: r.title,
    status: r.status,
    board: unflattenBoard(r.board),
    turn: r.turn,
    moveCount: r.moveCount,
    lastMove: r.lastMove,
    winner: r.winner,
    winLine: r.winLine.map((p) => [p.r, p.c]),
    undoRequestBy: r.undoRequestBy,
    turnStartedAt: r.turnStartedAt ? r.turnStartedAt.toMillis() : null,
    host: { id: r.hostId, nickname: r.hostNickname, character: r.hostCharacter, photoUrl: r.hostPhotoUrl },
    guest: r.guestId
      ? { id: r.guestId, nickname: r.guestNickname!, character: r.guestCharacter!, photoUrl: r.guestPhotoUrl }
      : null,
  }
}

// 방 생성 — 만든 사람은 항상 흑돌(black)
export async function createRoom(title: string, host: User): Promise<string> {
  const roomRef = doc(collection(db, 'rooms'))
  const room: Omit<RoomDoc, 'createdAt' | 'turnStartedAt'> = {
    title: title?.trim() || `${host.nickname}의 방`,
    hostId: host.id, hostNickname: host.nickname, hostCharacter: host.character, hostPhotoUrl: host.photoUrl,
    guestId: null, guestNickname: null, guestCharacter: null, guestPhotoUrl: null,
    board: flattenBoard(createBoard()),
    turn: 'black',
    status: 'waiting',
    moveCount: 0,
    lastMove: null,
    winner: null,
    winLine: [],
    undoRequestBy: null,
    history: [],
  }
  await setDoc(roomRef, { ...room, turnStartedAt: null, createdAt: serverTimestamp() })
  return roomRef.id
}

// 대기 중인 방 취소 (아직 아무도 안 들어왔을 때)
export async function cancelRoom(roomId: string): Promise<void> {
  await deleteDoc(doc(db, 'rooms', roomId))
}

// 방 입장 — 들어가는 사람은 항상 백돌(white). 트랜잭션으로 "이미 다른 사람이 들어간 방에
// 동시에 들어가는" 경쟁 상황을 막는다.
export async function joinRoom(roomId: string, guest: User): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef)
    if (!snap.exists()) throw new Error('존재하지 않는 방이에요.')
    const room = snap.data() as RoomDoc
    if (room.status !== 'waiting') throw new Error('입장할 수 없는 방이에요. (이미 시작됐거나 사라졌어요)')
    tx.update(roomRef, {
      guestId: guest.id, guestNickname: guest.nickname, guestCharacter: guest.character, guestPhotoUrl: guest.photoUrl,
      status: 'playing',
      turnStartedAt: serverTimestamp(),
    })
  })
}

function winnerLoserIds(room: RoomDoc, winnerColor: Cell) {
  const winnerId = winnerColor === 'black' ? room.hostId : room.guestId!
  const loserId = winnerColor === 'black' ? room.guestId! : room.hostId
  return { winnerId, loserId }
}

// 착수. 서버가 없으므로 이 트랜잭션이 "내 차례가 맞는지 / 그 칸이 비어있는지"를 검사하는
// 유일한 안전장치다. 오목이 완성되면 같은 트랜잭션 안에서 승/패 기록까지 같이 반영한다.
export async function placeStone(roomId: string, myColor: Cell, row: number, col: number): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef)
    if (!snap.exists()) return
    const room = snap.data() as RoomDoc
    if (room.status !== 'playing' || room.turn !== myColor) return
    if (room.board[row * SIZE + col]) return

    const board2d = unflattenBoard(room.board)
    board2d[row][col] = myColor
    const newBoardFlat = flattenBoard(board2d)
    const newMoveCount = room.moveCount + 1
    const history = [...room.history, { board: room.board, turn: room.turn, moveCount: room.moveCount }].slice(-2)

    if (checkWin(board2d, row, col, myColor)) {
      const winLine = getWinLine(board2d, row, col, myColor).map(([r, c]) => ({ r, c }))
      tx.update(roomRef, {
        board: newBoardFlat, moveCount: newMoveCount, lastMove: [row, col],
        winner: myColor, winLine, status: 'ended', history,
      })
      const { winnerId, loserId } = winnerLoserIds(room, myColor)
      tx.update(doc(db, 'users', winnerId), { wins: increment(1) })
      tx.update(doc(db, 'users', loserId), { losses: increment(1) })
    } else {
      tx.update(roomRef, {
        board: newBoardFlat, moveCount: newMoveCount, lastMove: [row, col],
        turn: myColor === 'black' ? 'white' : 'black', turnStartedAt: serverTimestamp(), history,
      })
    }
  })
}

// 기권
export async function resign(roomId: string, myColor: Cell): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef)
    if (!snap.exists()) return
    const room = snap.data() as RoomDoc
    if (room.status !== 'playing') return
    const winnerColor: Cell = myColor === 'black' ? 'white' : 'black'
    tx.update(roomRef, { status: 'ended', winner: winnerColor })
    const { winnerId, loserId } = winnerLoserIds(room, winnerColor)
    tx.update(doc(db, 'users', winnerId), { wins: increment(1) })
    tx.update(doc(db, 'users', loserId), { losses: increment(1) })
  })
}

// 상대가 응답이 없을 때(연결 끊김 포함) 처리하는 함수.
// 두 클라이언트 모두 자기 화면에서 타이머를 보고 있다가, 시간이 다 되면 누구든 이 함수를
// 호출할 수 있다 — 트랜잭션 안에서 "정말로 시간이 지났는지"를 다시 확인하므로 안전하다.
export async function forceTimeoutResign(roomId: string): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef)
    if (!snap.exists()) return
    const room = snap.data() as RoomDoc
    if (room.status !== 'playing' || !room.turnStartedAt) return
    const elapsedSeconds = (Date.now() - room.turnStartedAt.toMillis()) / 1000
    if (elapsedSeconds < TURN_SECONDS) return
    const timedOutColor = room.turn
    const winnerColor: Cell = timedOutColor === 'black' ? 'white' : 'black'
    tx.update(roomRef, { status: 'ended', winner: winnerColor })
    const { winnerId, loserId } = winnerLoserIds(room, winnerColor)
    tx.update(doc(db, 'users', winnerId), { wins: increment(1) })
    tx.update(doc(db, 'users', loserId), { losses: increment(1) })
  })
}

// 무르기 요청
export async function requestUndo(roomId: string, myColor: Cell): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef)
    if (!snap.exists()) return
    const room = snap.data() as RoomDoc
    if (room.status !== 'playing' || room.turn !== myColor || room.history.length === 0) return
    tx.update(roomRef, { undoRequestBy: myColor })
  })
}

// 무르기 응답 — 수락하면 내 수 + 상대 수, 한 라운드를 통째로 되돌린다 (AI 모드와 동일한 규칙)
export async function respondUndo(roomId: string, accept: boolean): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef)
    if (!snap.exists()) return
    const room = snap.data() as RoomDoc
    if (!room.undoRequestBy) return

    if (accept && room.history.length > 0) {
      const steps = Math.min(2, room.history.length)
      const target = room.history[room.history.length - steps]
      tx.update(roomRef, {
        board: target.board, turn: target.turn, moveCount: target.moveCount,
        history: room.history.slice(0, room.history.length - steps),
        lastMove: null, undoRequestBy: null, turnStartedAt: serverTimestamp(),
      })
    } else {
      tx.update(roomRef, { undoRequestBy: null })
    }
  })
}

// 방 하나를 실시간 구독. onSnapshot 콜백은 방이 바뀔 때마다(내가 두거나, 상대가 두거나) 계속 호출된다.
export function subscribeRoom(roomId: string, cb: (room: RoomState | null) => void): () => void {
  return onSnapshot(doc(db, 'rooms', roomId), (snap) => {
    cb(snap.exists() ? toRoomState(snap.id, snap.data() as RoomDoc) : null)
  })
}

export interface OpenRoomSummary {
  id: string
  title: string
  host: string
}

// 로비/게임모드 화면의 "입장 가능한 방 목록" — 실시간으로 갱신됨
export function subscribeOpenRooms(cb: (rooms: OpenRoomSummary[]) => void): () => void {
  const q = query(collection(db, 'rooms'), where('status', '==', 'waiting'))
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => {
      const data = d.data() as RoomDoc
      return { id: d.id, title: data.title, host: data.hostNickname, createdAtMs: data.createdAt?.toMillis() ?? 0 }
    })
    list.sort((a, b) => b.createdAtMs - a.createdAtMs)
    cb(list.map(({ createdAtMs: _createdAtMs, ...rest }) => rest))
  })
}

export interface ActiveRoomSummary {
  id: string
  title: string
  host: string
  hostId: string
  guest: string
  guestId: string
  moveCount: number
}

// 로비 화면의 "진행 중인 게임" 목록. hostId/guestId를 같이 내려줘서 "이 사람 지금 게임 중인지"를
// (예: 초대 버튼 비활성화) 판단할 수 있게 한다.
export function subscribeActiveRooms(cb: (rooms: ActiveRoomSummary[]) => void): () => void {
  const q = query(collection(db, 'rooms'), where('status', '==', 'playing'))
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((d) => {
        const data = d.data() as RoomDoc
        return {
          id: d.id, title: data.title,
          host: data.hostNickname, hostId: data.hostId,
          guest: data.guestNickname ?? '', guestId: data.guestId ?? '',
          moveCount: data.moveCount,
        }
      }),
    )
  })
}
